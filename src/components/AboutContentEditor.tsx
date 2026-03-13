import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Type, ImagePlus, FileUp, Trash2, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image"; url: string; caption: string }
  | { type: "file"; url: string; name: string; title: string };

interface Props {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  programId: string;
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0E00-\u0E7F]/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

export default function AboutContentEditor({ blocks, onChange, programId }: Props) {
  const [uploading, setUploading] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTextBlock = () => onChange([...blocks, { type: "text", content: "" }]);

  const updateBlock = (index: number, updated: ContentBlock) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  };

  const removeBlock = (index: number) => onChange(blocks.filter((_, i) => i !== index));

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const uploadFile = async (file: File, type: "image" | "file") => {
    const safeName = sanitizeFileName(file.name);
    const path = `${programId}/${Date.now()}_${safeName}`;
    setUploading(blocks.length);

    const { error } = await supabase.storage.from("program-assets").upload(path, file);
    if (error) {
      toast({ title: "อัปโหลดไม่สำเร็จ", description: error.message, variant: "destructive" });
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("program-assets").getPublicUrl(path);

    if (type === "image") {
      onChange([...blocks, { type: "image", url: urlData.publicUrl, caption: "" }]);
    } else {
      onChange([...blocks, { type: "file", url: urlData.publicUrl, name: file.name, title: "" }]);
    }
    setUploading(null);
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
          {/* Controls */}
          <div className="absolute -right-1 -top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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

          {/* Block content */}
          {block.type === "text" && (
            <Textarea
              value={block.content}
              onChange={(e) => updateBlock(i, { ...block, content: e.target.value })}
              placeholder="พิมพ์ข้อความ..."
              rows={3}
              className="resize-y"
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

      {/* Add buttons */}
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
