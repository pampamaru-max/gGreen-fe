import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ClipboardCheck, FileText, Upload, Trash2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

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
type Tab = "skeleton" | "spinners" | "upload" | "pageloading";

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

export default function LoadingPreviewPage() {
  const [tab, setTab] = useState<Tab>("spinners");
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
