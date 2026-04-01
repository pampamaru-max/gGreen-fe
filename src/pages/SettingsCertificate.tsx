import { useState, useEffect, useRef } from "react";
import { FileText, Loader2, Pencil, Save, Upload, Eye, Trophy, Medal, Award, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DndContext, useDraggable, type DragEndEvent } from "@dnd-kit/core";

interface ScoringLevel {
  id: number;
  name: string;
  min_score: number;
  max_score: number;
  color: string;
  icon: string;
  sort_order: number;
  program_id: string | null;
}

interface DbProgram {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
}

interface CertElement {
  id: string;
  type: "text" | "image" | "variable";
  content: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  width?: number; // percentage
  height?: number; // percentage
  textAlign?: "left" | "center" | "right";
}

interface CertTemplate {
  id?: number;
  scoring_level_id: number;
  title: string;
  subtitle: string;
  body_text: string;
  footer_text: string;
  signer_name: string;
  signer_title: string;
  bg_image_url: string | null;
  logo_url: string | null;
  primary_color: string;
  orientation?: "landscape" | "portrait";
  layout?: CertElement[];
}

const ICON_MAP: Record<string, React.ElementType> = { trophy: Trophy, medal: Medal, award: Award };
const getIcon = (icon: string) => ICON_MAP[icon] || Trophy;

const defaultTemplate = (levelId: number, color: string): CertTemplate => ({
  scoring_level_id: levelId,
  title: "ใบประกาศนียบัตร",
  subtitle: "โครงการ G-Green",
  body_text: "ขอมอบใบประกาศนียบัตรฉบับนี้ให้แก่",
  footer_text: "กรมการเปลี่ยนแปลงสภาพภูมิอากาศและสิ่งแวดล้อม",
  signer_name: "",
  signer_title: "",
  bg_image_url: null,
  logo_url: null,
  primary_color: color,
  orientation: "landscape",
  layout: [],
});

