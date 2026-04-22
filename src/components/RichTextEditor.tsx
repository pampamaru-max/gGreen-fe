import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  Palette, Highlighter,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "./ui/button";
import { fakeSelectionPlugin, fakeSelectionPluginKey } from "@/plugins/fakeSelectionPlugin";

const TEXT_COLORS = [
  { label: "ดำ", value: "#000000" },
  { label: "เทา", value: "#6B7280" },
  { label: "แดง", value: "#EF4444" },
  { label: "ส้ม", value: "#F97316" },
  { label: "เหลือง", value: "#CA8A04" },
  { label: "เขียว", value: "#16A34A" },
  { label: "ฟ้า", value: "#3B82F6" },
  { label: "ม่วง", value: "#A855F7" },
];

const HIGHLIGHT_COLORS = [
  { label: "เหลือง", value: "#FEF08A" },
  { label: "เขียว", value: "#BBF7D0" },
  { label: "ฟ้า", value: "#BAE6FD" },
  { label: "ชมพู", value: "#FBCFE8" },
  { label: "ส้ม", value: "#FED7AA" },
];

function ToolBtn({
  onClick, active, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`h-6 w-6 flex items-center justify-center rounded text-xs transition-colors
        ${active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-3.5 bg-border mx-0.5 self-center" />;
}

function ColorDrop({
  icon, colors, onSelect, title,
}: {
  icon: React.ReactNode;
  colors: { label: string; value: string }[];
  onSelect: (color: string) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="h-6 px-1 flex items-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {icon}
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 w-32">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onMouseDown={(e) => { e.preventDefault(); onSelect(c.value); setOpen(false); }}
              className="h-5 w-5 rounded-full border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c.value }}
            />
          ))}
          <button
            type="button"
            title="ล้างสี"
            onMouseDown={(e) => { e.preventDefault(); onSelect(""); setOpen(false); }}
            className="h-5 w-5 rounded-full border border-border bg-background text-[8px] text-muted-foreground hover:scale-110 transition-transform flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "80px" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSize,
    ],
    content: value || "",
    onUpdate({ editor }) {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "outline-none prose prose-sm max-w-none text-sm leading-relaxed",
        style: `min-height: ${minHeight}; padding: 8px 10px;`,
        "data-placeholder": placeholder ?? "",
      },
    },
    onCreate({ editor }) {
      editor.registerPlugin(fakeSelectionPlugin);
    },
  });

  // Sync external value changes (e.g. reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (current !== incoming && incoming !== (current === "<p></p>" ? "" : current)) {
      editor.commands.setContent(incoming, false);
    }
  }, [value]);

  if (!editor) return null;

  const selectionRef = useRef(null);
  const saveSelection = () => {
    const { from, to } = editor.state.selection;
    editor.view.dispatch(
      editor.state.tr.setMeta(fakeSelectionPluginKey, {
        selection: { from, to },
      })
    );
  };
  const clearSelection = () => {
    editor.view.dispatch(
      editor.state.tr.setMeta(fakeSelectionPluginKey, {
        clear: true,
      })
    );
  };
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      selectionRef.current = editor.state.selection;
    };

    editor.on("selectionUpdate", updateSelection);
    return () => {
      editor.off("selectionUpdate", updateSelection);
    };
  }, [editor]);

  const getFontSize = () => {
    const size = editor.getAttributes("textStyle").fontSize
    return size ? parseInt(size) : 16;
  };
  const fontSize = getFontSize();
  const [inputValue, setInputValue] = useState(String(fontSize));
  useEffect(() => {
    setInputValue(String(fontSize));
  }, [fontSize]);
  const applyFontSize = (size: number) => {
    editor
      .chain()
      .focus()
      .setTextSelection(selectionRef.current)
      .setFontSize(`${size}px`)
      .run();
  };

  return (
    <div className="rounded-md border border-input bg-background text-sm focus-within:ring-1 focus-within:ring-ring overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30">
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="หัวข้อใหญ่">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="หัวข้อเล็ก">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <div
          title="ปรับขนาดตัวอักษร"
          className="h-7 w-fit flex gap-1 items-center justify-center text-sm text-muted-foreground"
        >
          <Button
            variant="ghost"
            size="icon"
            className="size-5 rounded-sm "
            onClick={() => applyFontSize(fontSize - 2)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <input
            className="w-8 text-center border-[1px] border-muted-foreground/50 rounded-sm"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            onFocus={saveSelection}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => {
              const value = Number(inputValue);
              if (!isNaN(value)) {
                applyFontSize(value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = Number(inputValue);
                if (!isNaN(value)) {
                  applyFontSize(value);
                }
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-5 rounded-sm"
            onClick={() => applyFontSize(fontSize + 2)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Sep />
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="ตัวหนา">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="ตัวเอียง">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="ขีดเส้นใต้">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="ขีดทับ">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="รายการ">
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="รายการลำดับ">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="ชิดซ้าย">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="กึ่งกลาง">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="ชิดขวา">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <Sep />
        <ColorDrop
          icon={<Palette className="h-3.5 w-3.5" />}
          colors={TEXT_COLORS}
          title="สีตัวอักษร"
          onSelect={(color) => {
            if (color) editor.chain().focus().setColor(color).run();
            else editor.chain().focus().unsetColor().run();
          }}
        />
        <ColorDrop
          icon={<Highlighter className="h-3.5 w-3.5" />}
          colors={HIGHLIGHT_COLORS}
          title="ไฮไลท์"
          onSelect={(color) => {
            if (color) editor.chain().focus().setHighlight({ color }).run();
            else editor.chain().focus().unsetHighlight().run();
          }}
        />
      </div>

      {/* Editor area */}
      <div className="relative">
        <EditorContent editor={editor} onBlur={saveSelection} onFocus={clearSelection} />
        {!value && placeholder && (
          <p className="pointer-events-none absolute top-2 left-2.5 text-sm text-muted-foreground/60 select-none">
            {placeholder}
          </p>
        )}
      </div>

      <style>{`
        .ProseMirror ul { list-style-type: disc; padding-left: 1.25rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.25rem; }
        .ProseMirror h2 { font-size: 1.05rem; font-weight: 700; margin: 0.4em 0 0.2em; }
        .ProseMirror h3 { font-size: 0.95rem; font-weight: 600; margin: 0.3em 0 0.15em; }
        .ProseMirror p { margin: 0.15em 0; }
        .ProseMirror p:first-child { margin-top: 0; }
        .ProseMirror p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
