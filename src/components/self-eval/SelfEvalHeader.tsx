import { ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  programName: string;
  categoryCount: number;
  topicCount: number;
  indicatorCount: number;
  grandTotal: number;
  grandMax: number;
  submitted: boolean;
  committeeTotal?: number;
}

export function SelfEvalHeader({
  programName,
  categoryCount,
  topicCount,
  indicatorCount,
  grandTotal,
  grandMax,
  submitted,
  committeeTotal,
}: Props) {
  const pct = grandMax > 0 ? Math.round((grandTotal / grandMax) * 100) : 0;
  const committeePct = committeeTotal !== undefined && grandMax > 0 ? Math.round((committeeTotal / grandMax) * 100) : null;

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">
              แบบประเมิน{programName ? ` — ${programName}` : ""}
            </h3>
            {submitted && (
              <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3" />
                ประเมินเสร็จสิ้น
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categoryCount} หมวด · {topicCount} ประเด็น · {indicatorCount} ตัวชี้วัด · คะแนนเต็ม {grandMax}
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">ประเมินตนเอง</p>
          <p className="text-2xl font-bold text-primary leading-none">
            {grandTotal}
            <span className="text-xs font-normal text-muted-foreground">/{grandMax}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{pct}%</p>
        </div>

        {committeeTotal !== undefined && (
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">กรรมการ</p>
            <p className="text-2xl font-bold text-emerald-600 leading-none">
              {committeeTotal}
              <span className="text-xs font-normal text-muted-foreground">/{grandMax}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{committeePct}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
