import { useRef, useCallback } from "react";
import apiClient from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Type, ImagePlus, FileUp, Trash2, ChevronUp, ChevronDown, Loader2, Link } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from "@/helpers/constants";
import RichTextEditor from "./RichTextEditor";

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption: string }
  | { type: "file"; url: string; name: string; title: string }
  | { type: "link"; url: string; title: string };
  
interface Props {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  programId: string;
}

let _idCounter = 0;
const genId = () => `block-${++_idCounter}-${Math.random().toString(36).slice(2)}`;

export default function AboutContentEditor({ blocks, onChange, programId }: Props) {
  const [uploading, setUploading] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stableIds = useRef<string[]>([]);
  const [linkIsEditing, setLinkIsEditing] = useState(false);

  // Sync stableIds length with blocks length
  while (stableIds.current.length < blocks.length) stableIds.current.push(genId());
  if (stableIds.current.length > blocks.length) stableIds.current = stableIds.current.slice(0, blocks.length);

  const addTextBlock = () => {
    stableIds.current = [...stableIds.current, genId()];
    onChange([...blocks, { type: "text", content: "<p></p>" }]);
  };

  const updateBlock = useCallback((index: number, updated: ContentBlock) => {
    onChange(blocks.map((b, i) => (i === index ? updated : b)));
  }, [blocks, onChange]);

  const removeBlock = (index: number) => {
    stableIds.current = stableIds.current.filter((_, i) => i !== index);
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    const ids = [...stableIds.current];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    stableIds.current = ids;
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
        timeout: 60000,
      });
      if (type === "image") {
        stableIds.current = [...stableIds.current, genId()];
        onChange([...blocks, { type: "image", url: data.url, caption: "" }]);
      } else {
        stableIds.current = [...stableIds.current, genId()];
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
    if (file && file.size > MAX_FILE_SIZE) {
      toast({ title: `ไฟล์ ${file.name} ใหญ่เกิน ${MAX_FILE_SIZE_MB}MB`, variant: "destructive" });
    } else if (file) uploadFile(file, "file");
    e.target.value = "";
  };

  const addLinkBlock = () => {
    stableIds.current = [...stableIds.current, genId()];
    onChange([...blocks, { type: "link", url: "", title: "" }]);
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={stableIds.current[i]} className="group relative border border-border rounded-lg p-3">
          <div className="absolute -right-2 -top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow-md border border-border" onClick={() => moveBlock(i, -1)} disabled={i === 0}>
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full shadow-md border border-border" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" className="h-7 w-7 rounded-full shadow-md" onClick={() => removeBlock(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {block.type === "text" && (
            <RichTextEditor value={block.content} onChange={(content) => updateBlock(i, { ...block, content })} />
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
          {block.type === "link" && (
            <div className="space-y-2">
              <input
                type="text"
                value={block.title || ""}
                onChange={(e) => updateBlock(i, { ...block, title: e.target.value })}
                placeholder="หัวข้อลิงก์"
                className="w-full text-xs border border-input rounded px-2 py-1 bg-background text-foreground"
              />
              <div className="flex flex-col gap-2 text-sm">
                <div className="relative flex items-center text-sm">
                  <span className="absolute left-2 text-muted-foreground">
                    <Link className="h-4 w-4" />
                  </span>
                  <input
                    type="url"
                    value={block.url}
                    onChange={(e) => updateBlock(i, { ...block, url: e.target.value })}
                    onFocus={() => setLinkIsEditing(true)}
                    onBlur={() => setLinkIsEditing(false)}
                    placeholder="URL ลิงก์"
                    className={`w-full text-xs border border-input rounded pl-8 px-2 py-1 bg-background ${linkIsEditing ? "text-foreground" : "text-primary underline truncate"}`}
                  />
                </div>
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
        <Button variant="outline" size="sm" onClick={addLinkBlock} type="button">
          <Link className="mr-1.5 h-3.5 w-3.5" /> เพิ่มลิงก์
        </Button>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      <input ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
