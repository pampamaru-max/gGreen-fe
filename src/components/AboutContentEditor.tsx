import { useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import apiClient from "@/lib/axios";
import { Button } from "@/components/ui/button";
import {
  Type, ImagePlus, FileUp, Trash2, ChevronUp, ChevronDown, Loader2,
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Heading2, Heading3,
  Highlighter, Palette,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption: string }
  | { type: "file"; url: string; name: string; title: string };

interface Props {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  programId: string;
}

const TEXT_COLORS = [
  { label: "ดำ", value: "#000000" },
  { label: "เทาเข้ม", value: "#374151" },
  { label: "เทา", value: "#6B7280" },
  { label: "แดง", value: "#EF4444" },
  { label: "ส้ม", value: "#F97316" },
  { label: "เหลือง", value: "#EAB308" },
  { label: "เขียว", value: "#22C55E" },
  { label: "ฟ้า", value: "#3B82F6" },
  { label: "น้ำเงิน", value: "#6366F1" },
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
      className={`h-7 w-7 flex items-center justify-center rounded text-sm transition-colors
        ${active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-0.5 self-center" />;
}

function ColorPicker({
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
        className="h-7 px-1.5 flex items-center gap-0.5 rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {icon}
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 flex flex-wrap gap-1.5 w-36">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onMouseDown={(e) => { e.preventDefault(); onSelect(c.value); setOpen(false); }}
              className="h-6 w-6 rounded-full border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c.value }}
            />
          ))}
          <button
            type="button"
            title="ล้างสี"
            onMouseDown={(e) => { e.preventDefault(); onSelect(""); setOpen(false); }}
            className="h-6 w-6 rounded-full border border-border bg-background text-[9px] text-muted-foreground hover:scale-110 transition-transform flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function RichTextBlock({ block, onUpdate }: {
  block: { type: "text"; content: string };
  onUpdate: (content: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: block.content || "<p></p>",
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[80px] px-3 py-2 text-sm leading-relaxed",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-visible">
      <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-1.5 py-1 bg-muted/40">
        <ToolBtn title="หัวข้อ H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="หัวข้อ H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />
        <ToolBtn title="หนา" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="เอียง" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="ขีดเส้นใต้" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="ขีดทับ" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />
        <ColorPicker
          title="สีข้อความ"
          icon={<><Palette className="h-3.5 w-3.5" /><span className="text-[9px]">▾</span></>}
          colors={TEXT_COLORS}
          onSelect={(color) => color
            ? editor.chain().focus().setColor(color).run()
            : editor.chain().focus().unsetColor().run()
          }
        />
        <ColorPicker
          title="ไฮไลต์"
          icon={<><Highlighter className="h-3.5 w-3.5" /><span className="text-[9px]">▾</span></>}
          colors={HIGHLIGHT_COLORS}
          onSelect={(color) => color
            ? editor.chain().focus().setHighlight({ color }).run()
            : editor.chain().focus().unsetHighlight().run()
          }
        />
        <Divider />
        <ToolBtn title="ชิดซ้าย" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="กึ่งกลาง" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="ชิดขวา" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
        <Divider />
        <ToolBtn title="รายการจุด" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn title="รายการตัวเลข" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

export default function AboutContentEditor({ blocks, onChange, programId }: Props) {
  const [uploading, setUploading] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTextBlock = () => onChange([...blocks, { type: "text", content: "<p></p>" }]);

  const updateBlock = useCallback((index: number, updated: ContentBlock) => {
    onChange(blocks.map((b, i) => (i === index ? updated : b)));
  }, [blocks, onChange]);

  const removeBlock = (index: number) => onChange(blocks.filter((_, i) => i !== index));

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const uploadFile = async (file: File, type: "image" | "file") => {
    setUploading(blocks.length);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `programs/${programId}`);
      const { data } = await apiClient.post<{ url: string }>("files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (type === "image") {
        onChange([...blocks, { type: "image", url: data.url, caption: "" }]);
      } else {
        onChange([...blocks, { type: "file", url: data.url, name: file.name, title: "" }]);
      }
    } catch (err: any) {
      toast({ title: "อัปโหลดไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, "image");
    e.target.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, "file");
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="group relative border border-border rounded-lg p-3">
          <div className="absolute -right-1 -top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeBlock(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {block.type === "text" && (
            <RichTextBlock
              block={block}
              onUpdate={(content) => updateBlock(i, { ...block, content })}
            />
          )}
          {block.type === "image" && (
            <div className="space-y-2">
              <img src={block.url} alt={block.caption} className="max-h-48 rounded-md object-contain" />
              <input
                type="text"
                value={block.caption}
                onChange={(e) => updateBlock(i, { ...block, caption: e.target.value })}
                placeholder="คำอธิบายภาพ (ไม่บังคับ)"
                className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground"
              />
            </div>
          )}
          {block.type === "file" && (
            <div className="space-y-2">
              <input
                type="text"
                value={block.title || ""}
                onChange={(e) => updateBlock(i, { ...block, title: e.target.value })}
                placeholder="หัวข้อไฟล์ (ไม่บังคับ)"
                className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground"
              />
              <div className="flex items-center gap-2 text-sm">
                <FileUp className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={block.url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate">
                  {block.name}
                </a>
              </div>
            </div>
          )}
        </div>
      ))}

      {uploading !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังอัปโหลด...
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={addTextBlock} type="button">
          <Type className="mr-1.5 h-3.5 w-3.5" /> เพิ่มข้อความ
        </Button>
        <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} type="button">
          <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> เพิ่มรูปภาพ
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} type="button">
          <FileUp className="mr-1.5 h-3.5 w-3.5" /> อัปโหลดไฟล์
        </Button>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
