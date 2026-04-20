import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FilePlus,
  RefreshCw,
  TrendingUp,
  Loader2,
  ArrowLeft,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// TODO: ใช้ interface นี้เมื่อเปิด eligibility check กลับมา
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
  colors: {
    border: string;
    bg: string;
    hover: string;
    iconBg: string;
    iconText: string;
    text: string;
    shadow: string;
  };
}

interface YearPickerStepProps {
  years: number[];
  currentYear: number;
  selectedYear: number | null;
  setSelectedYear: (y: number | null) => void;
  usedYears: number[];
  selectedType: TypeOption["key"] | null;
  onConfirm: () => void;
}

function YearPickerStep({
  years,
  currentYear,
  selectedYear,
  setSelectedYear,
  usedYears,
  selectedType,
  onConfirm,
}: YearPickerStepProps) {
  return (
    <div className="flex flex-col gap-3 py-2">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        กรุณาเลือกปีงบประมาณที่ต้องการประเมิน
      </p>

      {usedYears.length > 0 && selectedType === "new" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/40 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 text-xs text-red-600 dark:text-red-400 leading-relaxed whitespace-normal">
            <span className="font-bold block mb-1">ไม่สามารถเลือกปีที่มีใบประเมินอยู่แล้วได้</span>
            ปีที่ถูกใช้แล้ว: {usedYears.map((y) => `พ.ศ. ${y + 543}`).join(", ")}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Select
          value={selectedYear ? String(selectedYear) : undefined}
          onValueChange={(val) => setSelectedYear(parseInt(val))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="เลือกปี" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[300px]">
            {years.map((y) => {
              const isUsed = usedYears.includes(y);

              return (
                <SelectItem
                  key={y}
                  value={String(y)}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <span>ปี {y + 543} {y === currentYear ? "(ปีปัจจุบัน)" : ""}</span>
                    {isUsed && (
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-100 shrink-0">
                        ใช้แล้ว
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button disabled={!selectedYear} onClick={onConfirm}>
          ยืนยัน
        </Button>
      </div>
    </div>
  );
}


export default function EvaluationTypeDialog({
  open,
  onClose,
  programId,
  usedYears = [],
}: EvaluationTypeDialogProps) {
  const navigate = useNavigate();
  // TODO: ใช้ eligibility เพื่อควบคุมสิทธิ์การเลือกประเภทการประเมินในอนาคต
  // const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"type" | "year">("type");
  const [selectedType, setSelectedType] = useState<TypeOption["key"] | null>(null);
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list = [];
    // แสดงปีปัจจุบันและย้อนหลัง 15 ปี
    for (let i = 0; i <= 15; i++) {
      list.push(currentYear - i);
    }
    return list;
  }, [currentYear]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("type");
      setSelectedYear(null);
      setSelectedType(null);
      return;
    }
    // TODO: เปิดใช้งาน eligibility check เมื่อพร้อม
    // if (!programId) return;
    // setLoading(true);
    // apiClient
    //   .get(`evaluation/eligibility?programId=${programId}`)
    //   .then(({ data }) => {
    //     // ถ้า API ยังไม่มี route นี้หรือ return null → ถือว่าผู้ใช้ใหม่
    //     if (!data || typeof data.canNew !== "boolean") {
    //       setEligibility({ canNew: true, canRenew: false, canUpgrade: false });
    //     } else {
    //       setEligibility(data);
    //     }
    //   })
    //   .catch(() =>
    //     setEligibility({ canNew: true, canRenew: false, canUpgrade: false }),
    //   )
    //   .finally(() => setLoading(false));
  }, [open, programId, currentYear]);

  // TODO: เปิดใช้งาน eligibility เพื่อควบคุมสิทธิ์แต่ละประเภทในอนาคต
  const options: TypeOption[] = [
    {
      key: "new",
      icon: <FilePlus className="h-6 w-6" />,
      label: "ขอการรับรองใหม่",
      description: "สำหรับหน่วยงานที่ยังไม่เคยประเมินในโปรแกรมนี้",
      enabled: true, // eligibility?.canNew ?? false,
      disabledReason: "ต้องไม่มีประวัติการประเมินก่อน",
      colors: {
        border: "border-blue-200 dark:border-blue-800",
        bg: "bg-blue-50/50 dark:bg-blue-900/20",
        hover: "hover:bg-blue-100/80 dark:hover:bg-blue-900/40",
        iconBg: "bg-blue-500",
        iconText: "text-white",
        text: "text-blue-700 dark:text-blue-300",
        shadow: "shadow-blue-100 dark:shadow-blue-900/40",
      },
    },
    {
      key: "upgrade",
      icon: <RefreshCw className="h-6 w-6" />,
      label: "ขอยกระดับการรับรอง",
      description: "สำหรับหน่วยงานระดับ Gold ที่ใบรับรองยังไม่หมดอายุและต้องการยกระดับ",
      // description: eligibility?.scoringLevelName
      //   ? `ระดับปัจจุบัน: ${eligibility.scoringLevelName} — ยกระดับเพื่อรับการรับรองสูงขึ้น`
      //   : "สำหรับหน่วยงานระดับ Gold ที่ต้องการยกระดับและใบรับรองยังไม่หมดอายุ",
      enabled: true, // eligibility?.canUpgrade ?? false,
      disabledReason: "ต้องมีผลประเมินระดับ Gold และใบรับรองยังไม่หมดอายุ",
      colors: {
        border: "border-orange-200 dark:border-orange-800",
        bg: "bg-orange-50/50 dark:bg-orange-900/20",
        hover: "hover:bg-orange-100/80 dark:hover:bg-orange-900/40",
        iconBg: "bg-orange-400",
        iconText: "text-white",
        text: "text-orange-700 dark:text-orange-300",
        shadow: "shadow-orange-100 dark:shadow-orange-900/40",
      },
    },
    {
      key: "renew",
      icon: <TrendingUp className="h-6 w-6" />,
      label: "ขอต่ออายุการรับรอง",
      description: "สำหรับหน่วยงานที่ใบรับรองหมดอายุแล้วและยังอยู่ในช่วงต่ออายุ",
      // description: eligibility?.expiryDate
      //   ? `ใบรับรองหมดอายุแล้ว ต่ออายุได้ถึง ${new Date(eligibility.renewalDeadline!).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`
      //   : "สำหรับหน่วยงานที่ใบรับรองหมดอายุแล้วและยังอยู่ในช่วงต่ออายุ",
      enabled: true, // eligibility?.canRenew ?? false,
      disabledReason: "ต้องประเมินใหม่ก่อน หรือยังไม่ถึงเวลาต่ออายุ",
      colors: {
        border: "border-purple-200 dark:border-purple-800",
        bg: "bg-purple-50/50 dark:bg-purple-900/20",
        hover: "hover:bg-purple-100/80 dark:hover:bg-purple-900/40",
        iconBg: "bg-purple-500",
        iconText: "text-white",
        text: "text-purple-700 dark:text-purple-300",
        shadow: "shadow-purple-100 dark:shadow-purple-900/40",
      },
    },
  ];

  const handleSelect = (key: TypeOption["key"]) => {
    setSelectedType(key);
    setStep("year");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md p-4 sm:p-6 overflow-hidden">
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
          <div className="flex flex-col gap-4 py-2 px-1">
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => opt.enabled && handleSelect(opt.key)}
                disabled={!opt.enabled}
                className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 ${
                  opt.enabled
                    ? `${opt.colors.border} ${opt.colors.bg} ${opt.colors.hover} ${opt.colors.shadow} shadow-lg cursor-pointer hover:-translate-y-1`
                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-not-allowed opacity-50 shadow-none"
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    opt.enabled
                      ? `${opt.colors.iconBg} ${opt.colors.iconText} shadow-inner`
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base font-bold leading-tight ${
                      opt.enabled ? opt.colors.text : "text-slate-400"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-normal line-clamp-2">
                    {opt.enabled ? opt.description : opt.disabledReason}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <YearPickerStep
            years={years}
            currentYear={currentYear}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            usedYears={usedYears}
            selectedType={selectedType}
            onConfirm={() => {
              onClose();
              navigate(`/register/evaluate?type=${selectedType}&year=${selectedYear}`);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
