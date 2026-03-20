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
}

export function SelfEvalHeader({
  programName,
  categoryCount,
  topicCount,
  indicatorCount,
  grandTotal,
  grandMax,
  submitted,
}: Props) {
  const pct = grandMax > 0 ? Math.round((grandTotal / grandMax) * 100) : 0;

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">
              แบบประเมินตนเอง{programName ? ` — ${programName}` : ""}
            </h3>
            {submitted && (
              <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3" />
                ส่งแล้ว
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {categoryCount} หมวด · {topicCount} ประเด็น · {indicatorCount} ตัวชี้วัด · คะแนนเต็ม {grandMax}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground mb-0.5">คะแนนรวม (ประเมินตนเอง)</p>
        <p className="text-3xl font-bold text-primary leading-none">
          {grandTotal}
          <span className="text-sm font-normal text-muted-foreground">/{grandMax}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">{pct}%</p>
      </div>
    </div>
  );
}
