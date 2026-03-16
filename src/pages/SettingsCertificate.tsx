import { useState, useEffect, useRef } from "react";
import { FileText, Loader2, Pencil, Save, Upload, Eye, Trophy, Medal, Award, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
});

/* ──────────────── Certificate Preview ──────────────── */
const CertificatePreview = ({ template, levelName }: { template: CertTemplate; levelName: string }) => (
  <div
    className="relative w-full aspect-[1.414] rounded-lg border-2 shadow-lg overflow-hidden flex flex-col items-center justify-center p-8 text-center"
    style={{
      borderColor: template.primary_color,
      backgroundImage: template.bg_image_url ? `url(${template.bg_image_url})` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: template.bg_image_url ? undefined : "#fffdf7",
    }}
  >
    {template.bg_image_url && <div className="absolute inset-0 bg-white/80" />}
    <div className="relative z-10 flex flex-col items-center gap-3 max-w-full">
      {template.logo_url && <img src={template.logo_url} alt="Logo" className="h-16 w-16 object-contain" />}
      <div className="w-24 h-1 rounded-full" style={{ backgroundColor: template.primary_color }} />
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
  </div>
);

/* ──────────────── Edit Form Dialog ──────────────── */
const EditTemplateDialog = ({
  template, levelName, onSave,
}: {
  template: CertTemplate; levelName: string; onSave: (t: CertTemplate) => void;
}) => {
  const [form, setForm] = useState<CertTemplate>(template);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setForm(template); }, [open, template]);

  const set = (key: keyof CertTemplate, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("certificate-assets").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("certificate-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileUpload = async (file: File, field: "logo_url" | "bg_image_url") => {
    setUploading(true);
    try {
      const url = await uploadFile(file, field === "logo_url" ? "logos" : "backgrounds");
      setForm((f) => ({ ...f, [field]: url }));
      toast({ title: "อัปโหลดสำเร็จ" });
    } catch (e: any) {
      toast({ title: "อัปโหลดล้มเหลว", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />แก้ไข</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>แก้ไขใบประกาศนียบัตร – {levelName}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 py-2">
          <div className="space-y-3">
            <div><Label>หัวเรื่อง</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><Label>หัวเรื่องรอง</Label><Input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></div>
            <div><Label>ข้อความ</Label><Textarea value={form.body_text} onChange={(e) => set("body_text", e.target.value)} rows={2} /></div>
            <div><Label>ท้ายกระดาษ</Label><Input value={form.footer_text} onChange={(e) => set("footer_text", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>ชื่อผู้ลงนาม</Label><Input value={form.signer_name} onChange={(e) => set("signer_name", e.target.value)} /></div>
              <div><Label>ตำแหน่งผู้ลงนาม</Label><Input value={form.signer_title} onChange={(e) => set("signer_title", e.target.value)} /></div>
            </div>
            <div>
              <Label>สีหลัก</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={form.primary_color} onChange={(e) => set("primary_color", e.target.value)} className="flex-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>โลโก้</Label>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo_url")} />
                <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => logoRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 h-3 w-3" />{form.logo_url ? "เปลี่ยนโลโก้" : "อัปโหลดโลโก้"}
                </Button>
              </div>
              <div>
                <Label>ภาพพื้นหลัง</Label>
                <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], "bg_image_url")} />
                <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => bgRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 h-3 w-3" />{form.bg_image_url ? "เปลี่ยนพื้นหลัง" : "อัปโหลดพื้นหลัง"}
                </Button>
              </div>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">ตัวอย่าง</Label>
            <CertificatePreview template={form} levelName={levelName} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
          <Button onClick={() => { onSave(form); setOpen(false); }} disabled={uploading}>
            <Save className="mr-2 h-4 w-4" />บันทึก
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
        {/* Info */}
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
        {/* Preview */}
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
  const [levels, setLevels] = useState<ScoringLevel[]>([]);
  const [programs, setPrograms] = useState<DbProgram[]>([]);
  const [templates, setTemplates] = useState<Record<number, CertTemplate>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [levelsRes, templatesRes, progRes] = await Promise.all([
      supabase.from("scoring_levels").select("*").order("sort_order"),
      supabase.from("certificate_templates").select("*"),
      supabase.from("programs").select("id, name, icon, sort_order").order("sort_order"),
    ]);

    if (levelsRes.error) {
      toast({ title: "เกิดข้อผิดพลาด", description: levelsRes.error.message, variant: "destructive" });
      return;
    }

    setLevels((levelsRes.data || []) as ScoringLevel[]);
    setPrograms((progRes.data || []) as DbProgram[]);

    const tMap: Record<number, CertTemplate> = {};
    (templatesRes.data || []).forEach((t: any) => { tMap[t.scoring_level_id] = t; });
    setTemplates(tMap);
  };

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, []);

  const handleSave = async (levelId: number, template: CertTemplate) => {
    const existing = templates[levelId];
    if (existing?.id) {
      const { id, ...rest } = template;
      const { error } = await supabase.from("certificate_templates").update(rest).eq("id", existing.id);
      if (error) { toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" }); return; }
    } else {
      const { id, ...rest } = template;
      const { error } = await supabase.from("certificate_templates").insert(rest);
      if (error) { toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "บันทึกสำเร็จ" });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
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
                    <span className="text-xs text-muted-foreground">
                      {configuredCount}/{programLevels.length} ระดับตั้งค่าแล้ว
                    </span>
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

        {/* Unassigned levels */}
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