/* ──────────────── Certificate Preview ──────────────── */
const CertificatePreview = ({ 
  template, levelName, onElementClick, onElementMove, selectedElementId 
}: { 
  template: CertTemplate; 
  levelName: string; 
  onElementClick?: (el: CertElement | null) => void;
  onElementMove?: (id: string, x: number, y: number) => void;
  selectedElementId?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const isLandscape = template.orientation !== "portrait";
  const aspectRatio = isLandscape ? "1.414" : "0.707";

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !onElementMove || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Clamp to 0-100
    onElementMove(draggingId, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg border-2 shadow-lg overflow-hidden bg-white select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDraggingId(null)}
      onPointerLeave={() => setDraggingId(null)}
      style={{
        aspectRatio,
        borderColor: template.primary_color,
        touchAction: "none",
      }}
    >
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: template.bg_image_url ? `url(${template.bg_image_url})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: template.bg_image_url ? undefined : "#fffdf7",
        }}
      />
      {template.bg_image_url && <div className="absolute inset-0 bg-white/60 pointer-events-none" />}
      
      <div className="absolute inset-4 border border-slate-200 pointer-events-none" />

      {/* Legacy fixed elements */}
      {(!template.layout || template.layout.length === 0) && (
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3 p-8 text-center pointer-events-none">
          {template.logo_url && <img src={template.logo_url} alt="Logo" className="h-16 w-16 object-contain mb-2" />}
          <div className="w-24 h-1 rounded-full mb-1" style={{ backgroundColor: template.primary_color }} />
          <h2 className="text-xl md:text-2xl font-bold" style={{ color: template.primary_color }}>{template.title}</h2>
          {template.subtitle && <p className="text-sm text-muted-foreground">{template.subtitle}</p>}
          <p className="text-sm mt-2">{template.body_text}</p>
          <div className="mt-1 px-6 py-2 border-b-2 min-w-[200px]" style={{ borderColor: template.primary_color }}>
            <span className="text-lg font-semibold" style={{ color: template.primary_color }}>ชื่อ-สกุล ผู้ได้รับ</span>
          </div>
          <div className="mt-2 px-4 py-1 rounded-full text-white text-sm font-bold" style={{ backgroundColor: template.primary_color }}>
            ระดับ {levelName}
          </div>
          {template.footer_text && <p className="text-xs text-muted-foreground mt-3">{template.footer_text}</p>}
          {template.signer_name && (
            <div className="mt-4 text-center">
              <div className="w-32 border-b border-foreground/30 mx-auto mb-1" />
              <p className="text-sm font-semibold">{template.signer_name}</p>
              {template.signer_title && <p className="text-xs text-muted-foreground">{template.signer_title}</p>}
            </div>
          )}
        </div>
      )}

      {/* Flexible Layout Elements */}
      {template.layout?.map((el) => {
        const isSelected = selectedElementId === el.id;
        const isDragging = draggingId === el.id;
        return (
          <div
            key={el.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              onElementClick?.(el);
              setDraggingId(el.id);
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            className={`absolute cursor-move transition-shadow hover:ring-2 hover:ring-primary/50 group ${
              isSelected ? "ring-2 ring-primary z-20" : "z-10"
            } ${isDragging ? "opacity-70 shadow-xl" : ""}`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: el.width ? `${el.width}%` : undefined,
              height: el.height ? `${el.height}%` : undefined,
              fontSize: el.fontSize ? `${el.fontSize}px` : undefined,
              fontWeight: el.fontWeight,
              color: el.color || template.primary_color,
              textAlign: el.textAlign || "center",
              transform: "translate(-50%, -50%)",
            }}
          >
            {isSelected && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] px-1 rounded flex items-center gap-1">
                <GripVertical className="w-2 h-2" /> Drag
              </div>
            )}
            {el.type === "image" && <img src={el.content} alt="Logo" className="w-full h-full object-contain pointer-events-none" />}
            {el.type === "text" && <span className="whitespace-nowrap">{el.content}</span>}
            {el.type === "variable" && (
              <span className="font-bold underline whitespace-nowrap">
                {el.content === "{recipient}" ? "ชื่อ-สกุล ผู้ได้รับ" : el.content === "{level}" ? `ระดับ ${levelName}` : el.content}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ──────────────── Edit Form Dialog ──────────────── */
const EditTemplateDialog = ({
  template, levelName, onSave,
}: {
  template: CertTemplate; levelName: string; onSave: (t: CertTemplate) => void;
}) => {
  const [form, setForm] = useState<CertTemplate>(template);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const elementImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setForm(template); }, [open, template]);

  const set = (key: keyof CertTemplate, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleFileUpload = async (file: File, field: "logo_url" | "bg_image_url" | "element") => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `certificate-assets/${field === "logo_url" ? "logos" : "backgrounds"}`);
      const { data } = await apiClient.post<{ url: string }>("files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      if (field === "element") return data.url;
      setForm((f) => ({ ...f, [field]: data.url }));
      toast({ title: "อัปโหลดสำเร็จ" });
    } catch (e: any) {
      toast({ title: "อัปโหลดล้มเหลว", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addElement = (type: "text" | "image" | "variable", content: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEl: CertElement = {
      id,
      type,
      content,
      x: 50,
      y: 50,
      fontSize: type === "text" || type === "variable" ? 16 : undefined,
      width: type === "image" ? 15 : undefined,
    };
    setForm((f) => ({ ...f, layout: [...(f.layout || []), newEl] }));
    setSelectedElId(id);
  };

  const updateElement = (id: string, updates: Partial<CertElement>) => {
    setForm((f) => ({
      ...f,
      layout: f.layout?.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }));
  };

  const removeElement = (id: string) => {
    setForm((f) => ({ ...f, layout: f.layout?.filter((el) => el.id !== id) }));
    setSelectedElId(null);
  };

  const selectedEl = form.layout?.find((el) => el.id === selectedElId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />แก้ไข</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>แก้ไขใบประกาศนียบัตร – {levelName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid md:grid-cols-[300px_1fr] gap-6">
            {/* Settings Sidebar */}
            <div className="space-y-4 pr-2">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 space-y-2 mb-4">
                <Button 
                  className="w-full h-9 bg-primary hover:bg-primary/90" 
                  onClick={() => onSave(form)} 
                  disabled={uploading}
                >
                  <Save className="mr-2 h-4 w-4" /> บันทึกระหว่างทำ
                </Button>
                <p className="text-[10px] text-center text-muted-foreground italic">กดบันทึกเพื่อเก็บความคืบหน้าได้ตลอดเวลา</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold uppercase text-muted-foreground">การตั้งค่าพื้นฐาน</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant={form.orientation === "landscape" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => set("orientation", "landscape")}
                  >แนวนอน</Button>
                  <Button 
                    variant={form.orientation === "portrait" ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => set("orientation", "portrait")}
                  >แนวตั้ง</Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label>สีหลัก</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
                      <Input value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>พื้นหลัง</Label>
                  <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "bg_image_url")} />
                  <Button variant="outline" size="sm" className="w-full h-8" onClick={() => bgRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-2 h-3 w-3" />{form.bg_image_url ? "เปลี่ยนพื้นหลัง" : "อัปโหลดพื้นหลัง"}
                  </Button>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Label className="text-sm font-bold uppercase text-muted-foreground">เพิ่มองค์ประกอบ</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => addElement("text", "พิมพ์ข้อความที่นี่")} className="h-8 text-xs">
                    + ข้อความ
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => elementImgRef.current?.click()} className="h-8 text-xs">
                    + รูปภาพ
                  </Button>
                  <input ref={elementImgRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      const url = await handleFileUpload(e.target.files[0], "element");
                      if (url) addElement("image", url);
                    }
                  }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => addElement("variable", "{recipient}")} className="h-8 text-[10px]">
                    + ชื่อผู้ได้รับ
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addElement("variable", "{level}")} className="h-8 text-[10px]">
                    + ระดับรางวัล
                  </Button>
                </div>
              </div>

              {selectedEl && (
                <div className="pt-4 border-t space-y-3 bg-accent/30 p-3 rounded-lg animate-in slide-in-from-left-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold">แก้ไของค์ประกอบ</Label>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeElement(selectedEl.id)}>✕</Button>
                  </div>
                  
                  {selectedEl.type !== "image" && (
                    <div>
                      <Label className="text-[10px]">ข้อความ</Label>
                      <Textarea 
                        value={selectedEl.content} 
                        onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })} 
                        rows={2}
                        className="text-xs"
                        disabled={selectedEl.type === "variable"}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">ตำแหน่ง X (%)</Label>
                      <Input type="number" value={selectedEl.x === 0 ? "" : selectedEl.x} onFocus={(e) => e.target.select()} onChange={(e) => updateElement(selectedEl.id, { x: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-[10px]">ตำแหน่ง Y (%)</Label>
                      <Input type="number" value={selectedEl.y === 0 ? "" : selectedEl.y} onFocus={(e) => e.target.select()} onChange={(e) => updateElement(selectedEl.id, { y: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-8 text-xs" />
                    </div>
                  </div>

                  {selectedEl.type !== "image" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px]">ขนาดตัวอักษร</Label>
                        <Input type="number" value={selectedEl.fontSize === 0 ? "" : selectedEl.fontSize} onFocus={(e) => e.target.select()} onChange={(e) => updateElement(selectedEl.id, { fontSize: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">สี</Label>
                        <div className="flex gap-1">
                          <input type="color" value={selectedEl.color || form.primary_color} onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
                          <Button variant="ghost" size="sm" className="h-8 px-1 text-[10px]" onClick={() => updateElement(selectedEl.id, { fontWeight: selectedEl.fontWeight === "bold" ? "normal" : "bold" })}>B</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-[10px]">ความกว้าง (%)</Label>
                      <Input type="number" value={selectedEl.width === 0 ? "" : selectedEl.width} onFocus={(e) => e.target.select()} onChange={(e) => updateElement(selectedEl.id, { width: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-8 text-xs" />
                    </div>
                  )}
                </div>
              )}

              {!form.layout?.length && (
                <div className="pt-2 border-t space-y-2 opacity-60">
                  <Label className="text-[10px] italic">คุณยังอยู่ในโหมด Template เดิม (ข้อความคงที่)</Label>
                  <div className="space-y-1">
                    <Input placeholder="หัวเรื่อง" value={form.title} onChange={(e) => set("title", e.target.value)} className="h-8 text-xs" />
                    <Input placeholder="หัวเรื่องรอง" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="h-8 text-xs" />
                    <Textarea placeholder="ข้อความ" value={form.body_text} onChange={(e) => set("body_text", e.target.value)} rows={1} className="text-xs" />
                  </div>
                </div>
              )}
            </div>

            {/* Canvas Area */}
            <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-center min-h-[400px]">
              <div className="w-full max-w-[600px]">
                <div className="mb-2 flex justify-between items-center text-xs text-muted-foreground">
                  <span>คลิกที่องค์ประกอบเพื่อแก้ไข | ลากวางได้จริง</span>
                  <span>ระดับ: {levelName}</span>
                </div>
                <CertificatePreview 
                  template={form} 
                  levelName={levelName} 
                  onElementClick={(el) => setSelectedElId(el?.id || null)}
                  onElementMove={(id, x, y) => updateElement(id, { x, y })}
                  selectedElementId={selectedElId || undefined}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2 bg-background">
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button onClick={() => { onSave(form); setOpen(false); }} disabled={uploading}>
            <Save className="mr-2 h-4 w-4" />บันทึกการเปลี่ยนแปลงทั้งหมด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ──────────────── Level Certificate Card ──────────────── */
const LevelCertCard = ({
  level, template, onSave,
}: {
  level: ScoringLevel; template: CertTemplate; onSave: (t: CertTemplate) => void;
}) => {
  const IC = getIcon(level.icon);
  const saved = !!template.id;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${level.color}20`, color: level.color }}>
              <IC className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{level.name}</p>
              <p className="text-xs text-muted-foreground">ช่วงคะแนน: {level.min_score}% – {level.max_score}%</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">หัวเรื่อง</span>
              <span className="font-medium">{template.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ผู้ลงนาม</span>
              <span className="font-medium">{template.signer_name || "–"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">สถานะ</span>
              <span className={`font-medium ${saved ? "text-green-600" : "text-amber-500"}`}>
                {saved ? "✓ บันทึกแล้ว" : "ยังไม่ได้ตั้งค่า"}
              </span>
            </div>
          </div>
          <EditTemplateDialog template={template} levelName={level.name} onSave={onSave} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm text-muted-foreground">ตัวอย่าง</Label>
          </div>
          <CertificatePreview template={template} levelName={level.name} />
        </div>
      </div>
    </div>
  );
};

