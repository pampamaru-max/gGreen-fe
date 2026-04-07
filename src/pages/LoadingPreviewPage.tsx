import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, Upload, Trash2, AlertCircle, Loader2, CheckCircle2, ArrowLeft, RotateCcw, XCircle, Trophy, Medal, Award, Star } from "lucide-react";
import { ScoreSummary as ScoreSummaryA } from "@/components/ScoreSummary";
import { ScoreSummary as ScoreSummaryB } from "@/components/evaluation/ScoreSummary";
import { ScoringLevelBadges } from "@/components/self-eval/ScoringLevelBadges";
import type { ScoringLevel } from "@/pages/ProjectRegistration";

type Variant = "pulse" | "shimmer" | "wave";

// ─── Skeletons ────────────────────────────────────────────────────────────────

function HomePageSkeleton({ v }: { v: Variant }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <Skeleton variant={v} className="h-12 w-12 rounded-xl" />
            <Skeleton variant={v} className="h-4 w-24" />
            <Skeleton variant={v} className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProgramDetailSkeleton({ v }: { v: Variant }) {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton variant={v} className="h-9 w-28" />
      <div className="rounded-2xl border p-8" style={{ backgroundColor: "#dfe8e6" }}>
        <div className="flex items-center gap-4">
          <Skeleton variant={v} className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton variant={v} className="h-8 w-48" />
            <Skeleton variant={v} className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant={v} className="h-10 w-72" />
        <Card>
          <CardHeader><Skeleton variant={v} className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant={v} className={`h-4 ${["w-full","w-full","w-3/4","w-full","w-5/6"][i]}`} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EvaluateeHomeSkeleton({ v }: { v: Variant }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Skeleton variant={v} className="h-10 w-10 rounded-xl" />
          <Skeleton variant={v} className="h-6 w-48" />
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b">
              <Skeleton variant={v} className="h-10 w-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton variant={v} className="h-5 w-48" />
                <Skeleton variant={v} className="h-3 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 border-b">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton variant={v} className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton variant={v} className="h-2.5 w-12" />
                    <Skeleton variant={v} className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Skeleton variant={v} className="h-10 w-10 rounded-xl" />
          <Skeleton variant={v} className="h-6 w-36" />
        </div>
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableHead key={i}><Skeleton variant={v} className="h-3 w-16 mx-auto" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j} className="text-center">
                      <Skeleton variant={v} className="h-4 w-20 mx-auto" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function EvaluationPageSkeleton({ v }: { v: Variant }) {
  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shrink-0">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <Skeleton variant={v} className="h-5 w-28" />
            <Skeleton variant={v} className="h-3 w-52" />
          </div>
        </div>
      </div>
      <div className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant={v} className="h-10 w-full rounded-md" />
          ))}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {["#", "ชื่อหน่วยงาน", "โครงการ", "ปี", "จังหวัด", "ประเมินตนเอง", "กรรมการ", "คะแนน", ""].map((h, i) => (
                  <TableHead key={i}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant={v} className="h-4 w-6 mx-auto" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-4 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-6 w-20 mx-auto rounded-full" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-4 w-4 mx-auto" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-4 w-14 mx-auto" /></TableCell>
                  <TableCell><Skeleton variant={v} className="h-8 w-8 mx-auto rounded-md" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─── Spinner components ───────────────────────────────────────────────────────

function DotsRing() {
  return (
    <div className="sp-dots-ring">
      {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
    </div>
  );
}
function BounceDots() {
  return <div className="sp-bounce"><span /><span /><span /></div>;
}
function RingSpinner() {
  return <div className="sp-ring" />;
}
function DualRing() {
  return <div className="sp-dual-ring" />;
}
function Ripple() {
  return <div className="sp-ripple"><span /><span /></div>;
}
function Bars() {
  return <div className="sp-bars"><span /><span /><span /><span /><span /></div>;
}
function Orbit() {
  return (
    <div className="sp-orbit">
      <div className="sp-orbit-center" />
      <div className="sp-orbit-dot" />
    </div>
  );
}
function FlipSquare() {
  return <div className="sp-flip" />;
}
function PingPulse() {
  return (
    <div className="sp-ping">
      <span />
      <span className="absolute inset-0 rounded-full bg-accent" />
    </div>
  );
}
function Diamond() {
  return <div className="sp-diamond" />;
}

const SPINNERS = [
  { key: "dots-ring",   label: "Dots Ring",    Component: DotsRing },
  { key: "bounce",      label: "Bounce Dots",  Component: BounceDots },
  { key: "ring",        label: "Ring",         Component: RingSpinner },
  { key: "dual-ring",   label: "Dual Ring",    Component: DualRing },
  { key: "ripple",      label: "Ripple",       Component: Ripple },
  { key: "bars",        label: "Bars",         Component: Bars },
  { key: "orbit",       label: "Orbit",        Component: Orbit },
  { key: "flip",        label: "Flip Square",  Component: FlipSquare },
  { key: "ping",        label: "Ping Pulse",   Component: PingPulse },
  { key: "diamond",     label: "Diamond",      Component: Diamond },
];

function SpinnerShowcase() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {SPINNERS.map(({ key, label, Component }) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-background p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <Component />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGES = [
  { key: "home",       label: "หน้าหลัก" },
  { key: "program",    label: "รายละเอียดโครงการ" },
  { key: "evaluatee",  label: "หน้าประเมิน (ผู้เข้าร่วม)" },
  { key: "evaluation", label: "หน้าประเมิน (admin)" },
] as const;

type PageKey = (typeof PAGES)[number]["key"];
type Tab = "skeleton" | "spinners" | "upload" | "pageloading" | "score-summary";

// ─── Upload Loading Showcase ──────────────────────────────────────────────────

const FAKE_DOCS = [
  { id: "1", name: "นโยบายสิ่งแวดล้อมขององค์กร", required: true },
  { id: "2", name: "แผนผังองค์กรและรายชื่อคณะทำงาน", required: true },
  { id: "3", name: "รายงานการใช้พลังงานและทรัพยากร", required: true },
];

// แบบ 1 — Progress bar
function UploadStyleProgressBar() {
  const [states, setStates] = useState<Record<string, { progress: number; done: boolean; uploading: boolean }>>({});

  function startUpload(id: string) {
    setStates((p) => ({ ...p, [id]: { progress: 0, done: false, uploading: true } }));
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 18 + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        setStates((p) => ({ ...p, [id]: { progress: 100, done: true, uploading: false } }));
      } else {
        setStates((p) => ({ ...p, [id]: { progress: pct, done: false, uploading: true } }));
      }
    }, 120);
  }

  function reset(id: string) {
    setStates((p) => { const n = { ...p }; delete n[id]; return n; });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3 max-w-lg">
      {FAKE_DOCS.map((doc, idx) => {
        const s = states[doc.id];
        return (
          <div key={doc.id} className="border rounded-lg p-3 space-y-2 bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">{idx + 1}.</span>
              <span className="text-sm font-medium">{doc.name}</span>
              {doc.required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">จำเป็น</Badge>}
            </div>
            {s?.uploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />กำลังอัปโหลด...</span>
                  <span>{Math.round(s.progress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-150"
                    style={{ width: `${s.progress}%` }}
                  />
                </div>
              </div>
            )}
            {s?.done && (
              <div className="flex items-center justify-between bg-emerald-50 rounded-md px-3 py-2 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-700 font-medium">เอกสาร_{doc.id}.pdf</span>
                </div>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => reset(doc.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {!s && (
              <div>
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => startUpload(doc.id)}>
                  <Upload className="h-3.5 w-3.5 mr-1" />อัปโหลดไฟล์
                </Button>
                {doc.required && (
                  <span className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />ยังไม่ได้แนบเอกสาร
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// แบบ 2 — Skeleton row แทนที่ปุ่ม
function UploadStyleSkeleton() {
  const [states, setStates] = useState<Record<string, { done: boolean; uploading: boolean }>>({});

  function startUpload(id: string) {
    setStates((p) => ({ ...p, [id]: { done: false, uploading: true } }));
    setTimeout(() => {
      setStates((p) => ({ ...p, [id]: { done: true, uploading: false } }));
    }, 2200);
  }

  function reset(id: string) {
    setStates((p) => { const n = { ...p }; delete n[id]; return n; });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3 max-w-lg">
      {FAKE_DOCS.map((doc, idx) => {
        const s = states[doc.id];
        return (
          <div key={doc.id} className="border rounded-lg p-3 space-y-2 bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">{idx + 1}.</span>
              <span className="text-sm font-medium">{doc.name}</span>
              {doc.required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">จำเป็น</Badge>}
            </div>
            {s?.uploading && (
              <div className="flex items-center gap-3 bg-muted/40 rounded-md px-3 py-2.5 border border-dashed border-border animate-pulse">
                <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            )}
            {s?.done && (
              <div className="flex items-center justify-between bg-emerald-50 rounded-md px-3 py-2 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-700 font-medium">เอกสาร_{doc.id}.pdf</span>
                </div>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => reset(doc.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {!s && (
              <div>
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => startUpload(doc.id)}>
                  <Upload className="h-3.5 w-3.5 mr-1" />อัปโหลดไฟล์
                </Button>
                {doc.required && (
                  <span className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />ยังไม่ได้แนบเอกสาร
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// แบบ 3 — สีพื้นหลัง + spinner ใหญ่ overlay
function UploadStyleOverlay() {
  const [states, setStates] = useState<Record<string, { done: boolean; uploading: boolean }>>({});

  function startUpload(id: string) {
    setStates((p) => ({ ...p, [id]: { done: false, uploading: true } }));
    setTimeout(() => {
      setStates((p) => ({ ...p, [id]: { done: true, uploading: false } }));
    }, 2000);
  }

  function reset(id: string) {
    setStates((p) => { const n = { ...p }; delete n[id]; return n; });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3 max-w-lg">
      {FAKE_DOCS.map((doc, idx) => {
        const s = states[doc.id];
        return (
          <div key={doc.id} className={`border rounded-lg p-3 space-y-2 relative overflow-hidden transition-colors duration-300 ${s?.uploading ? "bg-accent/5 border-accent/30" : "bg-background"}`}>
            {/* overlay shimmer ขณะ upload */}
            {s?.uploading && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/10 to-transparent animate-[shimmer_1.2s_ease-in-out_infinite]" />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground">{idx + 1}.</span>
              <span className="text-sm font-medium">{doc.name}</span>
              {doc.required && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">จำเป็น</Badge>}
            </div>
            {s?.uploading && (
              <div className="flex items-center gap-3 py-1">
                <div className="sp-ring !w-6 !h-6 !border-2" style={{ borderColor: "hsl(165 60% 40% / 0.2)", borderTopColor: "hsl(165 60% 40%)" }} />
                <span className="text-sm text-accent font-medium">กำลังอัปโหลด...</span>
              </div>
            )}
            {s?.done && (
              <div className="flex items-center justify-between bg-emerald-50 rounded-md px-3 py-2 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-700 font-medium">เอกสาร_{doc.id}.pdf</span>
                </div>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => reset(doc.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {!s && (
              <div>
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => startUpload(doc.id)}>
                  <Upload className="h-3.5 w-3.5 mr-1" />อัปโหลดไฟล์
                </Button>
                {doc.required && (
                  <span className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />ยังไม่ได้แนบเอกสาร
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page Loading Overlay ─────────────────────────────────────────────────────

function PageLoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm rounded-xl">
      <div className="relative flex items-center justify-center">
        {/* outer ring pulse */}
        <div className="absolute h-16 w-16 rounded-full border-2 border-accent/20 animate-ping" />
        {/* orbit spinner */}
        <div className="sp-orbit !w-12 !h-12">
          <div className="sp-orbit-center !w-3 !h-3" style={{ margin: "-6px" }} />
          <div className="sp-orbit-dot !w-3 !h-3" style={{ margin: "-6px" }} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">กำลังโหลด</p>
        <p className="text-xs text-muted-foreground mt-0.5">กรุณารอสักครู่...</p>
      </div>
    </div>
  );
}

function PageLoadingShowcase() {
  const [showing, setShowing] = useState(false);

  function trigger() {
    setShowing(true);
    setTimeout(() => setShowing(false), 3000);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">กด "จำลอง" เพื่อดู overlay — จะหายเองใน 3 วิ</p>

      {/* mock page content ด้านหลัง */}
      <div className="relative rounded-xl border bg-background overflow-hidden" style={{ minHeight: 420 }}>
        <PageLoadingOverlay show={showing} />

        {/* fake page content */}
        <div className="border-b bg-card/50 px-6 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold">ประเมิน G-Green</p>
            <p className="text-xs text-muted-foreground">รายการหน่วยงานที่ผ่านการคัดเลือก</p>
          </div>
        </div>
        <div className="p-6 space-y-3 pointer-events-none select-none">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-muted/60" />
            ))}
          </div>
          <div className="rounded-md border overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 grid grid-cols-6 gap-4 text-xs font-medium text-muted-foreground">
              {["#", "ชื่อหน่วยงาน", "โครงการ", "จังหวัด", "สถานะ", "จัดการ"].map((h) => <span key={h}>{h}</span>)}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 grid grid-cols-6 gap-4 border-t">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-3 rounded bg-muted/60" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={trigger} disabled={showing}>
        {showing ? "กำลังโหลด..." : "จำลอง Page Loading"}
      </Button>
    </div>
  );
}

function UploadShowcase() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="font-semibold text-sm">แบบ 1 — Progress Bar</p>
          <p className="text-xs text-muted-foreground">แสดง % และ bar วิ่ง</p>
        </div>
        <UploadStyleProgressBar />
      </div>
      <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="font-semibold text-sm">แบบ 2 — Skeleton Row</p>
          <p className="text-xs text-muted-foreground">ปุ่มหายไป แสดง skeleton แทน</p>
        </div>
        <UploadStyleSkeleton />
      </div>
      <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="font-semibold text-sm">แบบ 3 — Overlay + Spinner</p>
          <p className="text-xs text-muted-foreground">พื้นเขียว + shimmer วิ่ง + spinner</p>
        </div>
        <UploadStyleOverlay />
      </div>
    </div>
  );
}

// ─── Score Summary Showcase ───────────────────────────────────────────────────

// Mock data สำหรับ Component A (src/components/ScoreSummary.tsx)
// ใช้ใน /register/evaluate (ProjectRegistration) — committeeScore อยู่ใน item เดียวกัน
const MOCK_A_SCORE = [
  { id: 1, name: "หมวด 1", score: 23, maxScore: 25, totalPossible: 25, committeeScore: 15 },
  { id: 2, name: "หมวด 2", score: 13, maxScore: 15, totalPossible: 15, committeeScore: 7  },
  { id: 3, name: "หมวด 3", score: 14, maxScore: 15, totalPossible: 15, committeeScore: 8  },
];
const MOCK_A_YESNO = [
  { id: 1, name: "หมวด 1", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 10, passCount: 8,  committeePassCount: 6 },
  { id: 2, name: "หมวด 2", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 8,  passCount: 7,  committeePassCount: 4 },
  { id: 3, name: "หมวด 3", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 6,  passCount: 5,  committeePassCount: 3 },
];

// Mock data สำหรับ Component B (src/components/evaluation/ScoreSummary.tsx)
// ใช้ใน /evaluation/[id] (EvaluationByProgramPage) — committeeData เป็น array แยก
const MOCK_B_SELF_SCORE = [
  { id: 1, name: "หมวด 1", score: 23, maxScore: 25, totalPossible: 25 },
  { id: 2, name: "หมวด 2", score: 13, maxScore: 15, totalPossible: 15 },
  { id: 3, name: "หมวด 3", score: 14, maxScore: 15, totalPossible: 15 },
];
const MOCK_B_COMMITTEE_SCORE = [
  { id: 1, name: "หมวด 1", score: 15, maxScore: 25, totalPossible: 25 },
  { id: 2, name: "หมวด 2", score: 7,  maxScore: 15, totalPossible: 15 },
  { id: 3, name: "หมวด 3", score: 8,  maxScore: 15, totalPossible: 15 },
];
const MOCK_B_SELF_YESNO = [
  { id: 1, name: "หมวด 1", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 10, passCount: 8 },
  { id: 2, name: "หมวด 2", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 8,  passCount: 7 },
  { id: 3, name: "หมวด 3", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 6,  passCount: 5 },
];
const MOCK_B_COMMITTEE_YESNO = [
  { id: 1, name: "หมวด 1", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 10, passCount: 6 },
  { id: 2, name: "หมวด 2", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 8,  passCount: 4 },
  { id: 3, name: "หมวด 3", score: 0, maxScore: 0, totalPossible: 0, scoreType: "yes_no", totalIndicators: 6,  passCount: 3 },
];

// Mock scoring levels (ทอง/เงิน/ทองแดง/ไม่ผ่าน)
const MOCK_SCORING_LEVELS: ScoringLevel[] = [
  { id: 1, name: "ทอง",    minScore: 80, maxScore: 100, color: "#F59E0B", icon: "Trophy", sortOrder: 1 },
  { id: 2, name: "เงิน",   minScore: 70, maxScore: 79,  color: "#94A3B8", icon: "Medal",  sortOrder: 2 },
  { id: 3, name: "ทองแดง", minScore: 60, maxScore: 69,  color: "#F97316", icon: "Award",  sortOrder: 3 },
  { id: 4, name: "ไม่ผ่าน", minScore: 0,  maxScore: 59,  color: "#EF4444", icon: "Star",   sortOrder: 4 },
];

// ─── Shared mock header for both pages ───────────────────────────────────────

/** Header แบบ self-eval (user) — ใช้ใน /register/evaluate */
function MockHeaderSelf({ grandMax, selfTotal, isYesNo }: { grandMax: number; selfTotal: number; isYesNo?: boolean }) {
  return (
    <div className="border-b bg-card/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <ClipboardCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0" />
        <div className="text-right shrink-0">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">คะแนนรวม</p>
          <p className="text-base font-bold text-primary leading-tight">
            {isYesNo ? `${selfTotal} ผ่าน` : selfTotal}
            <span className="text-xs font-normal text-muted-foreground">/{grandMax}</span>
          </p>
          {!isYesNo && <p className="text-[9px] text-muted-foreground">{grandMax > 0 ? Math.round((selfTotal / grandMax) * 100) : 0}%</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5 ml-[40px]">
        <h2 className="text-sm font-bold w-full">Green Hotel</h2>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">ประเมินใหม่</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">รอผู้ประเมิน</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted/60 text-muted-foreground">พ.ศ. 2568</span>
        <span className="text-[11px] text-muted-foreground">3 หมวด · 3 ประเด็น · 11 ตัวชี้วัด{!isYesNo && ` · คะแนนเต็ม ${grandMax}`}</span>
      </div>
    </div>
  );
}

/** Header แบบ committee (admin) — ใช้ใน /evaluation/[id] */
function MockHeaderCommittee({ grandMax, selfTotal, committeeTotal, isYesNo }: { grandMax: number; selfTotal: number; committeeTotal: number; isYesNo?: boolean }) {
  const selfPct = grandMax > 0 ? Math.round((selfTotal / grandMax) * 100) : 0;
  const committeePct = grandMax > 0 ? Math.round((committeeTotal / grandMax) * 100) : 0;
  const currentLevel = [...MOCK_SCORING_LEVELS].reverse().find(l => committeePct >= l.minScore && committeePct <= l.maxScore);
  return (
    <div className="border-b bg-card/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <ClipboardCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0" />
        {/* Scores + badge + actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">ตนเอง</p>
            <p className="text-base font-bold text-muted-foreground leading-tight">
              {isYesNo ? `${selfTotal} ผ่าน` : selfTotal}
              <span className="text-xs font-normal text-muted-foreground">/{grandMax}</span>
            </p>
          </div>
          <div className="w-px h-7 bg-border" />
          {!isYesNo && currentLevel && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs shrink-0"
              style={{ borderColor: `${currentLevel.color}60`, backgroundColor: `${currentLevel.color}10`, color: currentLevel.color }}>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <div className="leading-tight">
                <p className="font-semibold">{currentLevel.name}</p>
                <p className="opacity-70">{currentLevel.minScore}–{currentLevel.maxScore}%</p>
              </div>
            </div>
          )}
          {isYesNo && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs shrink-0 border-rose-400 bg-rose-50 text-rose-700">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <div className="leading-tight">
                <p className="font-semibold">ไม่สอดคล้อง</p>
                <p className="opacity-70">{committeePct}%</p>
              </div>
            </div>
          )}
          <div className="text-right">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">กรรมการ</p>
            <p className="text-base font-bold text-primary leading-tight">
              {isYesNo ? `${committeeTotal} ผ่าน` : committeeTotal}
              <span className="text-xs font-normal text-muted-foreground">/{grandMax}</span>
            </p>
            {!isYesNo && <p className="text-[9px] text-muted-foreground">{committeePct}%</p>}
          </div>
          <div className="w-px h-7 bg-border" />
          <Button variant="outline" size="sm" className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 h-8 px-2 text-xs shrink-0">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ส่งกลับ</span>
          </Button>
          <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white h-8 px-2 text-xs shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ยืนยันผล</span>
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5 ml-[40px]">
        <h2 className="text-sm font-bold w-full">Green Hotel</h2>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">ประเมินใหม่</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">รอผู้ประเมิน</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted/60 text-muted-foreground">พ.ศ. 2568</span>
        <span className="text-[11px] text-muted-foreground">3 หมวด · 3 ประเด็น · 11 ตัวชี้วัด{!isYesNo && ` · คะแนนเต็ม ${grandMax}`}</span>
      </div>
    </div>
  );
}

/** Level strip — ใต้ header ทั้ง 2 หน้า */
function MockLevelStrip({ grandMax, currentScore, isYesNo }: { grandMax: number; currentScore: number; isYesNo?: boolean }) {
  const allPass = isYesNo && currentScore === grandMax;
  return (
    <div className="px-4 py-2 border-b bg-card/30 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex-1 min-w-0">
        {isYesNo ? (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${allPass ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-700"}`}>
            {allPass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {allPass ? "สอดคล้อง" : "ไม่สอดคล้อง"}
          </div>
        ) : (
          <ScoringLevelBadges levels={MOCK_SCORING_LEVELS} grandMax={grandMax} currentScore={currentScore} />
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {isYesNo ? "วิธีคำนวณ (สอดคล้อง)" : "วิธีคำนวณ (คะแนน)"}
        </p>
        {!isYesNo && <p className="text-[10px] font-bold text-red-600">*คำนวนแบบคะแนนไม่เต็มหมวด</p>}
        {isYesNo && <p className="text-[10px] font-bold text-red-600">*ต้องสอดคล้องครบทุกข้อ</p>}
      </div>
    </div>
  );
}

// ─── Redesigned components (score type) ──────────────────────────────────────

const LEVEL_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy, Medal, Award, Star,
};

/** Level strip ที่ active level โดดเด่น — gradient + glow */
function RedesignedLevelStrip({ grandMax, currentScore }: { grandMax: number; currentScore: number }) {
  const pct = grandMax > 0 ? Math.round((currentScore / grandMax) * 100) : 0;
  const activeLevel = [...MOCK_SCORING_LEVELS].reverse().find(l => pct >= l.minScore && pct <= l.maxScore);
  const others = MOCK_SCORING_LEVELS.filter(l => l.id !== activeLevel?.id);

  return (
    <div className="px-4 py-2.5 border-b bg-card/30 flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        {/* Active level — big & glowing */}
        {activeLevel && (() => {
          const IconComp = LEVEL_ICON_MAP[activeLevel.icon] ?? Trophy;
          return (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-white font-bold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${activeLevel.color}cc 0%, ${activeLevel.color} 100%)`,
                boxShadow: `0 4px 14px ${activeLevel.color}50`,
              }}
            >
              <IconComp className="h-4 w-4 shrink-0" />
              <span className="text-sm">{activeLevel.name}</span>
              <span className="text-[11px] font-normal opacity-85">({activeLevel.minScore}–{activeLevel.maxScore}%)</span>
            </div>
          );
        })()}
        {/* Inactive levels — muted small pills */}
        {others.map(level => {
          const IconComp = LEVEL_ICON_MAP[level.icon] ?? Trophy;
          return (
            <div
              key={level.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border"
              style={{ borderColor: `${level.color}25`, color: `${level.color}60` }}
            >
              <IconComp className="h-3 w-3 shrink-0" />
              <span>{level.name}</span>
              <span className="opacity-70">({level.minScore}–{level.maxScore}%)</span>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">วิธีคำนวณ (คะแนน)</p>
        <p className="text-[10px] font-bold text-red-600">*คำนวนแบบคะแนนไม่เต็มหมวด</p>
      </div>
    </div>
  );
}

type BtnStyle = "amber-green" | "neutral" | "primary";
type CardStyle = "blue" | "brand" | "multi" | "minimal";

const CARD_TOP_COLORS: Record<CardStyle, (idx: number) => React.CSSProperties> = {
  blue:    () => ({ background: "linear-gradient(to right, #1E40AF, #60A5FA)" }),
  brand:   () => ({ background: "linear-gradient(to right, #0D9488, #5EEAD4)" }),
  multi:   (i) => ([
    { background: "linear-gradient(to right, #2563EB, #60A5FA)" },
    { background: "linear-gradient(to right, #7C3AED, #A78BFA)" },
    { background: "linear-gradient(to right, #059669, #34D399)" },
  ][i % 3]),
  minimal: () => ({}),
};

function RedesignedHeaderCommittee({ grandMax, selfTotal, committeeTotal, btnStyle = "amber-green" }: {
  grandMax: number; selfTotal: number; committeeTotal: number; btnStyle?: BtnStyle;
}) {
  const selfPct = grandMax > 0 ? Math.round((selfTotal / grandMax) * 100) : 0;
  const committeePct = grandMax > 0 ? Math.round((committeeTotal / grandMax) * 100) : 0;

  const ReturnBtn = () => {
    if (btnStyle === "neutral")
      return (
        <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs shrink-0 text-muted-foreground border-border hover:bg-muted">
          <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">ส่งกลับ</span>
        </Button>
      );
    if (btnStyle === "primary")
      return (
        <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 text-xs shrink-0 text-muted-foreground hover:bg-muted">
          <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">ส่งกลับ</span>
        </Button>
      );
    return (
      <Button variant="outline" size="sm" className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50 h-8 px-2 text-xs shrink-0">
        <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">ส่งกลับ</span>
      </Button>
    );
  };

  const ConfirmBtn = () => {
    if (btnStyle === "neutral")
      return (
        <Button variant="outline" size="sm" className="gap-1 h-8 px-2 text-xs shrink-0 border-foreground/30 hover:bg-foreground/5">
          <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">ยืนยันผล</span>
        </Button>
      );
    if (btnStyle === "primary")
      return (
        <Button size="sm" className="gap-1 h-8 px-2 text-xs shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">ยืนยันผล</span>
        </Button>
      );
    return (
      <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white h-8 px-2 text-xs shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">ยืนยันผล</span>
      </Button>
    );
  };

  return (
    <div className="border-b bg-card/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <ClipboardCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">ตนเอง</p>
            <p className="text-base font-bold text-muted-foreground leading-tight">
              {selfTotal}<span className="text-xs font-normal">/{grandMax}</span>
            </p>
            <p className="text-[9px] text-muted-foreground">{selfPct}%</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-right">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">กรรมการ</p>
            <p className="text-base font-bold text-primary leading-tight">
              {committeeTotal}<span className="text-xs font-normal text-muted-foreground">/{grandMax}</span>
            </p>
            <p className="text-[9px] text-muted-foreground">{committeePct}%</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <ReturnBtn />
          <ConfirmBtn />
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5 ml-[40px]">
        <h2 className="text-sm font-bold w-full">Green Hotel</h2>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">ประเมินใหม่</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">รอผู้ประเมิน</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted/60 text-muted-foreground">พ.ศ. 2568</span>
        <span className="text-[11px] text-muted-foreground">3 หมวด · 3 ประเด็น · 11 ตัวชี้วัด · คะแนนเต็ม {grandMax}</span>
      </div>
    </div>
  );
}

function RedesignedScoreCard({ name, idx, selfScore, totalPossible, committeeScore, cardStyle = "blue" }: {
  name: string; idx: number; selfScore: number; totalPossible: number; committeeScore?: number; cardStyle?: CardStyle;
}) {
  const selfPct = totalPossible > 0 ? Math.round((selfScore / totalPossible) * 100) : 0;
  const committeePct = committeeScore !== undefined && totalPossible > 0
    ? Math.round((committeeScore / totalPossible) * 100) : 0;
  const topStyle = CARD_TOP_COLORS[cardStyle](idx);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-white border shadow-sm hover:shadow-md transition-shadow ${cardStyle === "minimal" ? "border-l-4" : ""}`}
      style={cardStyle === "minimal" ? { borderLeftColor: ["#2563EB","#7C3AED","#059669"][idx % 3] } : {}}>
      {cardStyle !== "minimal" && <div className="h-1.5 w-full" style={topStyle} />}
      <div className="p-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">หมวดที่ {idx + 1}</p>
        <p className="text-sm font-bold text-foreground mt-0.5 mb-4 leading-tight">{name}</p>

        <div className="space-y-1.5">
          {committeeScore !== undefined && (
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#3B82F6" }}>ประเมินตนเอง</p>
          )}
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-foreground leading-none">{selfScore}</span>
            <span className="text-sm font-medium text-muted-foreground">/{totalPossible}</span>
            <span className="ml-auto text-sm font-bold" style={{ color: "#2563EB" }}>{selfPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#DBEAFE" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${selfPct}%`, background: "linear-gradient(to right, #60A5FA, #1D4ED8)" }} />
          </div>
        </div>

        {committeeScore !== undefined && (
          <>
            <div className="my-3 border-t border-dashed border-border/60" />
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#0F766E" }}>กรรมการ</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground leading-none">{committeeScore}</span>
                <span className="text-sm font-medium text-muted-foreground">/{totalPossible}</span>
                <span className="ml-auto text-sm font-bold" style={{ color: "#0F766E" }}>{committeePct}%</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#CCFBF1" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${committeePct}%`, background: "linear-gradient(to right, #2DD4BF, #0F766E)" }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// grandMax = 55 (25+15+15), selfTotal = 50
const REDESIGN_PRESETS = [
  { key: "fail",   label: "ไม่ผ่าน", pct: "45%",  cats: [{ s:23, c:11 }, { s:13, c:7  }, { s:14, c:7  }] },
  { key: "bronze", label: "ทองแดง", pct: "64%",  cats: [{ s:23, c:16 }, { s:13, c:10 }, { s:14, c:9  }] },
  { key: "silver", label: "เงิน",   pct: "73%",  cats: [{ s:23, c:18 }, { s:13, c:12 }, { s:14, c:10 }] },
  { key: "gold",   label: "ทอง",    pct: "91%",  cats: [{ s:23, c:23 }, { s:13, c:13 }, { s:14, c:14 }] },
] as const;

const BTN_STYLE_OPTIONS: { key: BtnStyle; label: string; desc: string }[] = [
  { key: "amber-green", label: "Amber + Green",  desc: "ส่งกลับ amber / ยืนยัน green (ปัจจุบัน)" },
  { key: "neutral",     label: "Neutral",        desc: "ทั้งคู่ outline สีเทา" },
  { key: "primary",     label: "Ghost + Primary", desc: "ส่งกลับ ghost / ยืนยัน primary" },
];

const CARD_STYLE_OPTIONS: { key: CardStyle; label: string; desc: string }[] = [
  { key: "blue",    label: "Blue",     desc: "gradient น้ำเงิน (ปัจจุบัน)" },
  { key: "brand",   label: "Brand",    desc: "gradient teal (สีแบรนด์)" },
  { key: "multi",   label: "Multi",    desc: "แต่ละหมวดสีต่างกัน" },
  { key: "minimal", label: "Minimal",  desc: "border ซ้าย ไม่มีบาร์บน" },
];

function RedesignShowcase() {
  const [presetKey, setPresetKey] = useState<"fail"|"bronze"|"silver"|"gold">("gold");
  const [btnStyle, setBtnStyle] = useState<BtnStyle>("amber-green");
  const [cardStyle, setCardStyle] = useState<CardStyle>("blue");
  const preset = REDESIGN_PRESETS.find(p => p.key === presetKey)!;

  const grandMax = 55;
  const selfTotal = preset.cats.reduce((s, c) => s + c.s, 0);
  const committeeTotal = preset.cats.reduce((s, c) => s + c.c, 0);
  const selfData = MOCK_B_SELF_SCORE.map((cat, i) => ({ ...cat, score: preset.cats[i].s }));
  const committeeData = MOCK_B_SELF_SCORE.map((cat, i) => ({ ...cat, score: preset.cats[i].c }));

  return (
    <div className="space-y-4">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/40 rounded-xl border">

        {/* Score preset */}
        <div className="space-y-1.5 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">จำลองคะแนน</p>
          <div className="flex flex-wrap gap-1.5">
            {REDESIGN_PRESETS.map(p => {
              const level = MOCK_SCORING_LEVELS.find(l => l.name === p.label);
              const isActive = p.key === presetKey;
              return (
                <button key={p.key} onClick={() => setPresetKey(p.key)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={isActive && level ? {
                    background: `linear-gradient(135deg, ${level.color}cc, ${level.color})`,
                    borderColor: level.color, color: "#fff",
                    boxShadow: `0 2px 8px ${level.color}50`,
                  } : { borderColor: level ? `${level.color}40` : undefined, color: level ? `${level.color}90` : undefined }}>
                  {p.label} <span className="opacity-75">{p.pct}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-px bg-border hidden sm:block" />

        {/* Card style */}
        <div className="space-y-1.5 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">สีบาร์หมวด</p>
          <div className="flex flex-wrap gap-1.5">
            {CARD_STYLE_OPTIONS.map(o => (
              <button key={o.key} onClick={() => setCardStyle(o.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${cardStyle === o.key ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40"}`}
                title={o.desc}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px bg-border hidden sm:block" />

        {/* Button style */}
        <div className="space-y-1.5 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">สไตล์ปุ่ม</p>
          <div className="flex flex-wrap gap-1.5">
            {BTN_STYLE_OPTIONS.map(o => (
              <button key={o.key} onClick={() => setBtnStyle(o.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${btnStyle === o.key ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground/40"}`}
                title={o.desc}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-xl border bg-background overflow-hidden">
        <RedesignedHeaderCommittee grandMax={grandMax} selfTotal={selfTotal} committeeTotal={committeeTotal} btnStyle={btnStyle} />
        <RedesignedLevelStrip grandMax={grandMax} currentScore={committeeTotal} />
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selfData.map((cat, idx) => (
              <RedesignedScoreCard key={cat.id} idx={idx} name={cat.name}
                selfScore={cat.score} totalPossible={cat.totalPossible}
                committeeScore={committeeData[idx]?.score} cardStyle={cardStyle} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">{label}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ScoreSummaryShowcase() {
  // totals for score type
  const grandMax = MOCK_B_SELF_SCORE.reduce((s, c) => s + c.totalPossible, 0);
  const selfTotal = MOCK_B_SELF_SCORE.reduce((s, c) => s + c.score, 0);
  const committeeTotal = MOCK_B_COMMITTEE_SCORE.reduce((s, c) => s + c.score, 0);
  // totals for yes_no type
  const yesNoMax = MOCK_B_SELF_YESNO.reduce((s, c) => s + (c.totalIndicators ?? 0), 0);
  const yesNoSelf = MOCK_B_SELF_YESNO.reduce((s, c) => s + (c.passCount ?? 0), 0);
  const yesNoCommittee = MOCK_B_COMMITTEE_YESNO.reduce((s, c) => s + (c.passCount ?? 0), 0);

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted-foreground">
        แสดง component จริงทั้ง 2 ตัว × 2 score type — แก้ไขที่ไฟล์ component เพื่อเห็นผลทันที
      </p>

      {/* ═══════════════ Component A ═══════════════ */}
      <Divider label="Component A — src/components/ScoreSummary.tsx — ใช้ใน /register/evaluate" />

      {/* A: score */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">แบบ score (คะแนนตัวเลข)</p>
        <div className="rounded-xl border bg-background overflow-hidden">
          <MockHeaderSelf grandMax={grandMax} selfTotal={selfTotal} />
          <MockLevelStrip grandMax={grandMax} currentScore={selfTotal} />
          <div className="px-4 py-4">
            <ScoreSummaryA data={MOCK_A_SCORE} />
          </div>
        </div>
      </div>

      {/* A: yes_no */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">แบบ yes_no (ผ่าน/ไม่ผ่าน)</p>
        <div className="rounded-xl border bg-background overflow-hidden">
          <MockHeaderSelf grandMax={yesNoMax} selfTotal={yesNoSelf} isYesNo />
          <MockLevelStrip grandMax={yesNoMax} currentScore={yesNoSelf} isYesNo />
          <div className="px-4 py-4">
            <ScoreSummaryA data={MOCK_A_YESNO} />
          </div>
        </div>
      </div>

      {/* ═══════════════ Component B ═══════════════ */}
      <Divider label="Component B — src/components/evaluation/ScoreSummary.tsx — ใช้ใน /evaluation/[id]" />

      {/* B: score + committee */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">แบบ score (คะแนนตัวเลข) — มีกรรมการ</p>
        <div className="rounded-xl border bg-background overflow-hidden">
          <MockHeaderCommittee grandMax={grandMax} selfTotal={selfTotal} committeeTotal={committeeTotal} />
          <MockLevelStrip grandMax={grandMax} currentScore={committeeTotal} />
          <div className="px-6 py-6">
            <ScoreSummaryB data={MOCK_B_SELF_SCORE} committeeData={MOCK_B_COMMITTEE_SCORE} />
          </div>
        </div>
      </div>

      {/* ═══════════════ Redesign v1 ═══════════════ */}
      <Divider label="✨ Redesign v1 — score + committee (Component B)" />
      <RedesignShowcase />

      {/* B: score self only */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">แบบ score (คะแนนตัวเลข) — ไม่มีกรรมการ (self-eval เท่านั้น)</p>
        <div className="rounded-xl border bg-background overflow-hidden">
          <MockHeaderCommittee grandMax={grandMax} selfTotal={selfTotal} committeeTotal={0} />
          <MockLevelStrip grandMax={grandMax} currentScore={0} />
          <div className="px-6 py-6">
            <ScoreSummaryB data={MOCK_B_SELF_SCORE} />
          </div>
        </div>
      </div>

      {/* B: yes_no + committee */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">แบบ yes_no (ผ่าน/ไม่ผ่าน) — มีกรรมการ</p>
        <div className="rounded-xl border bg-background overflow-hidden">
          <MockHeaderCommittee grandMax={yesNoMax} selfTotal={yesNoSelf} committeeTotal={yesNoCommittee} isYesNo />
          <MockLevelStrip grandMax={yesNoMax} currentScore={yesNoCommittee} isYesNo />
          <div className="px-6 py-6">
            <ScoreSummaryB data={MOCK_B_SELF_YESNO} committeeData={MOCK_B_COMMITTEE_YESNO} />
          </div>
        </div>
      </div>

      {/* B: yes_no self only */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">แบบ yes_no (ผ่าน/ไม่ผ่าน) — ไม่มีกรรมการ</p>
        <div className="rounded-xl border bg-background overflow-hidden">
          <MockHeaderCommittee grandMax={yesNoMax} selfTotal={yesNoSelf} committeeTotal={0} isYesNo />
          <MockLevelStrip grandMax={yesNoMax} currentScore={0} isYesNo />
          <div className="px-6 py-6">
            <ScoreSummaryB data={MOCK_B_SELF_YESNO} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoadingPreviewPage() {
  const [tab, setTab] = useState<Tab>("score-summary");
  const [page, setPage] = useState<PageKey>("home");
  const [variant, setVariant] = useState<Variant>("wave");

  return (
    <div className="min-h-full bg-muted/30 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loading Preview</h1>
        <p className="text-sm text-muted-foreground mt-1">ตัวอย่าง loading animation ทุกรูปแบบ</p>
      </div>

      {/* Main tab */}
      <div className="flex gap-2 border-b pb-3">
        <Button size="sm" variant={tab === "spinners" ? "default" : "ghost"} onClick={() => setTab("spinners")}>
          Spinners
        </Button>
        <Button size="sm" variant={tab === "skeleton" ? "default" : "ghost"} onClick={() => setTab("skeleton")}>
          Skeleton
        </Button>
        <Button size="sm" variant={tab === "upload" ? "default" : "ghost"} onClick={() => setTab("upload")}>
          Upload Loading
        </Button>
        <Button size="sm" variant={tab === "pageloading" ? "default" : "ghost"} onClick={() => setTab("pageloading")}>
          Page Loading
        </Button>
        <Button size="sm" variant={tab === "score-summary" ? "default" : "ghost"} onClick={() => setTab("score-summary")}>
          Score Summary
        </Button>
      </div>

      {tab === "pageloading" && (
        <div className="space-y-4">
          <PageLoadingShowcase />
        </div>
      )}

      {tab === "upload" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary">ใช้จริงในระบบ</Badge>
            <span className="text-sm text-muted-foreground">กดปุ่ม "อัปโหลดไฟล์" เพื่อดู animation — กดลบเพื่อ reset</span>
          </div>
          <div className="space-y-3">
            <div className="space-y-0.5">
              <p className="font-semibold text-sm">แบบ 1 — Progress Bar</p>
              <p className="text-xs text-muted-foreground">แสดง % และ bar วิ่ง</p>
            </div>
            <UploadStyleProgressBar />
          </div>
        </div>
      )}

      {tab === "score-summary" && (
        <div className="space-y-4">
          <ScoreSummaryShowcase />
        </div>
      )}

      {tab === "spinners" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Spinner 10 แบบ — pure CSS ไม่มี library เพิ่ม</p>
          <SpinnerShowcase />
        </div>
      )}

      {tab === "skeleton" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">หน้า</p>
              <div className="flex flex-wrap gap-2">
                {PAGES.map((p) => (
                  <Button key={p.key} size="sm" variant={page === p.key ? "default" : "outline"} onClick={() => setPage(p.key)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Animation</p>
              <div className="flex gap-2">
                <Button size="sm" variant={variant === "pulse" ? "default" : "outline"} onClick={() => setVariant("pulse")}>Pulse</Button>
                <Button size="sm" variant={variant === "shimmer" ? "default" : "outline"} onClick={() => setVariant("shimmer")}>Shimmer ✨</Button>
                <Button size="sm" variant={variant === "wave" ? "default" : "outline"} onClick={() => setVariant("wave")}>Green Wave 🌊</Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{PAGES.find((p) => p.key === page)?.label}</Badge>
            <Badge variant={variant === "wave" ? "default" : variant === "shimmer" ? "secondary" : "outline"}>{variant}</Badge>
          </div>
          <div className="bg-background rounded-xl border p-6 shadow-sm">
            {page === "home"       && <HomePageSkeleton       v={variant} />}
            {page === "program"    && <ProgramDetailSkeleton  v={variant} />}
            {page === "evaluatee"  && <EvaluateeHomeSkeleton  v={variant} />}
            {page === "evaluation" && <EvaluationPageSkeleton v={variant} />}
          </div>
        </div>
      )}
    </div>
  );
}
