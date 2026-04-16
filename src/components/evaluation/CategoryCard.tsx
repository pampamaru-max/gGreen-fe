import { useState, useRef, useEffect } from "react";
import { Category, ScoringCriterion } from "@/data/evaluationData";
import { ChevronDown, ChevronRight, ChevronLeft, Trash2, FileText, X, Eye, ListChecks, Plus, Info, Save, Loader2, AlignLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAX_FILE_SIZE } from "@/helpers/constants";

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

export interface IndicatorNavItem {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  color: string;
  isScored?: boolean;
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
  scoreView?: "self" | "committee";
  onIndicatorClick?: (indicator: Category["topics"][0]["indicators"][0]) => void;
  newIndicatorNotifs?: Map<string, { prevScore: number | null; newScore: number | null; isYesNo?: boolean }>;
  forceOpen?: boolean;
}

// ── Shared utility ────────────────────────────────────────────────────────────
function getScoreColor(s: number): string {
  if (s <= 1) return "0 72% 51%";
  if (s <= 3) return "30 60% 45%";
  return "142 60% 40%";
}

// ── Shared nav strip ──────────────────────────────────────────────────────────
function NavStrip({ navItems, currentNavIndex, onJumpTo }: {
  navItems: IndicatorNavItem[];
  currentNavIndex?: number;
  onJumpTo: (idx: number) => void;
}) {
  return (
    <div className="border-t bg-muted/10 px-4 py-2 shrink-0">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
        {navItems.map((item, idx) => {
          const isActive = idx === currentNavIndex;
          const hasScore = item.isScored ?? (item.score > 0);
          const shortLabel = item.name.match(/^[\d.]+/)?.[0] ?? item.name.slice(0, 5);
          return (
            <button
              key={item.id}
              onClick={() => onJumpTo(idx)}
              title={item.name}
              className="flex-shrink-0 rounded-md px-2 py-1 text-[0.6875rem] font-semibold transition-all border"
              style={
                isActive
                  ? { backgroundColor: `hsl(${item.color} / 0.18)`, borderColor: `hsl(${item.color} / 0.6)`, color: `hsl(${item.color})` }
                  : hasScore
                  ? { backgroundColor: `hsl(${item.color} / 0.06)`, borderColor: `hsl(${item.color} / 0.25)`, color: `hsl(${item.color})` }
                  : item.isScored === false
                  ? { backgroundColor: "hsl(38 92% 50% / 0.08)", borderColor: "hsl(38 92% 50% / 0.5)", borderStyle: "dashed", color: "hsl(38 70% 40%)" }
                  : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
              }
            >
              {shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Dialog สำหรับผู้ถูกประเมิน ─────────────────────────────────────────────────
function EvaluateeIndicatorDialog({
  indicator, score, onScoreChange, color, files, onFilesChange,
  open, onOpenChange, onSave, implementationDetail, onImplementationDetailChange,
  committeeScore, committeeComment,
  readOnly = false,
  hasPrev, hasNext, onPrev, onNext, progressLabel, navItems, currentNavIndex, onJumpTo,
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
  committeeComment?: string;
  readOnly?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  progressLabel?: string;
  navItems?: IndicatorNavItem[];
  currentNavIndex?: number;
  onJumpTo?: (index: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const criteria = indicator.scoringCriteria || [];
  const isWizardMode = hasPrev !== undefined || hasNext !== undefined;

  const doSave = async () => {
    if (onSave && !readOnly) { setSaving(true); await onSave(); setSaving(false); }
  };

  const handlePrevClick = async () => {
    await doSave();
    onPrev?.();
  };

  const handleNextClick = async () => {
    await doSave();
    onNext?.();
  };

  const handleJumpTo = async (idx: number) => {
    if (idx !== currentNavIndex) await doSave();
    onJumpTo?.(idx);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(selectedFiles)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`ไฟล์ ${file.name} ใหญ่เกิน 10MB`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", indicator.id);
        const { data } = await apiClient.post("evaluation/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        newFiles.push({ name: data.name ?? file.name, url: data.url, path: data.url });
      } catch {
        toast.error(`อัปโหลด ${file.name} ไม่สำเร็จ`);
      }
    }

    onFilesChange([...files, ...newFiles]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteFile = async (file: UploadedFile) => {
    try {
      await apiClient.delete("evaluation/files/delete", { data: { url: file.url } });
    } catch { /* ลบออกจาก UI ต่อไปแม้ลบจาก server ไม่สำเร็จ */ }
    onFilesChange(files.filter((f) => f.url !== file.url));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 pr-14 shrink-0" style={{ backgroundColor: `hsl(${color} / 0.06)` }}>
          <div className="flex items-start gap-3">
            <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: `hsl(${color})` }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <DialogTitle className="flex-1 text-base font-semibold text-foreground leading-snug text-left">{indicator.name}</DialogTitle>
                {indicator.description && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"><Info className="h-4 w-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="end" className="max-w-sm z-[9999]">
                        <div className="text-sm leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: indicator.description! }} />
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {progressLabel && <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 mt-0.5">{progressLabel}</span>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x overflow-hidden flex-1 min-h-0">
          {/* ซ้าย: รายละเอียด + เอกสาร (แก้ไขได้) */}
          <div className="overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
            {indicator.detail && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">รายละเอียดตัวชี้วัด</p>
                <div className="text-base font-medium text-foreground leading-relaxed bg-muted/30 rounded-md p-3 rich-content" dangerouslySetInnerHTML={{ __html: indicator.detail }} />
              </div>
            )}
            {indicator.evidenceDescription && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">หลักฐานอ้างอิง</p>
                <div className="text-sm text-foreground/70 bg-muted/30 border rounded-md p-3 leading-relaxed whitespace-pre-line">{indicator.evidenceDescription}</div>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">รายละเอียดการดำเนินการ</p>
              <textarea
                value={implementationDetail || ""}
                onChange={(e) => onImplementationDetailChange?.(e.target.value)}
                placeholder="ระบุรายละเอียดการดำเนินการ..."
                disabled={readOnly}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">เอกสารแนบ</p>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f) => (
                    <div key={f.path} className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-1.5 text-sm">
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
              {!readOnly && (
                <>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff" multiple className="hidden" onChange={handleFileUpload} />
                  <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 py-6 cursor-pointer hover:bg-muted/40 hover:border-muted-foreground/40 transition-colors">
                    <ListChecks className="h-6 w-6 text-muted-foreground/40 mb-1.5" />
                    <p className="text-xs text-muted-foreground text-center">รองรับ PDF, Word, Excel, PowerPoint และรูปภาพ (ไม่เกิน 10 MB)</p>
                    <p className="text-xs text-muted-foreground/70 text-center mb-2">ลากไฟล์มาวางหรือคลิกเพื่ออัปโหลด</p>
                    <button disabled={uploading} className="flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-md border bg-background text-foreground hover:bg-muted transition-colors">
                      <Plus className="h-3 w-3" />{uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ขวา: คะแนนจากการประเมินตนเอง */}
          <div className="overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
            {indicator.scoreType?.includes('yes_no') ? (
              /* ── Yes/No mode ── */
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ประเมินความสอดคล้อง</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[{ val: 1, label: 'สอดคล้อง', sub: 'ผ่านเกณฑ์', icon: '✓', color: 'emerald' }, { val: 0, label: 'ไม่สอดคล้อง', sub: 'ไม่ผ่านเกณฑ์', icon: '✗', color: 'rose' }].map(({ val, label, sub, icon, color }) => {
                      const isSelected = score === val;
                      const Tag = readOnly ? 'div' : 'button';
                      return (
                        <Tag key={val}
                          {...(!readOnly && { onClick: () => onScoreChange(isSelected ? -1 : val) })}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 text-center transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'} ${isSelected ? (color === 'emerald' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-border bg-muted/20 text-muted-foreground opacity-50'}`}>
                          <span className="text-2xl font-bold">{icon}</span>
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-xs">{sub}</span>
                        </Tag>
                      );
                    })}
                  </div>
                </div>

                {committeeScore !== undefined && (
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">กรรมการประเมินความสอดคล้อง</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ val: 1, label: 'สอดคล้อง', sub: 'ผ่านเกณฑ์', icon: '✓', color: 'emerald' }, { val: 0, label: 'ไม่สอดคล้อง', sub: 'ไม่ผ่านเกณฑ์', icon: '✗', color: 'rose' }].map(({ val, label, sub, icon, color }) => {
                        const isSelected = committeeScore === val;
                        return (
                          <div key={val} className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 text-center cursor-default ${isSelected ? (color === 'emerald' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-border bg-muted/20 text-muted-foreground opacity-40'}`}>
                            <span className="text-2xl font-bold">{icon}</span>
                            <span className="text-sm font-semibold">{label}</span>
                            <span className="text-xs">{sub}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ความเห็นกรรมการ</p>
                      <p className="text-sm text-foreground/70 bg-background border rounded-md px-3 py-2 min-h-[48px] whitespace-pre-line">
                        {committeeComment || <span className="text-muted-foreground italic">ยังไม่มีความเห็น</span>}
                      </p>
                    </div>
                  </div>
                )}

                {indicator.notes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">หมายเหตุเกณฑ์การให้คะแนน</p>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md p-3 leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: indicator.notes! }} />
                  </div>
                )}
              </>
            ) : (
              /* ── Normal score mode ── */
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">คะแนนจากการประเมินตนเอง</p>
                    <div>
                      <span className="text-xl font-bold" style={{ color: score > 0 ? `hsl(${getScoreColor(score)})` : "hsl(var(--muted-foreground))" }}>{score}</span>
                      <span className="text-sm text-muted-foreground">/{indicator.maxScore}</span>
                    </div>
                  </div>
                  {criteria.length > 0 ? (
                    <div className="space-y-1.5">
                      {criteria.map((c: ScoringCriterion) => (
                        readOnly ? (
                          <div key={c.score} className="flex items-start gap-3 w-full rounded-lg px-3 py-2.5 text-sm select-none cursor-default"
                            style={c.score === score ? { backgroundColor: `hsl(${getScoreColor(c.score)} / 0.12)`, border: `1.5px solid hsl(${getScoreColor(c.score)} / 0.4)` } : { backgroundColor: "hsl(var(--muted)/0.4)", border: "1.5px solid hsl(var(--border))", opacity: 0.5 }}>
                            <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold mt-0.5"
                              style={c.score === score ? { backgroundColor: `hsl(${getScoreColor(c.score)})`, color: "white" } : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                              {c.score}
                            </span>
                            <div className="leading-snug pt-1 rich-content" style={{ color: c.score === score ? `hsl(${getScoreColor(c.score)})` : "hsl(var(--muted-foreground))" }} dangerouslySetInnerHTML={{ __html: c.label }} />
                          </div>
                        ) : (
                          <button key={c.score} onClick={() => onScoreChange(c.score === score ? 0 : c.score)}
                            className="flex items-start gap-3 w-full text-left rounded-lg px-3 py-2.5 transition-all text-sm"
                            style={c.score === score ? { backgroundColor: `hsl(${getScoreColor(c.score)} / 0.12)`, border: `1.5px solid hsl(${getScoreColor(c.score)} / 0.4)` } : { backgroundColor: "transparent", border: "1.5px solid hsl(var(--border))" }}>
                            <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold mt-0.5"
                              style={c.score === score ? { backgroundColor: `hsl(${getScoreColor(c.score)})`, color: "white" } : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                              {c.score}
                            </span>
                            <div className="leading-snug pt-1 rich-content" style={{ color: c.score === score ? `hsl(${getScoreColor(c.score)})` : "hsl(var(--foreground))" }} dangerouslySetInnerHTML={{ __html: c.label }} />
                          </button>
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Array.from({ length: indicator.maxScore + 1 }, (_, i) => i).map((opt) => (
                        readOnly ? (
                          <div key={opt} className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold cursor-default select-none"
                            style={opt === score ? { backgroundColor: `hsl(${getScoreColor(opt)})`, color: "white" } : { backgroundColor: "hsl(var(--muted)/0.4)", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))", opacity: 0.5 }}>
                            {opt}
                          </div>
                        ) : (
                          <button key={opt} onClick={() => onScoreChange(opt === score ? 0 : opt)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-all"
                            style={opt === score ? { backgroundColor: `hsl(${getScoreColor(opt)})`, color: "white" } : { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }}>
                            {opt}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
                {indicator.notes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">หมายเหตุเกณฑ์การให้คะแนน</p>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md p-3 leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: indicator.notes! }} />
                  </div>
                )}
                {committeeScore !== undefined && (
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">คะแนนจากกรรมการ</p>
                      <div>
                        <span className="text-xl font-bold" style={{ color: committeeScore > 0 ? `hsl(${getScoreColor(committeeScore)})` : "hsl(var(--muted-foreground))" }}>{committeeScore}</span>
                        <span className="text-sm text-muted-foreground">/{indicator.maxScore}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ความเห็นกรรมการ</p>
                      <p className="text-sm text-foreground/70 bg-background border rounded-md px-3 py-2 min-h-[48px] whitespace-pre-line">
                        {committeeComment || <span className="text-muted-foreground italic">ยังไม่มีความเห็น</span>}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {navItems && navItems.length > 0 && <NavStrip navItems={navItems} currentNavIndex={currentNavIndex} onJumpTo={handleJumpTo} />}

        <div className="flex items-center gap-2 px-6 py-4 border-t bg-muted/20 shrink-0">
          {isWizardMode ? (
            <div className="flex items-center gap-2 flex-1">
              <Button variant="outline" size="sm" onClick={handlePrevClick} disabled={!hasPrev || saving}><ChevronLeft className="h-4 w-4 mr-1" />ก่อนหน้า</Button>
              <Button variant="outline" size="sm" onClick={handleNextClick} disabled={!hasNext || saving}>ถัดไป<ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          ) : <div className="flex-1" />}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{isWizardMode ? "ปิด" : "ยกเลิก"}</Button>
            {!readOnly && (
              <Button size="sm" disabled={saving} onClick={async () => { setSaving(true); if (onSave) await onSave(); setSaving(false); if (!isWizardMode) onOpenChange(false); }}>
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}บันทึก
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog สำหรับผู้ประเมิน ────────────────────────────────────────────────────
function EvaluatorIndicatorDialog({
  indicator, score, color, files,
  open, onOpenChange, onSave,
  implementationDetail,
  committeeScore, onCommitteeScoreChange,
  committeeComment, onCommitteeCommentChange,
  viewOnly = false,
  readOnly = false,
  hasPrev, hasNext, onPrev, onNext, progressLabel, navItems, currentNavIndex, onJumpTo,
}: {
  indicator: Category["topics"][0]["indicators"][0];
  score: number;
  color: string;
  files: UploadedFile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => Promise<void>;
  implementationDetail?: string;
  committeeScore?: number;
  onCommitteeScoreChange?: (score: number) => void;
  committeeComment?: string;
  onCommitteeCommentChange?: (value: string) => void;
  viewOnly?: boolean;
  readOnly?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  progressLabel?: string;
  navItems?: IndicatorNavItem[];
  currentNavIndex?: number;
  onJumpTo?: (index: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const criteria = indicator.scoringCriteria || [];
  const isWizardMode = hasPrev !== undefined || hasNext !== undefined;

  const doSave = async () => {
    if (onSave && !readOnly) { setSaving(true); await onSave(); setSaving(false); }
  };
  const handlePrevClick = async () => { await doSave(); onPrev?.(); };
  const handleNextClick = async () => { await doSave(); onNext?.(); };
  const handleJumpTo = async (idx: number) => { if (idx !== currentNavIndex) await doSave(); onJumpTo?.(idx); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 pr-14 shrink-0" style={{ backgroundColor: `hsl(${color} / 0.06)` }}>
          <div className="flex items-start gap-3">
            <span className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: `hsl(${color})` }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <DialogTitle className="flex-1 text-base font-semibold text-foreground leading-snug text-left">{indicator.name}</DialogTitle>
                {indicator.description && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"><Info className="h-4 w-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="end" className="max-w-sm z-[9999]">
                        <div className="text-sm leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: indicator.description! }} />
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {progressLabel && <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 mt-0.5">{progressLabel}</span>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x overflow-hidden flex-1 min-h-0">
          {/* ซ้าย: รายละเอียด + เอกสาร (ดูอย่างเดียว) */}
          <div className="overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
            {indicator.detail && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">รายละเอียดตัวชี้วัด</p>
                <div className="text-base font-medium text-foreground leading-relaxed bg-muted/30 rounded-md p-3 rich-content" dangerouslySetInnerHTML={{ __html: indicator.detail }} />
              </div>
            )}
            {indicator.evidenceDescription && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">หลักฐานอ้างอิง</p>
                <div className="text-sm text-foreground/70 bg-muted/30 border rounded-md p-3 leading-relaxed whitespace-pre-line">{indicator.evidenceDescription}</div>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">รายละเอียดการดำเนินการ</p>
              <div className="text-sm text-foreground/80 bg-muted/30 border rounded-md p-3 leading-relaxed whitespace-pre-line min-h-[80px]">
                {implementationDetail || <span className="text-muted-foreground italic">ไม่มีข้อมูล</span>}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">เอกสารแนบ</p>
              {files.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {files.map((f) => (
                    <div key={f.path} className="flex items-center gap-2 bg-muted/50 border rounded-lg px-3 py-1.5 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[180px]">{f.name}</span>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground"><Eye className="h-3.5 w-3.5" /></a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">ไม่มีเอกสารแนบ</p>
              )}
            </div>
          </div>

          {/* ขวา: คะแนนตนเอง (compact) + กรรมการให้คะแนน */}
          <div className="overflow-y-auto scrollbar-thin px-6 py-5 space-y-5">
            {indicator.scoreType?.includes('yes_no') ? (
              /* ── Yes/No mode ── */
              <>
                {/* Self yes/no — read-only display */}
                <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ผู้ถูกประเมินตนเอง</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ val: 1, label: 'สอดคล้อง', sub: 'ผ่านเกณฑ์', icon: '✓', color: 'emerald' }, { val: 0, label: 'ไม่สอดคล้อง', sub: 'ไม่ผ่านเกณฑ์', icon: '✗', color: 'rose' }].map(({ val, label, sub, icon, color }) => {
                      const isSelected = score === val;
                      return (
                        <div key={val} className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-3 text-center cursor-default ${isSelected ? (color === 'emerald' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-border bg-muted/20 text-muted-foreground opacity-40'}`}>
                          <span className="text-xl font-bold">{icon}</span>
                          <span className="text-sm font-semibold">{label}</span>
                          <span className="text-xs">{sub}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Committee yes/no — editable when !viewOnly, read-only when completed */}
                {(!viewOnly || committeeScore !== undefined) && (
                  <>
                    <div className="space-y-2" style={{ pointerEvents: (readOnly || viewOnly) ? "none" : undefined, opacity: (readOnly || viewOnly) ? 0.7 : undefined }}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">กรรมการประเมินความสอดคล้อง</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[{ val: 1, label: 'สอดคล้อง', sub: 'ผ่านเกณฑ์', icon: '✓', color: 'emerald' }, { val: 0, label: 'ไม่สอดคล้อง', sub: 'ไม่ผ่านเกณฑ์', icon: '✗', color: 'rose' }].map(({ val, label, sub, icon, color }) => {
                          const isSelected = committeeScore === val;
                          return (
                            <button key={val}
                              onClick={() => !viewOnly && onCommitteeScoreChange?.(isSelected ? -1 : val)}
                              className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 py-4 text-center ${viewOnly ? 'cursor-default' : 'cursor-pointer hover:shadow-sm'} transition-all ${isSelected ? (color === 'emerald' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-border bg-muted/20 text-muted-foreground opacity-40'}`}>
                              <span className="text-2xl font-bold">{icon}</span>
                              <span className="text-sm font-semibold">{label}</span>
                              <span className="text-xs">{sub}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5" style={{ pointerEvents: (readOnly || viewOnly) ? "none" : undefined, opacity: (readOnly || viewOnly) ? 0.7 : undefined }}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ความเห็นกรรมการ</p>
                      <textarea value={committeeComment || ""} onChange={(e) => onCommitteeCommentChange?.(e.target.value)} placeholder="ระบุความเห็นของกรรมการ..."
                        readOnly={viewOnly}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                    </div>
                  </>
                )}

                {indicator.notes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">หมายเหตุเกณฑ์การให้คะแนน</p>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md p-3 leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: indicator.notes! }} />
                  </div>
                )}
              </>
            ) : (
              /* ── Normal score mode ── */
              <>
                {/* Self score — compact read-only */}
                <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">คะแนนจากการประเมินตนเอง</p>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: score > 0 ? `hsl(${getScoreColor(score)} / 0.12)` : "hsl(var(--muted))", color: score > 0 ? `hsl(${getScoreColor(score)})` : "hsl(var(--muted-foreground))" }}>
                      {score}/{indicator.maxScore}
                    </span>
                  </div>
                  {criteria.length > 0 ? (
                    (() => {
                      const selected = criteria.find((c: ScoringCriterion) => c.score === score);
                      return selected ? (
                        <div className="flex items-start gap-2.5 rounded-md px-3 py-2 text-sm select-none"
                          style={{ backgroundColor: `hsl(${getScoreColor(selected.score)} / 0.08)`, border: `1px solid hsl(${getScoreColor(selected.score)} / 0.25)` }}>
                          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded text-xs font-bold mt-0.5"
                            style={{ backgroundColor: `hsl(${getScoreColor(selected.score)})`, color: "white" }}>
                            {selected.score}
                          </span>
                          <div className="leading-snug text-foreground/80 rich-content" dangerouslySetInnerHTML={{ __html: selected.label }} />
                        </div>
                      ) : <p className="text-xs text-muted-foreground italic">ยังไม่ได้ประเมิน</p>;
                    })()
                  ) : (
                    <div className="flex items-center gap-1.5 select-none">
                      {Array.from({ length: indicator.maxScore + 1 }, (_, i) => i).map((opt) => (
                        <div key={opt} className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold"
                          style={opt === score ? { backgroundColor: `hsl(${getScoreColor(opt)})`, color: "white" } : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Committee score — editable when !viewOnly, read-only when completed */}
                {(!viewOnly || committeeScore !== undefined) && <>
                <div className="space-y-2" style={{ pointerEvents: (readOnly || viewOnly) ? "none" : undefined, opacity: (readOnly || viewOnly) ? 0.7 : undefined }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ให้คะแนน</p>
                    <div>
                      {committeeScore !== undefined ? (
                        <span className="text-xl font-bold" style={{ color: committeeScore > 0 ? `hsl(${getScoreColor(committeeScore)})` : "hsl(var(--muted-foreground))" }}>{committeeScore}</span>
                      ) : (
                        <span className="text-sm font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">รอ</span>
                      )}
                      <span className="text-sm text-muted-foreground">/{indicator.maxScore}</span>
                    </div>
                  </div>
                  {criteria.length > 0 ? (
                    <div className="space-y-1.5">
                      {criteria.map((c: ScoringCriterion) => {
                        const effectiveScore = committeeScore ?? -1;
                        const isSelected = c.score === effectiveScore;
                        return (
                          <button key={`committee-${c.score}`}
                            onClick={() => onCommitteeScoreChange?.(isSelected ? 0 : c.score)}
                            className="flex items-start gap-3 w-full text-left rounded-lg px-3 py-2.5 transition-all text-sm"
                            style={isSelected ? { backgroundColor: `hsl(${getScoreColor(c.score)} / 0.12)`, border: `1.5px solid hsl(${getScoreColor(c.score)} / 0.4)` } : { backgroundColor: "transparent", border: "1.5px solid hsl(var(--border))" }}>
                            <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold mt-0.5"
                              style={isSelected ? { backgroundColor: `hsl(${getScoreColor(c.score)})`, color: "white" } : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                              {c.score}
                            </span>
                            <div className="leading-snug pt-1 rich-content" style={{ color: isSelected ? `hsl(${getScoreColor(c.score)})` : "hsl(var(--foreground))" }} dangerouslySetInnerHTML={{ __html: c.label }} />
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Array.from({ length: indicator.maxScore + 1 }, (_, i) => i).map((opt) => {
                        const effectiveScore = committeeScore ?? -1;
                        const isSelected = opt === effectiveScore;
                        return (
                          <button key={`committee-btn-${opt}`}
                            onClick={() => onCommitteeScoreChange?.(isSelected ? 0 : opt)}
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-all"
                            style={isSelected ? { backgroundColor: `hsl(${getScoreColor(opt)})`, color: "white" } : { backgroundColor: "transparent", color: "hsl(var(--muted-foreground))", border: "1.5px solid hsl(var(--border))" }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5" style={{ pointerEvents: (readOnly || viewOnly) ? "none" : undefined, opacity: (readOnly || viewOnly) ? 0.7 : undefined }}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ความเห็นกรรมการ</p>
                  <textarea value={committeeComment || ""} onChange={(e) => onCommitteeCommentChange?.(e.target.value)} placeholder="ระบุความเห็นของกรรมการ..."
                    readOnly={viewOnly}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                </div>
                </>}

                {indicator.notes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">หมายเหตุเกณฑ์การให้คะแนน</p>
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-md p-3 leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: indicator.notes! }} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {navItems && navItems.length > 0 && <NavStrip navItems={navItems} currentNavIndex={currentNavIndex} onJumpTo={handleJumpTo} />}

        <div className="flex items-center gap-2 px-6 py-4 border-t bg-muted/20 shrink-0">
          {isWizardMode ? (
            <div className="flex items-center gap-2 flex-1">
              <Button variant="outline" size="sm" onClick={handlePrevClick} disabled={!hasPrev || saving}><ChevronLeft className="h-4 w-4 mr-1" />ก่อนหน้า</Button>
              <Button variant="outline" size="sm" onClick={handleNextClick} disabled={!hasNext || saving}>ถัดไป<ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          ) : <div className="flex-1" />}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{isWizardMode ? "ปิด" : "ยกเลิก"}</Button>
            {!readOnly && (
              <Button size="sm" disabled={saving} onClick={async () => { setSaving(true); if (onSave) await onSave(); setSaving(false); if (!isWizardMode) onOpenChange(false); }}>
                {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}บันทึก
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Public wrapper — เลือก dialog ตาม role ────────────────────────────────────
export function IndicatorDialog({
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
  readOnly = false,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  progressLabel,
  navItems,
  currentNavIndex,
  onJumpTo,
  viewOnly,
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
  viewOnly?: boolean;
  readOnly?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  progressLabel?: string;
  navItems?: IndicatorNavItem[];
  currentNavIndex?: number;
  onJumpTo?: (index: number) => void;
}) {
  if (userRole === 'user') {
    return (
      <EvaluateeIndicatorDialog
        indicator={indicator}
        score={score}
        onScoreChange={onScoreChange!}
        color={color}
        files={files}
        onFilesChange={onFilesChange}
        open={open}
        onOpenChange={onOpenChange}
        onSave={onSave}
        implementationDetail={implementationDetail}
        onImplementationDetailChange={onImplementationDetailChange}
        committeeScore={committeeScore}
        committeeComment={committeeComment}
        readOnly={readOnly}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onPrev={onPrev}
        onNext={onNext}
        progressLabel={progressLabel}
        navItems={navItems}
        currentNavIndex={currentNavIndex}
        onJumpTo={onJumpTo}
      />
    );
  }
  return (
    <EvaluatorIndicatorDialog
      indicator={indicator}
      score={score}
      color={color}
      files={files}
      open={open}
      onOpenChange={onOpenChange}
      onSave={onSave}
      implementationDetail={implementationDetail}
      committeeScore={committeeScore}
      onCommitteeScoreChange={onCommitteeScoreChange}
      committeeComment={committeeComment}
      onCommitteeCommentChange={onCommitteeCommentChange}
      viewOnly={viewOnly}
      readOnly={readOnly}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPrev={onPrev}
      onNext={onNext}
      progressLabel={progressLabel}
      navItems={navItems}
      currentNavIndex={currentNavIndex}
      onJumpTo={onJumpTo}
    />
  );
}

export function CategoryCard({ category, colorIndex, scores, onScoreChange, onDelete, uploadedFiles, onFilesChange, onSave, implementationDetails, onImplementationDetailChange, committeeScores, onCommitteeScoreChange, committeeComments, onCommitteeCommentChange, userRole, scoreView, onIndicatorClick, newIndicatorNotifs, forceOpen }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);
  const [selectedIndicator, setSelectedIndicator] = useState<Category["topics"][0]["indicators"][0] | null>(null);
  const color = categoryColors[colorIndex % categoryColors.length];

  const displayScores = scoreView === "committee" && committeeScores ? committeeScores : scores;

  const isYesNoCat = category.scoreType?.includes('yes_no');

  const hasNewInCategory = newIndicatorNotifs
    ? category.topics.some((t) => t.indicators.some((i) => newIndicatorNotifs.has(i.id)))
    : false;
  const totalScore = category.topics.reduce(
    (sum, t) => sum + t.indicators.reduce((s, i) => s + (displayScores[i.id] || 0), 0),
    0
  );
  const totalMax = category.topics.reduce(
    (sum, t) => sum + t.indicators.reduce((s, i) => s + i.maxScore, 0),
    0
  );
  const totalIndicators = isYesNoCat ? category.topics.reduce((s, t) => s + t.indicators.length, 0) : 0;
  const passCount = isYesNoCat ? category.topics.reduce(
    (sum, t) => sum + t.indicators.reduce((s, i) => s + ((displayScores[i.id] ?? -1) === 1 ? 1 : 0), 0),
    0
  ) : 0;
  const totalIndCount = category.topics.reduce((s, t) => s + t.indicators.length, 0);
  const filledCount = isYesNoCat
    ? category.topics.reduce((sum, t) => sum + t.indicators.reduce((s, i) => s + ((displayScores[i.id] ?? -1) !== -1 ? 1 : 0), 0), 0)
    : category.topics.reduce((sum, t) => sum + t.indicators.reduce((s, i) => s + ((displayScores[i.id] ?? 0) > 0 ? 1 : 0), 0), 0);
  const fillPct = totalIndCount > 0 ? (filledCount / totalIndCount) * 100 : 0;
  const fillColor = filledCount === totalIndCount && totalIndCount > 0 ? "#059669" : `hsl(${color})`;

  return (
    <div id={`cat-${category.id}`} className="rounded-xl border bg-card overflow-hidden shadow-sm">
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
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{category.name}</p>
            {hasNewInCategory && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[0.625rem] font-bold bg-red-500 text-white leading-none">
                ใหม่
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {category.topics.length} ประเด็น · {category.topics.reduce((s, t) => s + t.indicators.length, 0)} ตัวชี้วัด{isYesNoCat ? "" : ` · คะแนนเต็ม ${category.maxScore}`}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${fillPct}%`, backgroundColor: fillColor }} />
            </div>
            <span className="text-[0.625rem] font-medium" style={{ color: fillColor }}>
              {filledCount}/{totalIndCount}
            </span>
          </div>
        </div>
        <div className="text-right mr-2">
          {isYesNoCat ? (
            <p className="text-lg font-bold" style={{ color: `hsl(${color})` }}>
              {passCount}<span className="text-xs font-normal text-muted-foreground">/{totalIndicators} ผ่าน</span>
            </p>
          ) : (
            <p className="text-lg font-bold" style={{ color: `hsl(${color})` }}>
              {totalScore}<span className="text-xs font-normal text-muted-foreground">/{totalMax}</span>
            </p>
          )}
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
                  const selfScore = scores[indicator.id] ?? 0;
                  const cScore = committeeScores?.[indicator.id];
                  const fileCount = (uploadedFiles[indicator.id] || []).length;
                  const isCommitteeMode = scoreView === "committee";
                  const notif = newIndicatorNotifs?.get(indicator.id);
                  const isYesNo = indicator.scoreType?.includes('yes_no');
                  const formatScore = (v: number | null) => {
                    if (v === null || v === undefined) return '–';
                    if (isYesNo) return v === 1 ? 'ผ่าน' : 'ไม่ผ่าน';
                    return String(v);
                  };
                  return (
                    <button
                      key={indicator.id}
                      onClick={() => {
                        if (onIndicatorClick) {
                          onIndicatorClick(indicator);
                        } else {
                          setSelectedIndicator(indicator);
                        }
                      }}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      <span className="flex-1 text-sm text-foreground truncate">{indicator.name}</span>
                      {implementationDetails?.[indicator.id] && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded bg-blue-50 text-blue-500 border border-blue-100 shrink-0">
                          <AlignLeft className="h-3 w-3" />
                        </span>
                      )}
                      {committeeComments?.[indicator.id] && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded bg-teal-50 text-teal-500 border border-teal-100 shrink-0">
                          <MessageSquare className="h-3 w-3" />
                        </span>
                      )}
                      {fileCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                          {fileCount}
                        </span>
                      )}
                      {isCommitteeMode ? (
                        <div className="flex items-center gap-2 shrink-0">
                          {/* คะแนนตนเอง */}
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {selfScore}/{indicator.maxScore}
                          </span>
                          <span className="text-muted-foreground/40">→</span>
                          {/* คะแนนกรรมการ */}
                          {cScore !== undefined && cScore !== -1 ? (
                            <span
                              className="text-sm font-bold tabular-nums min-w-[3rem] text-right"
                              style={{ color: isYesNo ? (cScore === 1 ? "hsl(142 60% 40%)" : "hsl(0 72% 51%)") : `hsl(${color})` }}
                            >
                              {isYesNo ? (cScore === 1 ? "ผ่าน" : "ไม่ผ่าน") : `${cScore}/${indicator.maxScore}`}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 min-w-[3rem] text-center">
                              รอ
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className="text-sm font-bold tabular-nums min-w-[3rem] text-right"
                          style={{ color: selfScore > 0 ? `hsl(${color})` : "hsl(var(--muted-foreground))" }}
                        >
                          {selfScore}/{indicator.maxScore}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Internal dialog — only used when no external onIndicatorClick (non-wizard mode) */}
      {!onIndicatorClick && selectedIndicator && (
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
          committeeScore={committeeScores?.[selectedIndicator.id]}
          onCommitteeScoreChange={(v) => onCommitteeScoreChange?.(selectedIndicator.id, v)}
          committeeComment={committeeComments?.[selectedIndicator.id] || ""}
          onCommitteeCommentChange={(v) => onCommitteeCommentChange?.(selectedIndicator.id, v)}
          userRole={userRole}
        />
      )}
    </div>
  );
}