/* ──────────────── Main Page ──────────────── */
const SettingsCertificate = () => {
  const queryClient = useQueryClient();

  const { data: levels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ["scoring-levels"],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>("scoring-levels");
      return data.map((l) => ({
        id: l.id,
        name: l.name,
        min_score: l.minScore ?? l.min_score,
        max_score: l.maxScore ?? l.max_score,
        color: l.color,
        icon: l.icon,
        sort_order: l.sortOrder ?? l.sort_order,
        program_id: l.programId ?? l.program_id,
      })) as ScoringLevel[];
    },
  });

  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>("programs");
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        sort_order: p.sortOrder ?? p.sort_order,
      })) as DbProgram[];
    },
  });

  const { data: templatesRaw = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>("certificate-templates");
      return data.map((t) => ({
        id: t.id,
        scoring_level_id: t.scoringLevelId ?? t.scoring_level_id,
        title: t.title,
        subtitle: t.subtitle,
        body_text: t.bodyText ?? t.body_text,
        footer_text: t.footerText ?? t.footer_text,
        signer_name: t.signerName ?? t.signer_name,
        signer_title: t.signerTitle ?? t.signer_title,
        bg_image_url: t.bgImageUrl ?? t.bg_image_url,
        logo_url: t.logoUrl ?? t.logo_url,
        primary_color: t.primaryColor ?? t.primary_color,
        orientation: t.orientation,
        layout: t.layout,
      })) as CertTemplate[];
    },
  });

  const templates: Record<number, CertTemplate> = {};
  templatesRaw.forEach((t) => { templates[t.scoring_level_id] = t; });

  const saveMutation = useMutation({
    mutationFn: async ({ levelId, template }: { levelId: number; template: CertTemplate }) => {
      const existing = templates[levelId];
      if (existing?.id) {
        const { id, ...rest } = template;
        await apiClient.patch(`certificate-templates/${existing.id}`, rest);
      } else {
        const { id, ...rest } = template;
        await apiClient.post("certificate-templates", rest);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast({ title: "บันทึกสำเร็จ" });
    },
    onError: (err: Error) => {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = (levelId: number, template: CertTemplate) => {
    saveMutation.mutate({ levelId, template });
  };

  if (levelsLoading || programsLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">ใบประกาศนียบัตร</h2>
            <p className="text-xs text-muted-foreground">จัดการรูปแบบใบประกาศนียบัตรตามระดับผลการประเมินแยกตามโครงการ</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {programs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-10 w-10 mb-2 opacity-30" />
            <p>ยังไม่มีโครงการ กรุณาเพิ่มโครงการก่อน</p>
          </div>
        )}

        {programs.map((program) => {
          const programLevels = levels
            .filter((l) => l.program_id === program.id)
            .sort((a, b) => a.sort_order - b.sort_order);
          const configuredCount = programLevels.filter((l) => !!templates[l.id]).length;

          return (
            <Collapsible key={program.id} className="group/prog">
              <div className="rounded-xl border border-accent/30 bg-accent/10 overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-5 py-4 hover:bg-accent/20 transition-colors">
                    <ChevronRight className="h-5 w-5 text-accent-foreground/70 transition-transform group-data-[state=open]/prog:rotate-90" />
                    <p className="font-bold text-foreground text-left flex-1 text-base">{program.name}</p>
                    <span className="text-xs text-muted-foreground">{configuredCount}/{programLevels.length} ระดับตั้งค่าแล้ว</span>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-4 py-4 space-y-4">
                    {programLevels.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 mb-2 opacity-30" />
                        <p className="text-sm">ยังไม่มีเกณฑ์คะแนนในโครงการนี้ กรุณาตั้งค่าเกณฑ์คะแนนก่อน</p>
                      </div>
                    ) : (
                      programLevels.map((level) => {
                        const template = templates[level.id] || defaultTemplate(level.id, level.color);
                        return (
                          <LevelCertCard
                            key={level.id}
                            level={level}
                            template={template}
                            onSave={(t) => handleSave(level.id, t)}
                          />
                        );
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {levels.some((l) => !l.program_id) && (
          <div className="rounded-xl border border-dashed bg-muted/30 p-4 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">ระดับที่ยังไม่ได้ผูกกับโครงการ</p>
            {levels.filter((l) => !l.program_id).map((level) => {
              const template = templates[level.id] || defaultTemplate(level.id, level.color);
              return (
                <LevelCertCard
                  key={level.id}
                  level={level}
                  template={template}
                  onSave={(t) => handleSave(level.id, t)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsCertificate;
