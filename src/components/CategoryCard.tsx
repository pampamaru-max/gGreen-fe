import { useState, useRef } from "react";
import { Category, ScoringCriterion } from "@/data/evaluationData";
import { ChevronDown, ChevronRight, Trash2, FileText, Upload, X, Eye, ListChecks, Plus, Info, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const categoryColors = [
  "210 70% 45%",
  "165 60% 40%",
  "40 90% 50%",
  "340 65% 50%",
  "270 60% 50%",
  "30 80% 50%",
  "190 70% 40%",
  "0 65% 50%",
];

export function getCategoryColor(index: number): string {
  return categoryColors[index % categoryColors.length];
}

export interface UploadedFile {
  name: string;
  url: string;
  path: string;
}

interface Props {
  category: Category;
  colorIndex: number;
  scores: Record<string, number>;
  onScoreChange: (id: string, score: number) => void;
  onDelete?: () => void;
  uploadedFiles: Record<string, UploadedFile[]>;
  onFilesChange: (indicatorId: string, files: UploadedFile[]) => void;
  onSave?: (indicatorId: string) => Promise<void>;
  implementationDetails?: Record<string, string>;
  onImplementationDetailChange?: (indicatorId: string, value: string) => void;
  committeeScores?: Record<string, number>;
  onCommitteeScoreChange?: (indicatorId: string, score: number) => void;
  committeeComments?: Record<string, string>;
  onCommitteeCommentChange?: (indicatorId: string, value: string) => void;
  userRole?: string | null;
}

function IndicatorDialog({
  indicator,
  score,
  onScoreChange,
  color,
  files,
  onFilesChange,
  open,
  onOpenChange,
  onSave,
  implementationDetail,
  onImplementationDetailChange,
  committeeScore,
  onCommitteeScoreChange,
  committeeComment,
  onCommitteeCommentChange,
  userRole,
}: {
  indicator: Category["topics"][0]["indicators"][0];
  score: number;
  onScoreChange: (score: number) => void;
  color: string;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => Promise<void>;
  implementationDetail?: string;
  onImplementationDetailChange?: (value: string) => void;
  committeeScore?: number;
  onCommitteeScoreChange?: (score: number) => void;
  committeeComment?: string;
  onCommitteeCommentChange?: (value: string) => void;
  userRole?: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const criteria = indicator.scoringCriteria || [];

  const getScoreColor = (s: number) => {
    if (s <= 1) return "0 72% 51%";       // แดง
    if (s <= 3) return "30 60% 45%";       // น้ำตาล
    return "142 60% 40%";                   // เขียว
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(selectedFiles)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "png", "jpg", "jpeg"].includes(ext || "")) {
        toast.error(`ไฟล์ ${file.name} ไม่รองรับ (รองรับ PDF, PNG, JPG)`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`ไฟล์ ${file.name} ใหญ่เกิน 10MB`);
        continue;
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${indicator.id}/${Date.now()}_${safeFileName}`;
      const { error } = await supabase.storage
        .from("evaluation-files")
        .upload(filePath, file);

      if (error) {
        toast.error(`อัปโหลด ${file.name} ไม่สำเร็จ`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("evaluation-files")
        .getPublicUrl(filePath);

      newFiles.push({ name: file.name, url: urlData.publicUrl, path: filePath });
    }

    onFilesChange([...files, ...newFiles]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (file: UploadedFile) => {
    await supabase.storage.from("evaluation-files").remove([file.path]);
    onFilesChange(files.filter((f) => f.path !== file.path));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Header */}
        <DialogHeader
          className="px-6 pt-6 pb-4 shrink-0"
          style={{ backgroundColor: `hsl(${color} / 0.06)` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: `hsl(${color})` }}
            />
            <DialogTitle className="text-base font-semibold text-foreground leading-snug text-left">
              {indicator.name}
            </DialogTitle>
            {indicator.description && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-sm">
                    <p className="text-sm leading-relaxed">{indicator.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x overflow-hidden flex-1 min-h-0">
          {/* ===== ด้านซ้าย: รายละเอียด + เอกสารแนบ + หลักฐานอ้างอิง ===== */}
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {/* รายละเอียดตัวชี้วัด */}
            {indicator.detail && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  รายละเอียดตัวชี้วัด
                </p>
                <div className="text-base font-medium text-foreground leading-relaxed whitespace-pre-line bg-muted/30 rounded-md p-3">
                  {indicator.detail}
                </div>
              </div>
            )}

            {/* หลักฐานอ้างอิง */}
            {indicator.evidenceDescription && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  หลักฐานอ้างอิง
                </p>
                <div className="text-sm text-foreground/70 bg-muted/30 border rounded-md p-3 leading-relaxed whitespace-pre-line">
                  {indicator.evidenceDescription}
                </div>
              </div>
            )}

            {/* รายละเอียดการดำเนินการ */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                รายละเอียดการดำเนินการ
              </p>
              <textarea
                value={implementationDetail || ""}
                onChange={(e) => onImplementationDetailChange?.(e.target.value)}
                placeholder="ระบุรายละเอียดการดำเนินการ..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* เอกสารแนบ */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                เอกสารแนบ
              </p>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f) => (
                    <div
                      key={f.path}
                      className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-1.5 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[180px]">{f.name}</span>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteFile(f)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 py-6 cursor-pointer hover:bg-muted/40 hover:border-muted-foreground/40 transition-colors"
              >
                <ListChecks className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                <p className="text-xs text-muted-foreground text-center">รองรับไฟล์ PDF, PNG, JPG</p>
                <p className="text-xs text-muted-foreground/70 text-center mb-2">ลากไฟล์มาวางหรือคลิกเพื่ออัปโหลด</p>
                <button
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-md border bg-background text-foreground hover:bg-muted transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}
                </button>
              </div>
            </div>
          </div>

          {/* ===== ด้านขวา: ให้คะแนน + หมายเหตุเกณฑ์คะแนน ===== */}
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {/* ให้คะแนนประเมินตนเอง */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ให้คะแนนประเมินตนเอง
                </p>
                <div>
                  <span
                    className="text-xl font-bold"
                    style={{ color: score > 0 ? `hsl(${getScoreColor(score)})` : "hsl(var(--muted-foreground))" }}
                  >
                    {score}
                  </span>
                  <span className="text-sm text-muted-foreground">/{indicator.maxScore}</span>
                </div>
              </div>
              {criteria.length > 0 ? (
                <div className="space-y-1.5">
                  {criteria.map((c: ScoringCriterion) => (
                    <button
                      key={c.score}
                      onClick={() => onScoreChange(c.score === score ? 0 : c.score)}
                      className="flex items-start gap-3 w-full text-left rounded-lg px-3 py-2.5 transition-all text-sm"
                      style={
                        c.score === score
                          ? {
                              backgroundColor: `hsl(${getScoreColor(c.score)} / 0.12)`,
                              border: `1.5px solid hsl(${getScoreColor(c.score)} / 0.4)`,
                            }
                          : {
                              backgroundColor: "transparent",
                              border: "1.5px solid hsl(var(--border))",
                            }
                      }
                    >
                      <span
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold mt-0.5"
                        style={
                          c.score === score
                            ? { backgroundColor: `hsl(${getScoreColor(c.score)})`, color: "white" }
                            : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
                        }
                      >
                        {c.score}
                      </span>
                      <span
                        className="leading-snug pt-1"
                        style={{ color: c.score === score ? `hsl(${getScoreColor(c.score)})` : "hsl(var(--foreground))" }}
                      >
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: indicator.maxScore + 1 }, (_, i) => i).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => onScoreChange(opt === score ? 0 : opt)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-all"
                      style={
                        opt === score && opt > 0
                          ? { backgroundColor: `hsl(${getScoreColor(opt)})`, color: "white" }
                          : opt === score && opt === 0
                          ? { backgroundColor: `hsl(${getScoreColor(0)})`, color: "white" }
                          : { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* กรรมการให้คะแนน */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  กรรมการให้คะแนน
                </p>
                <div>
                  <span
                    className="text-xl font-bold"
                    style={{ color: (committeeScore || 0) > 0 ? `hsl(${getScoreColor(committeeScore || 0)})` : "hsl(var(--muted-foreground))" }}
                  >
                    {committeeScore || 0}
                  </span>
                  <span className="text-sm text-muted-foreground">/{indicator.maxScore}</span>
                </div>
              </div>
              {userRole === "user" ? (
                <p className="text-sm text-muted-foreground italic">เฉพาะกรรมการหรือผู้ดูแลระบบเท่านั้นที่สามารถให้คะแนนได้</p>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {Array.from({ length: indicator.maxScore + 1 }, (_, i) => i).map((opt) => (
                    <label
                      key={`committee-radio-${opt}`}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`committee-score-${indicator.id}`}
                        checked={opt === (committeeScore || 0)}
                        onChange={() => onCommitteeScoreChange?.(opt)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm font-medium" style={{ color: opt === (committeeScore || 0) && opt > 0 ? `hsl(${getScoreColor(opt)})` : "hsl(var(--foreground))" }}>
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* ความเห็นกรรมการ */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ความเห็นกรรมการ
              </p>
              {userRole === "user" ? (
                <div className="text-sm text-foreground/70 bg-muted/30 border rounded-md p-3 leading-relaxed whitespace-pre-line min-h-[60px]">
                  {committeeComment || <span className="text-muted-foreground italic">ยังไม่มีความเห็น</span>}
                </div>
              ) : (
                <textarea
                  value={committeeComment || ""}
                  onChange={(e) => onCommitteeCommentChange?.(e.target.value)}
                  placeholder="ระบุความเห็นของกรรมการ..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              )}
            </div>

            {/* หมายเหตุเกณฑ์คะแนน */}
            {indicator.notes && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  หมายเหตุเกณฑ์การให้คะแนน
                </p>
                <div className="text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md p-3 leading-relaxed whitespace-pre-line">
                  {indicator.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer: บันทึก / ยกเลิก */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            ยกเลิก
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              if (onSave) {
                setSaving(true);
                await onSave();
                setSaving(false);
              }
              onOpenChange(false);
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryCard({ category, colorIndex, scores, onScoreChange, onDelete, uploadedFiles, onFilesChange, onSave, implementationDetails, onImplementationDetailChange, committeeScores, onCommitteeScoreChange, committeeComments, onCommitteeCommentChange, userRole }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Category["topics"][0]["indicators"][0] | null>(null);
  const color = categoryColors[colorIndex % categoryColors.length];

  const totalScore = category.topics.reduce(
    (sum, t) => sum + t.indicators.reduce((s, i) => s + (scores[i.id] || 0), 0),
    0
  );
  const totalMax = category.topics.reduce(
    (sum, t) => sum + t.indicators.reduce((s, i) => s + i.maxScore, 0),
    0
  );

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `hsl(${color} / 0.12)` }}
        >
          <ChevronRight className="h-4 w-4" style={{ color: `hsl(${color})` }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {category.topics.length} ประเด็น · {category.topics.reduce((s, t) => s + t.indicators.length, 0)} ตัวชี้วัด · คะแนนเต็ม {category.maxScore}
          </p>
        </div>
        <div className="text-right mr-2">
          <p className="text-lg font-bold" style={{ color: `hsl(${color})` }}>
            {totalScore}<span className="text-xs font-normal text-muted-foreground">/{totalMax}</span>
          </p>
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="ลบหมวดนี้"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        {isOpen ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t">
          {category.topics.map((topic) => (
            <div key={topic.id} className="border-b last:border-b-0">
              <div className="flex items-center gap-2 bg-muted/30 px-4 py-2.5">
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${color})` }}
                />
                <span className="text-sm font-medium text-foreground">{topic.name}</span>
              </div>
              <div className="divide-y">
                {topic.indicators.map((indicator) => {
                  const indScore = scores[indicator.id] || 0;
                  const fileCount = (uploadedFiles[indicator.id] || []).length;
                  return (
                    <button
                      key={indicator.id}
                      onClick={() => setSelectedIndicator(indicator)}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-sm text-foreground truncate">{indicator.name}</span>
                      {fileCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          {fileCount}
                        </span>
                      )}
                      <span
                        className="text-sm font-bold tabular-nums min-w-[3rem] text-right"
                        style={{ color: indScore > 0 ? `hsl(${color})` : "hsl(var(--muted-foreground))" }}
                      >
                        {indScore}/{indicator.maxScore}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIndicator && (
        <IndicatorDialog
          indicator={selectedIndicator}
          score={scores[selectedIndicator.id] || 0}
          onScoreChange={(v) => onScoreChange(selectedIndicator.id, v)}
          color={color}
          files={uploadedFiles[selectedIndicator.id] || []}
          onFilesChange={(files) => onFilesChange(selectedIndicator.id, files)}
          open={!!selectedIndicator}
          onOpenChange={(open) => { if (!open) setSelectedIndicator(null); }}
          onSave={onSave ? () => onSave(selectedIndicator.id) : undefined}
          implementationDetail={implementationDetails?.[selectedIndicator.id] || ""}
          onImplementationDetailChange={(v) => onImplementationDetailChange?.(selectedIndicator.id, v)}
          committeeScore={committeeScores?.[selectedIndicator.id] || 0}
          onCommitteeScoreChange={(v) => onCommitteeScoreChange?.(selectedIndicator.id, v)}
          committeeComment={committeeComments?.[selectedIndicator.id] || ""}
          onCommitteeCommentChange={(v) => onCommitteeCommentChange?.(selectedIndicator.id, v)}
          userRole={userRole}
        />
      )}
    </div>
  );
}
