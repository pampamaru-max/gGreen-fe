import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FilePlus,
  RefreshCw,
  TrendingUp,
  Loader2,
  Calendar,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import apiClient from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface Eligibility {
  canNew: boolean;
  canRenew: boolean;
  canUpgrade: boolean;
  expiryDate?: string | null;
  renewalDeadline?: string | null;
  scoringLevelName?: string | null;
}

interface EvaluationTypeDialogProps {
  open: boolean;
  onClose: () => void;
  programId: string;
  usedYears?: number[];
}

interface TypeOption {
  key: "new" | "renew" | "upgrade";
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  disabledReason?: string;
}

export default function EvaluationTypeDialog({
  open,
  onClose,
  programId,
  usedYears = [],
}: EvaluationTypeDialogProps) {
  const navigate = useNavigate();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"type" | "year">("type");
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list = [];
    for (let i = 0; i <= 10; i++) {
      list.push(currentYear - i);
    }
    return list.filter((y) => !usedYears.includes(y));
  }, [currentYear, usedYears]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("type");
      setSelectedYear(null);
      return;
    }
    if (!programId) return;
    setLoading(true);
    apiClient
      .get(`evaluation/eligibility?programId=${programId}`)
      .then(({ data }) => {
        // ถ้า API ยังไม่มี route นี้หรือ return null → ถือว่าผู้ใช้ใหม่
        if (!data || typeof data.canNew !== "boolean") {
          setEligibility({ canNew: true, canRenew: false, canUpgrade: false });
        } else {
          setEligibility(data);
        }
      })
      .catch(() =>
        setEligibility({ canNew: true, canRenew: false, canUpgrade: false }),
      )
      .finally(() => setLoading(false));
  }, [open, programId, currentYear]);

  const options: TypeOption[] = [
    {
      key: "new",
      icon: <FilePlus className="h-6 w-6" />,
      label: "ประเมินใหม่",
      description: "สำหรับหน่วยงานที่ยังไม่เคยประเมินในโปรแกรมนี้",
      enabled: eligibility?.canNew ?? false,
      disabledReason: "ต้องไม่มีประวัติการประเมินก่อน",
    },
    {
      key: "renew",
      icon: <RefreshCw className="h-6 w-6" />,
      label: "ต่ออายุใบประกาศนียบัตร",
      description: eligibility?.expiryDate
        ? `ใบรับรองหมดอายุแล้ว ต่ออายุได้ถึง ${new Date(eligibility.renewalDeadline!).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`
        : "สำหรับหน่วยงานที่ใบรับรองหมดอายุแล้วและยังอยู่ในช่วงต่ออายุ",
      enabled: eligibility?.canRenew ?? false,
      disabledReason: "ต้องประเมินใหม่ก่อน หรือยังไม่ถึงเวลาต่ออายุ",
    },
    {
      key: "upgrade",
      icon: <TrendingUp className="h-6 w-6" />,
      label: "ยกระดับคะแนน",
      description: eligibility?.scoringLevelName
        ? `ระดับปัจจุบัน: ${eligibility.scoringLevelName} — ยกระดับเพื่อรับการรับรองสูงขึ้น`
        : "สำหรับหน่วยงานระดับ Gold ที่ต้องการยกระดับและใบรับรองยังไม่หมดอายุ",
      enabled: eligibility?.canUpgrade ?? false,
      disabledReason: "ต้องมีผลประเมินระดับ Gold และใบรับรองยังไม่หมดอายุ",
    },
  ];

  const handleSelect = (key: TypeOption["key"]) => {
    if (key === "new") {
      setStep("year");
    } else {
      onClose();
      navigate(`/register/evaluate?type=${key}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === "year" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setStep("type")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-lg font-bold">
              {step === "type"
                ? "เลือกประเภทการประเมิน"
                : "เลือกปีที่ต้องการประเมิน"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : step === "type" ? (
          <div className="flex flex-col gap-3 py-2">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => opt.enabled && handleSelect(opt.key)}
                disabled={!opt.enabled}
                className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                  opt.enabled
                    ? "border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer"
                    : "border-slate-100 bg-white cursor-not-allowed opacity-50"
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                    opt.enabled
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <p
                    className={`font-semibold ${
                      opt.enabled ? "text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {opt.enabled ? opt.description : opt.disabledReason}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-slate-500">
              กรุณาเลือกปีงบประมาณที่ต้องการเริ่มประเมินใหม่
            </p>
            {usedYears.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">
                  <span className="font-bold">ไม่สามารถเลือกปีที่มีใบประเมินอยู่แล้วได้</span>
                  <br />
                  ปีที่ถูกใช้แล้ว: {usedYears.map((y) => `พ.ศ. ${y + 543}`).join(", ")}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Select onValueChange={(val) => setSelectedYear(Number(val))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกปี" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      ปี {y + 543} {y === currentYear ? "(ปีปัจจุบัน)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                disabled={!selectedYear}
                onClick={() => {
                  onClose();
                  navigate(`/register/evaluate?type=new&year=${selectedYear}`);
                }}
              >
                ยืนยัน
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
