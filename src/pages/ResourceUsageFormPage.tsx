import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { PageLoading } from "@/components/ui/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import apiClient from "@/lib/axios";
import { xlsxDownload } from "@/lib/download";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Trash2, CheckCircle2, Loader2, Dices,
  Building2, Users2, Check, TrendingUp, Copy,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx-js-style";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from "recharts";
import {
  MONTHS_TH, GHG_ITEMS, WASTEWATER_TYPE_OPTIONS,
  Section1Data, Section2BaselineData, Section2GhgData,
  defaultSection1, defaultSection2Baseline, defaultSection2Ghg,
  calcItemTotal, calcSummary, safeParse, mergeMonthly, mergeGhgItem,
  DEFAULT_CF, SCOPE1_KEYS, SCOPE2_KEYS, SCOPE3_KEYS,
} from "@/lib/resourceUsageTypes";

const glassCard = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "var(--glass-shadow)",
  border: "1px solid var(--glass-border)",
} as React.CSSProperties;

const greenCard = {
  background: "var(--glass-bg-soft)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid var(--glass-border)",
} as React.CSSProperties;

const cellCls = "border border-border/40 text-center text-xs";
const headerCls = "border border-border/40 bg-[#4e8a3a] text-white text-xs font-semibold text-center px-1 py-1.5 whitespace-nowrap";
const inputCls = "h-7 w-20 text-xs text-center border-0 bg-transparent focus:ring-1 focus:ring-primary/50 rounded p-1 text-foreground";
const totalCls = "border border-border/40 bg-amber-50/60 dark:bg-amber-900/20 text-center text-xs font-semibold";

// Number input helper
function NumInput({
  value, onChange, readOnly = false, className,
}: { value: number; onChange?: (v: number) => void; readOnly?: boolean; className?: string }) {
  const [local, setLocal] = useState(value === 0 ? "" : String(value));
  useEffect(() => { setLocal(value === 0 ? "" : String(value)); }, [value]);
  if (readOnly) {
    return (
      <span className={`block text-center text-xs font-semibold ${className ?? ""}`}>
        {value === 0 ? "-" : value.toFixed(2)}
      </span>
    );
  }
  return (
    <input
      type="number"
      min={0}
      step="any"
      className={`${inputCls} ${className ?? ""}`}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = parseFloat(local);
        onChange?.(isNaN(n) ? 0 : n);
        setLocal(isNaN(n) || n === 0 ? "" : String(n));
      }}
    />
  );
}

export default function ResourceUsageFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, role } = useUserRole();
  const isReadOnly = role === "evaluator";

  const [loading, setLoading] = useState(true);
  const [recordYear, setRecordYear] = useState<number>(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  // Form state
  const [officeBuilding, setOfficeBuilding] = useState<number>(0);
  const [officeOutdoor, setOfficeOutdoor] = useState<number>(0);
  const [staffPermanent, setStaffPermanent] = useState<number>(0);
  const [staffTemp, setStaffTemp] = useState<number>(0);
  const [staffContract, setStaffContract] = useState<number>(0);
  const [section1, setSection1] = useState<Section1Data>(defaultSection1());
  const [section2Baseline, setSection2Baseline] = useState<Section2BaselineData>(defaultSection2Baseline());
  const [section2Ghg, setSection2Ghg] = useState<Section2GhgData>(defaultSection2Ghg());

  const [activeTab, setActiveTab] = useState("general");
  const [chartView, setChartView] = useState<"trend" | "proportion">("trend");

  // Copy section 1 from another year
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyRecords, setCopyRecords] = useState<{ id: string; year: number }[]>([]);
  const [copySelectedId, setCopySelectedId] = useState<string>("");
  const [loadingCopyList, setLoadingCopyList] = useState(false);
  const [copyingData, setCopyingData] = useState(false);

  const staffTotal = staffPermanent + staffTemp + staffContract;
  const officeTotal = officeBuilding + officeOutdoor;
  const summary = useMemo(() => calcSummary(section2Ghg), [section2Ghg]);

  const chartData = useMemo(() => {
    return MONTHS_TH.map((m, i) => {
      const s1 = SCOPE1_KEYS.reduce((sum, k) => sum + section2Ghg[k].amounts[i] * section2Ghg[k].cfs[i], 0);
      const s2 = SCOPE2_KEYS.reduce((sum, k) => sum + section2Ghg[k].amounts[i] * section2Ghg[k].cfs[i], 0);
      const s3 = SCOPE3_KEYS.reduce((sum, k) => sum + section2Ghg[k].amounts[i] * section2Ghg[k].cfs[i], 0);
      return {
        name: m,
        "ประเภทที่ 1": parseFloat(s1.toFixed(2)),
        "ประเภทที่ 2": parseFloat(s2.toFixed(2)),
        "ประเภทที่ 3": parseFloat(s3.toFixed(2)),
        total: parseFloat((s1 + s2 + s3).toFixed(2))
      };
    });
  }, [section2Ghg]);

  const peakMonth = useMemo(() => {
    let maxVal = -1;
    let maxIdx = 0;
    chartData.forEach((d, i) => {
      if (d.total > maxVal) { maxVal = d.total; maxIdx = i; }
    });
    return { name: MONTHS_TH[maxIdx], val: maxVal };
  }, [chartData]);

  const trendQ4vsQ1 = useMemo(() => {
    const q1 = chartData.slice(0, 3).reduce((s, d) => s + d.total, 0);
    const q4 = chartData.slice(9, 12).reduce((s, d) => s + d.total, 0);
    if (q1 === 0) return 0;
    return ((q4 - q1) / q1) * 100;
  }, [chartData]);

  // Debounce save ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // Load data
  useEffect(() => {
    if (!id) return;
    apiClient.get(`resource-usage/${id}`)
      .then(({ data }) => {
        setRecordYear(data.year ?? new Date().getFullYear());
        setOfficeBuilding(Number(data.officeAreaBuilding ?? 0));
        setOfficeOutdoor(Number(data.officeAreaOutdoor ?? 0));
        setStaffPermanent(data.staffPermanent ?? 0);
        setStaffTemp(data.staffTemp ?? 0);
        setStaffContract(data.staffContract ?? 0);

        const s1 = safeParse<any>(data.section1Data, {});
        setSection1({
          water:           mergeMonthly(s1.water),
          electricity:     mergeMonthly(s1.electricity),
          paper:           mergeMonthly(s1.paper),
          wasteGeneral:    mergeMonthly(s1.wasteGeneral),
          wasteRecyclable: mergeMonthly(s1.wasteRecyclable),
          wasteFood:       mergeMonthly(s1.wasteFood),
          fuelDiesel:      mergeMonthly(s1.fuelDiesel),
          fuelGasoline:    mergeMonthly(s1.fuelGasoline),
          fuelGasohol:     mergeMonthly(s1.fuelGasohol),
        });

        const sb = safeParse<any>(data.section2Baseline, {});
        setSection2Baseline({
          operatingDays:     mergeMonthly(sb.operatingDays),
          staffCount:        mergeMonthly(sb.staffCount),
          methaneSeptic:     mergeMonthly(sb.methaneSeptic),
          waterUsed:         mergeMonthly(sb.waterUsed),
          wastewater80:      mergeMonthly(sb.wastewater80),
          wastewaterType:    Array.isArray(sb.wastewaterType) ? sb.wastewaterType : Array(12).fill('0.050'),
          methaneWastewater: mergeMonthly(sb.methaneWastewater),
        });

        const sg = safeParse<any>(data.section2GhgData, {});
        setSection2Ghg({
          dieselGenerator:  mergeGhgItem(sg.dieselGenerator,  DEFAULT_CF.dieselGenerator),
          dieselFirePump:   mergeGhgItem(sg.dieselFirePump,   DEFAULT_CF.dieselFirePump),
          mobileDiesel:     mergeGhgItem(sg.mobileDiesel,     DEFAULT_CF.mobileDiesel),
          mobileGasohol91:  mergeGhgItem(sg.mobileGasohol91,  DEFAULT_CF.mobileGasohol91),
          mobileGasohol95:  mergeGhgItem(sg.mobileGasohol95,  DEFAULT_CF.mobileGasohol95),
          fireExtinguisher: mergeGhgItem(sg.fireExtinguisher, DEFAULT_CF.fireExtinguisher),
          septicTank:       mergeGhgItem(sg.septicTank,       DEFAULT_CF.septicTank),
          wastewaterLagoon: mergeGhgItem(sg.wastewaterLagoon, DEFAULT_CF.wastewaterLagoon),
          refrigerantR22:   mergeGhgItem(sg.refrigerantR22,   DEFAULT_CF.refrigerantR22),
          refrigerantR32:   mergeGhgItem(sg.refrigerantR32,   DEFAULT_CF.refrigerantR32),
          electricity:      mergeGhgItem(sg.electricity,      DEFAULT_CF.electricity),
          paperA4A3:        mergeGhgItem(sg.paperA4A3,        DEFAULT_CF.paperA4A3),
          waterBMA:         mergeGhgItem(sg.waterBMA,         DEFAULT_CF.waterBMA),
          waterProvincial:  mergeGhgItem(sg.waterProvincial,  DEFAULT_CF.waterProvincial),
          wasteLandfill:    mergeGhgItem(sg.wasteLandfill,    DEFAULT_CF.wasteLandfill),
          wasteIncinerate:  mergeGhgItem(sg.wasteIncinerate,  DEFAULT_CF.wasteIncinerate),
        });
      })
      .catch(() => toast.error("ไม่สามารถโหลดข้อมูลได้"))
      .finally(() => { setLoading(false); isFirstLoad.current = false; });
  }, [id]);

  // Auto-save
  const doSave = useCallback(async (
    ob: number, oo: number, sp: number, st: number, sc: number,
    s1: Section1Data, sb: Section2BaselineData, sg: Section2GhgData,
  ) => {
    if (!id || isReadOnly) return;
    const sum = calcSummary(sg);
    setSaving(true);
    try {
      await apiClient.patch(`resource-usage/${id}`, {
        officeAreaBuilding: ob || null,
        officeAreaOutdoor: oo || null,
        staffPermanent: sp,
        staffTemp: st,
        staffContract: sc,
        staffTotal: sp + st + sc,
        section1Data: JSON.stringify(s1),
        section2Baseline: JSON.stringify(sb),
        section2GhgData: JSON.stringify(sg),
        scope1Tco2e: sum.scope1Tco2e,
        scope2Tco2e: sum.scope2Tco2e,
        scope3Tco2e: sum.scope3Tco2e,
        scope1Pct: sum.scope1Pct,
        scope2Pct: sum.scope2Pct,
        scope3Pct: sum.scope3Pct,
      });
      setSavedAt(new Date());
    } catch {
      toast.error("บันทึกอัตโนมัติล้มเหลว");
    } finally {
      setSaving(false);
    }
  }, [id, isReadOnly]);

  const scheduleAutoSave = useCallback(() => {
    if (isFirstLoad.current || isReadOnly) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      doSave(officeBuilding, officeOutdoor, staffPermanent, staffTemp, staffContract, section1, section2Baseline, section2Ghg);
    }, 1500);
  }, [doSave, officeBuilding, officeOutdoor, staffPermanent, staffTemp, staffContract, section1, section2Baseline, section2Ghg, isReadOnly]);

  useEffect(() => { scheduleAutoSave(); return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }; },
    [officeBuilding, officeOutdoor, staffPermanent, staffTemp, staffContract, section1, section2Baseline, section2Ghg]);

  // Section 1 helpers
  const setS1Row = (key: keyof Section1Data, month: number, val: number) => {
    setSection1(prev => ({ ...prev, [key]: prev[key].map((v, i) => i === month ? val : v) as any }));
  };
  const s1Total = (key: keyof Section1Data) => (section1[key] as number[]).reduce((a, b) => a + b, 0);

  const setSbRow = (key: keyof Section2BaselineData, month: number, val: number | string) => {
    setSection2Baseline(prev => ({
      ...prev,
      [key]: (prev[key] as any[]).map((v, i) => i === month ? val : v),
    }));
  };

  // Auto-calculate Baseline Results
  useEffect(() => {
    const newBaseline = { ...section2Baseline };
    let changed = false;

    MONTHS_TH.forEach((_, i) => {
      // 1. Wastewater 80%
      const ww80 = parseFloat((newBaseline.waterUsed[i] * 0.8).toFixed(3));
      if (newBaseline.wastewater80[i] !== ww80) {
        newBaseline.wastewater80[i] = ww80;
        changed = true;
      }

      // 2. Methane Septic (Formula: Days * Staff * 1 * 1 * 0.3 * 40 * 0.001)
      const mSeptic = parseFloat((newBaseline.operatingDays[i] * newBaseline.staffCount[i] * 1 * 1 * 0.3 * 40 * 0.001).toFixed(4));
      if (newBaseline.methaneSeptic[i] !== mSeptic) {
        newBaseline.methaneSeptic[i] = mSeptic;
        changed = true;
      }

      // 3. Methane Wastewater (Formula: Wastewater80 * Type Factor * 0.12)
      const factor = parseFloat(newBaseline.wastewaterType[i]) || 0;
      const mWastewater = parseFloat((newBaseline.wastewater80[i] * factor * 0.12).toFixed(4));
      if (newBaseline.methaneWastewater[i] !== mWastewater) {
        newBaseline.methaneWastewater[i] = mWastewater;
        changed = true;
      }
    });

    if (changed) {
      setSection2Baseline(newBaseline);
    }
  }, [section2Baseline.waterUsed, section2Baseline.staffCount, section2Baseline.operatingDays, section2Baseline.wastewaterType]);

  // Sync Baseline Results to GHG Amounts
  useEffect(() => {
    setSection2Ghg(prev => ({
      ...prev,
      septicTank: {
        ...prev.septicTank,
        amounts: [...section2Baseline.methaneSeptic]
      },
      wastewaterLagoon: {
        ...prev.wastewaterLagoon,
        amounts: [...section2Baseline.methaneWastewater]
      },
      waterBMA: {
        ...prev.waterBMA,
        amounts: [...section2Baseline.waterUsed]
      }
    }));
  }, [section2Baseline.methaneSeptic, section2Baseline.methaneWastewater, section2Baseline.waterUsed]);
  const sbTotal = (key: keyof Omit<Section2BaselineData, 'wastewaterType'>) =>
    (section2Baseline[key] as number[]).reduce((a: number, b: number) => a + b, 0);

  // Section 2 GHG helpers
  const setGhgAmount = (key: keyof Section2GhgData, month: number, val: number) => {
    setSection2Ghg(prev => ({
      ...prev,
      [key]: { ...prev[key], amounts: prev[key].amounts.map((v, i) => i === month ? val : v) },
    }));
  };
  const setGhgCf = (key: keyof Section2GhgData, month: number, val: number) => {
    setSection2Ghg(prev => ({
      ...prev,
      [key]: { ...prev[key], cfs: prev[key].cfs.map((v, i) => i === month ? val : v) },
    }));
  };

  // Random fill for mockup
  const fillRandom = () => {
    const r = (min: number, max: number, dec = 0) => {
      const v = Math.random() * (max - min) + min;
      return dec > 0 ? parseFloat(v.toFixed(dec)) : Math.round(v);
    };
    const monthly = (min: number, max: number, dec = 0) =>
      Array.from({ length: 12 }, () => r(min, max, dec));

    setOfficeBuilding(r(500, 5000, 1));
    setOfficeOutdoor(r(200, 2000, 1));
    const perm = r(20, 150);
    const tmp  = r(5, 40);
    const cont = r(0, 20);
    setStaffPermanent(perm);
    setStaffTemp(tmp);
    setStaffContract(cont);

    setSection1({
      water:           monthly(80, 400),
      electricity:     monthly(8000, 35000),
      paper:           monthly(10, 80),
      wasteGeneral:    monthly(100, 500),
      wasteRecyclable: monthly(20, 120),
      wasteFood:       monthly(30, 180),
      fuelDiesel:      monthly(50, 250),
      fuelGasoline:    monthly(20, 100),
      fuelGasohol:     monthly(10, 60),
    });

    const waterUsed = monthly(100, 500);
    setSection2Baseline({
      operatingDays:     Array.from({ length: 12 }, (_, i) => [31,28,31,30,31,30,31,31,30,31,30,31][i]),
      staffCount:        Array(12).fill(perm + tmp + cont),
      methaneSeptic:     monthly(0, 3, 2),
      waterUsed,
      wastewater80:      waterUsed.map(v => parseFloat((v * 0.8).toFixed(3))),
      wastewaterType:    Array(12).fill('0.050'),
      methaneWastewater: monthly(0, 1, 2),
    });

    const d = DEFAULT_CF;
    const mkItem = (min: number, max: number, cf: number, dec = 1) => ({
      amounts: monthly(min, max, dec),
      cfs: Array(12).fill(cf),
    });

    setSection2Ghg({
      dieselGenerator:  mkItem(0, 80, d.dieselGenerator, 1),
      dieselFirePump:   mkItem(0, 10, d.dieselFirePump, 1),
      mobileDiesel:     mkItem(60, 280, d.mobileDiesel, 1),
      mobileGasohol91:  mkItem(30, 160, d.mobileGasohol91, 1),
      mobileGasohol95:  mkItem(20, 100, d.mobileGasohol95, 1),
      fireExtinguisher: mkItem(0, 2,   d.fireExtinguisher, 2),
      septicTank:       mkItem(0, 2,   d.septicTank, 2),
      wastewaterLagoon: mkItem(0, 1,   d.wastewaterLagoon, 2),
      refrigerantR22:   mkItem(0, 0.3, d.refrigerantR22, 3),
      refrigerantR32:   mkItem(0, 0.2, d.refrigerantR32, 3),
      electricity:      mkItem(8000, 35000, d.electricity, 0),
      paperA4A3:        mkItem(15, 60, d.paperA4A3, 1),
      waterBMA:         mkItem(60, 250, d.waterBMA, 1),
      waterProvincial:  mkItem(0, 50,  d.waterProvincial, 1),
      wasteLandfill:    mkItem(100, 450, d.wasteLandfill, 1),
      wasteIncinerate:  mkItem(0, 20,  d.wasteIncinerate, 1),
    });

    toast.success("กรอกข้อมูลสุ่มเรียบร้อย");
  };

  // Copy section 1 from another year
  const openCopyDialog = async () => {
    setLoadingCopyList(true);
    setCopyDialogOpen(true);
    try {
      const { data } = await apiClient.get("resource-usage");
      const others = (data ?? []).filter((r: any) => r.id !== id);
      const sorted = others.sort((a: any, b: any) => b.year - a.year);
      setCopyRecords(sorted.map((r: any) => ({ id: r.id, year: r.year })));
      setCopySelectedId(sorted.length > 0 ? sorted[0].id : "");
    } catch {
      toast.error("โหลดรายการไม่สำเร็จ");
    } finally {
      setLoadingCopyList(false);
    }
  };

  const handleCopySection1 = async () => {
    if (!copySelectedId) return;
    setCopyingData(true);
    try {
      const { data } = await apiClient.get(`resource-usage/${copySelectedId}`);
      setOfficeBuilding(Number(data.officeAreaBuilding ?? 0));
      setOfficeOutdoor(Number(data.officeAreaOutdoor ?? 0));
      setStaffPermanent(data.staffPermanent ?? 0);
      setStaffTemp(data.staffTemp ?? 0);
      setStaffContract(data.staffContract ?? 0);
      setCopyDialogOpen(false);
      toast.success("คัดลอกข้อมูลพื้นฐานเรียบร้อย");
    } catch {
      toast.error("คัดลอกข้อมูลไม่สำเร็จ");
    } finally {
      setCopyingData(false);
    }
  };

  // Delete all data
  const handleDeleteAll = async () => {
    if (!id) return;
    const empty = defaultSection1();
    const emptyB = defaultSection2Baseline();
    const emptyG = defaultSection2Ghg();
    setOfficeBuilding(0); setOfficeOutdoor(0);
    setStaffPermanent(0); setStaffTemp(0); setStaffContract(0);
    setSection1(empty); setSection2Baseline(emptyB); setSection2Ghg(emptyG);
    doSave(0, 0, 0, 0, 0, empty, emptyB, emptyG);
    toast.success("ล้างข้อมูลทั้งหมดเรียบร้อย");
  };

  // Excel export
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const thYear = recordYear + 543;
    const E = '';

    // ─── Style factory ────────────────────────────────────────────────
    const thin = (hex = 'D9D9D9') => ({ style: 'thin' as const, color: { rgb: `FF${hex}` } });
    const bdr  = (hex = 'D9D9D9') => ({ top: thin(hex), bottom: thin(hex), left: thin(hex), right: thin(hex) });
    const mk   = (fill: string | null, bold: boolean, align: string, color: string, sz: number, bc = 'D9D9D9', italic = false) => ({
      ...(fill ? { fill: { patternType: 'solid' as const, fgColor: { rgb: `FF${fill}` } } } : {}),
      font:      { bold, italic, sz, color: { rgb: `FF${color}` } },
      alignment: { horizontal: align, vertical: 'center' as const, wrapText: align === 'center' },
      border:    bdr(bc),
    });

    const TITLE  = mk('4E8A3A', true,  'left',   'FFFFFF', 13);
    const SEC    = mk('70AD47', true,  'left',   'FFFFFF', 11, '70AD47');
    const HDR    = mk('548235', true,  'center', 'FFFFFF', 10, 'FFFFFF');
    const HDR_L  = mk('548235', true,  'left',   'FFFFFF', 10, 'FFFFFF');
    const LBL    = mk(null,     false, 'left',   '000000', 10);
    const NUM    = mk(null,     false, 'right',  '000000', 10);
    const LBL_A  = mk('F5F5F5', false, 'left',   '000000', 10);
    const NUM_A  = mk('F5F5F5', false, 'right',  '000000', 10);
    const TOT    = mk('FFF2CC', true,  'right',  '7B6300', 10, 'FFC000');
    const TOT_L  = mk('FFF2CC', true,  'left',   '7B6300', 10, 'FFC000');
    const S1T    = mk('E2EFDA', true,  'left',   '375623', 10, '70AD47');
    const S1TR   = mk('E2EFDA', true,  'right',  '375623', 10, '70AD47');
    const S2T    = mk('DDEEFF', true,  'left',   '1A4C8A', 10, '5B9BD5');
    const S2TR   = mk('DDEEFF', true,  'right',  '1A4C8A', 10, '5B9BD5');
    const S3T    = mk('FFEEDD', true,  'left',   '7A3C00', 10, 'E07B28');
    const S3TR   = mk('FFEEDD', true,  'right',  '7A3C00', 10, 'E07B28');
    const GRD    = mk('FFC000', true,  'left',   '000000', 11, 'B8860B');
    const GRD_R  = mk('FFC000', true,  'right',  '000000', 11, 'B8860B');
    const NOTE   = mk(null,     false, 'left',   '808080',  9, 'EEEEEE', true);
    const S1_TAG = mk('C6EFCE', true,  'center', '276221', 10);
    const S2_TAG = mk('BDD7EE', true,  'center', '1F497D', 10);
    const S3_TAG = mk('FCE4D6', true,  'center', '833C00', 10);

    const sr = (ws: any, r1: number, c1: number, r2: number, c2: number, style: any) => {
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          const a = XLSX.utils.encode_cell({ r, c });
          if (!ws[a]) ws[a] = { v: E, t: 's' };
          ws[a].s = style;
        }
      }
    };

    // ── Sheet 1: 1-ข้อมูลพื้นฐาน ──────────────────────────────────────
    const ws1Data = [
      [`1. ข้อมูลพื้นฐาน ปี พ.ศ. ${thYear}`, E, E],
      [E, E, E],
      ['พื้นที่สำนักงาน', E, E],
      ['รายการ', 'ค่า', 'หน่วย'],
      ['พื้นที่อาคารสำนักงาน (Indoor)', officeBuilding, 'ตร.ม.'],
      ['พื้นที่ภายนอกสำนักงาน (Outdoor)', officeOutdoor, 'ตร.ม.'],
      ['รวมพื้นที่ทั้งหมด', officeTotal, 'ตร.ม.'],
      [E, E, E],
      ['จำนวนพนักงาน', E, E],
      ['ประเภท', 'จำนวน', 'หน่วย'],
      ['พนักงานประจำ', staffPermanent, 'คน'],
      ['พนักงานชั่วคราว', staffTemp, 'คน'],
      ['พนักงานรับจ้างช่วง', staffContract, 'คน'],
      ['รวมพนักงานทั้งหมด', staffTotal, 'คน'],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      { s: { r: 8, c: 0 }, e: { r: 8, c: 2 } },
    ];
    ws1['!cols'] = [{ wch: 34 }, { wch: 12 }, { wch: 10 }];
    ws1['!rows'] = [{ hpt: 24 }];
    sr(ws1, 0, 0, 0, 2, TITLE);
    sr(ws1, 2, 0, 2, 2, SEC);
    sr(ws1, 3, 0, 3, 0, HDR_L); sr(ws1, 3, 1, 3, 2, HDR);
    sr(ws1, 4, 0, 4, 0, LBL);   sr(ws1, 4, 1, 4, 2, NUM);
    sr(ws1, 5, 0, 5, 0, LBL_A); sr(ws1, 5, 1, 5, 2, NUM_A);
    sr(ws1, 6, 0, 6, 0, TOT_L); sr(ws1, 6, 1, 6, 2, TOT);
    sr(ws1, 8, 0, 8, 2, SEC);
    sr(ws1, 9, 0, 9, 0, HDR_L); sr(ws1, 9, 1, 9, 2, HDR);
    sr(ws1, 10, 0, 10, 0, LBL);   sr(ws1, 10, 1, 10, 2, NUM);
    sr(ws1, 11, 0, 11, 0, LBL_A); sr(ws1, 11, 1, 11, 2, NUM_A);
    sr(ws1, 12, 0, 12, 0, LBL);   sr(ws1, 12, 1, 12, 2, NUM);
    sr(ws1, 13, 0, 13, 0, TOT_L); sr(ws1, 13, 1, 13, 2, TOT);
    XLSX.utils.book_append_sheet(wb, ws1, '1-ข้อมูลพื้นฐาน');

    // ── Sheet 2: 2-ทรัพยากรรายเดือน ─────────────────────────────────────
    const NC2 = 15;
    const mTot = MONTHS_TH.map((_, i) =>
      section1.water[i] + section1.electricity[i] + section1.paper[i] +
      section1.wasteGeneral[i] + section1.wasteRecyclable[i] + section1.wasteFood[i] +
      section1.fuelDiesel[i] + section1.fuelGasoline[i] + section1.fuelGasohol[i]
    );
    const ws2Data = [
      [`2. ทรัพยากร พลังงาน ของเสีย รายเดือน ปี พ.ศ. ${thYear}`, ...Array(NC2 - 1).fill(E)],
      Array(NC2).fill(E),
      ['รายการ', 'หน่วย', ...MONTHS_TH, 'รวมปี'],
      ['น้ำประปา',           'ลบ.ม.',  ...section1.water,           s1Total('water')],
      ['ไฟฟ้า',              'kWh',    ...section1.electricity,      s1Total('electricity')],
      ['กระดาษ',             'รีม',    ...section1.paper,            s1Total('paper')],
      ['ขยะทั่วไป',          'กก.',    ...section1.wasteGeneral,     s1Total('wasteGeneral')],
      ['ขยะรีไซเคิล',        'กก.',    ...section1.wasteRecyclable,  s1Total('wasteRecyclable')],
      ['เศษอาหาร',           'กก.',    ...section1.wasteFood,        s1Total('wasteFood')],
      ['น้ำมันดีเซล',        'ลิตร',  ...section1.fuelDiesel,       s1Total('fuelDiesel')],
      ['น้ำมันเบนซิน',       'ลิตร',  ...section1.fuelGasoline,     s1Total('fuelGasoline')],
      ['น้ำมันแก๊สโซฮอลล์',  'ลิตร',  ...section1.fuelGasohol,      s1Total('fuelGasohol')],
      ['รวมทุกประเภท',        '-',     ...mTot,                      mTot.reduce((a, b) => a + b, 0)],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: NC2 - 1 } }];
    ws2['!cols'] = [{ wch: 24 }, { wch: 8 }, ...Array(12).fill({ wch: 10 }), { wch: 12 }];
    ws2['!rows'] = [{ hpt: 24 }];
    sr(ws2, 0, 0, 0, NC2 - 1, TITLE);
    sr(ws2, 2, 0, 2, 0, HDR_L); sr(ws2, 2, 1, 2, NC2 - 1, HDR);
    for (let r = 3; r <= 11; r++) {
      const alt = r % 2 === 0;
      sr(ws2, r, 0, r, 1, alt ? LBL_A : LBL);
      sr(ws2, r, 2, r, NC2 - 1, alt ? NUM_A : NUM);
    }
    sr(ws2, 12, 0, 12, 1, TOT_L); sr(ws2, 12, 2, 12, NC2 - 1, TOT);
    XLSX.utils.book_append_sheet(wb, ws2, '2-ทรัพยากรรายเดือน');

    // ── Sheet 3: 3-GHG Baseline ──────────────────────────────────────────
    const NC3 = 15;
    const wwFactor = section2Baseline.wastewaterType[0];
    const ws3Data = [
      [`3. การปลดปล่อยก๊าซเรือนกระจก (Baseline) ปี พ.ศ. ${thYear}`, ...Array(NC3 - 1).fill(E)],
      Array(NC3).fill(E),
      ['ข้อมูลพื้นฐานการดำเนินงาน', ...Array(NC3 - 1).fill(E)],
      ['รายการ', 'หน่วย', ...MONTHS_TH, 'รวม/เฉลี่ย'],
      ['วันเปิดให้บริการ', 'วัน',   ...section2Baseline.operatingDays, sbTotal('operatingDays')],
      ['จำนวนพนักงาน',     'คน',    ...section2Baseline.staffCount,    section2Baseline.staffCount[0]],
      ['ปริมาณน้ำใช้',     'ลบ.ม.', ...section2Baseline.waterUsed,     sbTotal('waterUsed')],
      Array(NC3).fill(E),
      ['ผลคำนวณการปลดปล่อยมีเทน (CH₄ → CO₂e)', ...Array(NC3 - 1).fill(E)],
      ['รายการ', 'หน่วย', ...MONTHS_TH, 'รวม'],
      ['มีเทน Septic Tank',       'kgCH4',  ...section2Baseline.methaneSeptic,     sbTotal('methaneSeptic')],
      ['น้ำเสีย (80% ของน้ำใช้)', 'ลบ.ม.',  ...section2Baseline.wastewater80,      sbTotal('wastewater80')],
      ['มีเทนบ่อบำบัด',           'kgCH4',  ...section2Baseline.methaneWastewater, sbTotal('methaneWastewater')],
      Array(NC3).fill(E),
      [`* ค่า EF น้ำเสีย (wastewater factor) ที่ใช้: ${wwFactor}`, ...Array(NC3 - 1).fill(E)],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3['!merges'] = [
      { s: { r: 0,  c: 0 }, e: { r: 0,  c: NC3 - 1 } },
      { s: { r: 2,  c: 0 }, e: { r: 2,  c: NC3 - 1 } },
      { s: { r: 8,  c: 0 }, e: { r: 8,  c: NC3 - 1 } },
      { s: { r: 14, c: 0 }, e: { r: 14, c: NC3 - 1 } },
    ];
    ws3['!cols'] = [{ wch: 36 }, { wch: 8 }, ...Array(12).fill({ wch: 10 }), { wch: 12 }];
    ws3['!rows'] = [{ hpt: 24 }];
    sr(ws3, 0, 0, 0, NC3 - 1, TITLE);
    sr(ws3, 2, 0, 2, NC3 - 1, SEC);
    sr(ws3, 3, 0, 3, 0, HDR_L); sr(ws3, 3, 1, 3, NC3 - 1, HDR);
    sr(ws3, 4, 0, 4, 0, LBL);   sr(ws3, 4, 1, 4, NC3 - 1, NUM);
    sr(ws3, 5, 0, 5, 0, LBL_A); sr(ws3, 5, 1, 5, NC3 - 1, NUM_A);
    sr(ws3, 6, 0, 6, 0, LBL);   sr(ws3, 6, 1, 6, NC3 - 1, NUM);
    sr(ws3, 8, 0, 8, NC3 - 1, SEC);
    sr(ws3, 9, 0, 9, 0, HDR_L); sr(ws3, 9, 1, 9, NC3 - 1, HDR);
    sr(ws3, 10, 0, 10, 0, LBL);   sr(ws3, 10, 1, 10, NC3 - 1, NUM);
    sr(ws3, 11, 0, 11, 0, LBL_A); sr(ws3, 11, 1, 11, NC3 - 1, NUM_A);
    sr(ws3, 12, 0, 12, 0, LBL);   sr(ws3, 12, 1, 12, NC3 - 1, NUM);
    sr(ws3, 14, 0, 14, 0, NOTE);
    XLSX.utils.book_append_sheet(wb, ws3, '3-GHG Baseline');

    // ── Sheet 4: 4-ปริมาณ GHG รายเดือน ──────────────────────────────────
    const NC4 = 18;
    const s1Items = GHG_ITEMS.filter(i => i.scope === 1);
    const s2Items = GHG_ITEMS.filter(i => i.scope === 2);
    const s3Items = GHG_ITEMS.filter(i => i.scope === 3);
    let scope1Kg = 0, scope2Kg = 0, scope3Kg = 0;
    s1Items.forEach(i => { scope1Kg += calcItemTotal(section2Ghg[i.key]); });
    s2Items.forEach(i => { scope2Kg += calcItemTotal(section2Ghg[i.key]); });
    s3Items.forEach(i => { scope3Kg += calcItemTotal(section2Ghg[i.key]); });

    const makeGhgRow = (item: typeof GHG_ITEMS[0], scopeLabel: string) => {
      const ef = section2Ghg[item.key].cfs[0];
      const amounts = MONTHS_TH.map((_, i) => section2Ghg[item.key].amounts[i]);
      const totalAmt = amounts.reduce((a, b) => a + b, 0);
      return [scopeLabel, item.label, item.unit, ef, ...amounts, totalAmt, calcItemTotal(section2Ghg[item.key])];
    };
    const makeScopeTot = (label: string, kg: number) =>
      [E, label, E, E, ...Array(12).fill(E), E, kg];

    const ws4Data: any[][] = [
      [`4. ปริมาณก๊าซเรือนกระจกรายเดือน ปี พ.ศ. ${thYear}`, ...Array(NC4 - 1).fill(E)],
      Array(NC4).fill(E),
      ['ขอบเขต', 'รายการ', 'หน่วย', 'EF (kgCO2e/หน่วย)', ...MONTHS_TH, 'รวมปริมาณ', 'รวม kgCO2e'],
      ...s1Items.map(i => makeGhgRow(i, 'S1')),
      makeScopeTot('รวมขอบเขต 1 (ประเภทที่ 1)', scope1Kg),
      ...s2Items.map(i => makeGhgRow(i, 'S2')),
      makeScopeTot('รวมขอบเขต 2 (ประเภทที่ 2)', scope2Kg),
      ...s3Items.map(i => makeGhgRow(i, 'S3')),
      makeScopeTot('รวมขอบเขต 3 (ประเภทที่ 3)', scope3Kg),
      [E, 'รวมทั้งหมด', E, E, ...Array(12).fill(E), E, scope1Kg + scope2Kg + scope3Kg],
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
    ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: NC4 - 1 } }];
    ws4['!cols'] = [{ wch: 9 }, { wch: 36 }, { wch: 9 }, { wch: 15 }, ...Array(12).fill({ wch: 11 }), { wch: 13 }, { wch: 15 }];
    ws4['!rows'] = [{ hpt: 24 }];

    sr(ws4, 0, 0, 0, NC4 - 1, TITLE);
    sr(ws4, 2, 0, 2, 0, HDR); sr(ws4, 2, 1, 2, 1, HDR_L); sr(ws4, 2, 2, 2, NC4 - 1, HDR);

    const s1R0 = 3, s1R1 = s1R0 + s1Items.length - 1;
    const s1Tot = s1R1 + 1;
    const s2R0 = s1Tot + 1, s2R1 = s2R0 + s2Items.length - 1;
    const s2Tot = s2R1 + 1;
    const s3R0 = s2Tot + 1, s3R1 = s3R0 + s3Items.length - 1;
    const s3Tot = s3R1 + 1;
    const grandR = s3Tot + 1;

    for (let r = s1R0; r <= s1R1; r++) {
      sr(ws4, r, 0, r, 0, S1_TAG);
      const alt = r % 2 === 0;
      sr(ws4, r, 1, r, 1, alt ? LBL_A : LBL);
      sr(ws4, r, 2, r, NC4 - 1, alt ? NUM_A : NUM);
    }
    sr(ws4, s1Tot, 0, s1Tot, 0, S1T); sr(ws4, s1Tot, 1, s1Tot, NC4 - 2, S1T); sr(ws4, s1Tot, NC4 - 1, s1Tot, NC4 - 1, S1TR);

    for (let r = s2R0; r <= s2R1; r++) {
      sr(ws4, r, 0, r, 0, S2_TAG);
      sr(ws4, r, 1, r, 1, LBL);
      sr(ws4, r, 2, r, NC4 - 1, NUM);
    }
    sr(ws4, s2Tot, 0, s2Tot, 0, S2T); sr(ws4, s2Tot, 1, s2Tot, NC4 - 2, S2T); sr(ws4, s2Tot, NC4 - 1, s2Tot, NC4 - 1, S2TR);

    for (let r = s3R0; r <= s3R1; r++) {
      sr(ws4, r, 0, r, 0, S3_TAG);
      const alt = r % 2 === 0;
      sr(ws4, r, 1, r, 1, alt ? LBL_A : LBL);
      sr(ws4, r, 2, r, NC4 - 1, alt ? NUM_A : NUM);
    }
    sr(ws4, s3Tot, 0, s3Tot, 0, S3T); sr(ws4, s3Tot, 1, s3Tot, NC4 - 2, S3T); sr(ws4, s3Tot, NC4 - 1, s3Tot, NC4 - 1, S3TR);

    sr(ws4, grandR, 0, grandR, NC4 - 2, GRD); sr(ws4, grandR, NC4 - 1, grandR, NC4 - 1, GRD_R);
    XLSX.utils.book_append_sheet(wb, ws4, '4-ปริมาณ GHG รายเดือน');

    // ── Sheet 5: 5-สรุปการปลดปล่อย ──────────────────────────────────────
    const NC5 = 6;
    const sumData = calcSummary(section2Ghg);
    const totalKgAll = sumData.totalTco2e * 1000;

    const monthlyRows = MONTHS_TH.map((m, i) => {
      const s1 = SCOPE1_KEYS.reduce((sum, k) => sum + section2Ghg[k].amounts[i] * section2Ghg[k].cfs[i], 0);
      const s2 = SCOPE2_KEYS.reduce((sum, k) => sum + section2Ghg[k].amounts[i] * section2Ghg[k].cfs[i], 0);
      const s3 = SCOPE3_KEYS.reduce((sum, k) => sum + section2Ghg[k].amounts[i] * section2Ghg[k].cfs[i], 0);
      const tot = s1 + s2 + s3;
      return [m, s1, s2, s3, tot, totalKgAll > 0 ? tot / totalKgAll : 0];
    });

    const ws5Data = [
      [`5. สรุปการปลดปล่อยก๊าซเรือนกระจก ปี พ.ศ. ${thYear}`, E, E, E, E, E],
      [E, E, E, E, E, E],
      ['สรุปตามขอบเขต', E, E, E, E, E],
      ['ขอบเขต', 'kgCO2e', 'tCO2e', '%GHG', E, E],
      ['ประเภทที่ 1', sumData.scope1Tco2e * 1000, sumData.scope1Tco2e, sumData.scope1Pct / 100, E, E],
      ['ประเภทที่ 2', sumData.scope2Tco2e * 1000, sumData.scope2Tco2e, sumData.scope2Pct / 100, E, E],
      ['ประเภทที่ 3', sumData.scope3Tco2e * 1000, sumData.scope3Tco2e, sumData.scope3Pct / 100, E, E],
      ['รวมทั้งหมด',  totalKgAll,                 sumData.totalTco2e,  1,                        E, E],
      [E, E, E, E, E, E],
      ['รายเดือนแยกตามขอบเขต (kgCO2e)', E, E, E, E, E],
      ['เดือน', 'ประเภทที่ 1', 'ประเภทที่ 2', 'ประเภทที่ 3', 'รวม', '% ของทั้งปี'],
      ...monthlyRows,
      ['รวมทั้งปี', sumData.scope1Tco2e * 1000, sumData.scope2Tco2e * 1000, sumData.scope3Tco2e * 1000, totalKgAll, 1],
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
    ws5['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: NC5 - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: NC5 - 1 } },
      { s: { r: 9, c: 0 }, e: { r: 9, c: NC5 - 1 } },
    ];
    ws5['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];
    ws5['!rows'] = [{ hpt: 24 }];

    sr(ws5, 0, 0, 0, NC5 - 1, TITLE);
    sr(ws5, 2, 0, 2, NC5 - 1, SEC);
    sr(ws5, 3, 0, 3, 0, HDR_L); sr(ws5, 3, 1, 3, NC5 - 1, HDR);
    sr(ws5, 4, 0, 4, 0, LBL);   sr(ws5, 4, 1, 4, NC5 - 1, NUM);
    sr(ws5, 5, 0, 5, 0, LBL_A); sr(ws5, 5, 1, 5, NC5 - 1, NUM_A);
    sr(ws5, 6, 0, 6, 0, LBL);   sr(ws5, 6, 1, 6, NC5 - 1, NUM);
    sr(ws5, 7, 0, 7, 0, TOT_L); sr(ws5, 7, 1, 7, NC5 - 1, TOT);
    sr(ws5, 9, 0, 9, NC5 - 1, SEC);
    sr(ws5, 10, 0, 10, 0, HDR_L); sr(ws5, 10, 1, 10, NC5 - 1, HDR);
    for (let r = 11; r <= 22; r++) {
      const alt = r % 2 === 0;
      sr(ws5, r, 0, r, 0, alt ? LBL_A : LBL);
      sr(ws5, r, 1, r, NC5 - 1, alt ? NUM_A : NUM);
    }
    sr(ws5, 23, 0, 23, 0, TOT_L); sr(ws5, 23, 1, 23, NC5 - 1, TOT);
    XLSX.utils.book_append_sheet(wb, ws5, '5-สรุปการปลดปล่อย');

    xlsxDownload(wb, `รายงาน_GHG_Green Office_${thYear}.xlsx`);
  };

  if (loading) return <PageLoading />;

  const thYear = recordYear + 543;

  const steps = [
    { id: "general",  label: "ส่วนที่ 1", title: "ข้อมูลพื้นฐาน" },
    { id: "section1", label: "ส่วนที่ 2", title: "ทรัพยากร พลังงาน ของเสีย" },
    { id: "section2b", label: "ส่วนที่ 3", title: "การปลดปล่อย GHG" },
    { id: "section2g", label: "ส่วนที่ 4", title: "ปริมาณก๊าซเรือนกระจก" },
    { id: "summary",  label: "ส่วนที่ 5", title: "สรุปการปลดปล่อย GHG" },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header bar */}
      <div className="px-4 py-3 rounded-2xl shrink-0 flex items-center gap-3" style={glassCard}>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate("/resource-usage")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>
            บันทึกข้อมูลการใช้ทรัพยากร ปี พ.ศ. {thYear}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            {saving ? (
              <span className="text-[0.625rem] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />กำลังบันทึก...
              </span>
            ) : savedAt ? (
              <span className="text-[0.625rem] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />บันทึกอัตโนมัติ {savedAt.toLocaleTimeString('th-TH')}
              </span>
            ) : (
              <span className="text-[0.625rem] text-muted-foreground">กรอกข้อมูลแล้วระบบจะบันทึกอัตโนมัติ</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />Excel
          </Button>
          <Button variant="outline" size="sm"
            className="h-8 text-xs gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400"
            onClick={fillRandom}>
            <Dices className="h-3.5 w-3.5" />สุ่มข้อมูล
          </Button>
          {!isReadOnly && (
            <Button variant="outline" size="sm"
              className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteAll(true)}>
              <Trash2 className="h-3.5 w-3.5" />ล้างข้อมูล
            </Button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-5 gap-3 shrink-0">
        {steps.map((step, idx) => {
          const isActive = activeTab === step.id;
          const isDone = false; // You could add logic here to check if section is complete
          return (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${
                isActive 
                  ? "bg-background dark:bg-primary/20 border-primary shadow-md ring-1 ring-primary/40" 
                  : "bg-background/90 backdrop-blur-md border-border/40 hover:border-border/80 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold ${
                    isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-[0.625rem] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
                {isActive && (
                  <div className="w-5 h-5 rounded-full border border-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                )}
              </div>
              <div className={`text-xs font-bold mt-1 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {step.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* ── Tab 1: ข้อมูลทั่วไป ── */}
          <TabsContent value="general" className="flex-1 overflow-y-auto m-0 space-y-4">
            {!isReadOnly && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={openCopyDialog}
                >
                  <Copy className="h-3.5 w-3.5" />
                  คัดลอกจากปีอื่น
                </Button>
              </div>
            )}
            {/* Section: พื้นที่สำนักงาน */}
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md shadow-sm overflow-hidden">
              <div className="bg-primary/5 dark:bg-primary/10 px-4 py-3 flex items-center gap-2 border-b border-border/40">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-primary">พื้นที่สำนักงาน</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1">
                      เฉพาะอาคาร (ตร.ม.) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      type="number" 
                      min={0} 
                      step="any" 
                      className="h-10 text-sm bg-muted/30 border-border/40 focus:border-primary/50" 
                      disabled={isReadOnly}
                      value={officeBuilding || ""}
                      onChange={e => setOfficeBuilding(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1">
                      พื้นที่นอกอาคาร (ตร.ม.) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      type="number" 
                      min={0} 
                      step="any" 
                      className="h-10 text-sm bg-muted/30 border-border/40 focus:border-primary/50" 
                      disabled={isReadOnly}
                      value={officeOutdoor || ""}
                      onChange={e => setOfficeOutdoor(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">รวมพื้นที่ทั้งหมด (ตร.ม.)</label>
                    <div className="h-10 px-3 rounded-md flex items-center justify-end bg-amber-500/10 dark:bg-amber-900/20 border border-amber-500/20 text-sm font-bold text-amber-600 dark:text-amber-400">
                      {officeTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: จำนวนพนักงาน */}
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md shadow-sm overflow-hidden">
              <div className="bg-primary/5 dark:bg-primary/10 px-4 py-3 flex items-center gap-2 border-b border-border/40">
                <Users2 className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-bold text-primary">จำนวนพนักงาน</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1">
                      พนักงานประจำ (คน) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      type="number" 
                      min={0} 
                      step={1} 
                      className="h-10 text-sm bg-muted/30 border-border/40 focus:border-primary/50" 
                      disabled={isReadOnly}
                      value={staffPermanent || ""}
                      onChange={e => setStaffPermanent(parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1">
                      พนักงานชั่วคราว (คน) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      type="number" 
                      min={0} 
                      step={1} 
                      className="h-10 text-sm bg-muted/30 border-border/40 focus:border-primary/50" 
                      disabled={isReadOnly}
                      value={staffTemp || ""}
                      onChange={e => setStaffTemp(parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold flex items-center gap-1">
                      ผู้รับจ้างช่วง (คน) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      type="number" 
                      min={0} 
                      step={1} 
                      className="h-10 text-sm bg-muted/30 border-border/40 focus:border-primary/50" 
                      disabled={isReadOnly}
                      value={staffContract || ""}
                      onChange={e => setStaffContract(parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">รวมทั้งสิ้น (คน)</label>
                    <div className="h-10 px-3 rounded-md flex items-center justify-end bg-amber-500/10 dark:bg-amber-900/20 border border-amber-500/20 text-sm font-bold text-amber-600 dark:text-amber-400">
                      {staffTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 2: ส่วนที่ 1 ── */}
          <TabsContent value="section1" className="flex-1 overflow-auto m-0">
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md shadow-sm overflow-hidden">
              <div className="bg-primary/5 dark:bg-primary/10 px-4 py-3 border-b border-border/40">
                <h3 className="text-sm font-bold text-primary">ส่วนที่ 2 ข้อมูลปริมาณการใช้ทรัพยากร พลังงาน ของเสีย</h3>
              </div>
              <div className="p-4 overflow-x-auto text-foreground">
                <table className="border-collapse text-xs w-full" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th className={`${headerCls} min-w-[180px] text-left px-4 rounded-tl-lg`}>รายการ</th>
                      <th className={`${headerCls} min-w-[70px]`}>หน่วย</th>
                      {MONTHS_TH.map(m => <th key={m} className={`${headerCls} min-w-[70px]`}>{m}</th>)}
                      <th className={`${headerCls} min-w-[80px] bg-amber-600 dark:bg-amber-700 rounded-tr-lg`}>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { key: 'water',           label: '1. ปริมาณการใช้น้ำประปา',       unit: 'ลบ.ม.' },
                      { key: 'electricity',     label: '2. ปริมาณการใช้ไฟฟ้า',          unit: 'kWh' },
                      { key: 'paper',           label: '3. ปริมาณการใช้กระดาษ',         unit: 'รีม' },
                      { key: 'wasteGeneral',    label: '4.1 ขยะทั่วไป',                 unit: 'กก.' },
                      { key: 'wasteRecyclable', label: '4.2 ขยะรีไซเคิล',              unit: 'กก.' },
                      { key: 'wasteFood',       label: '4.3 เศษอาหาร',                  unit: 'กก.' },
                      { key: 'fuelDiesel',      label: '5.1 น้ำมันดีเซล',               unit: 'ลิตร' },
                      { key: 'fuelGasoline',    label: '5.2 น้ำมันเบนซิน',              unit: 'ลิตร' },
                      { key: 'fuelGasohol',     label: '5.3 ก๊าซโซฮอลล์',              unit: 'ลิตร' },
                    ] as { key: keyof Section1Data; label: string; unit: string; spacer?: boolean }[])
                      .map(({ key, label, unit }) => (
                        <tr key={key} className="hover:bg-muted/30 transition-colors">
                          <td className={`${cellCls} text-left px-4 py-2 font-medium`}>{label}</td>
                          <td className={`${cellCls} py-2`}>{unit}</td>
                          {MONTHS_TH.map((_, mi) => (
                            <td key={mi} className={`${cellCls} p-0.5`}>
                              <NumInput value={section1[key][mi]} readOnly={isReadOnly}
                                onChange={v => setS1Row(key, mi, v)} />
                            </td>
                          ))}
                          <td className={`${totalCls} py-2 px-2 text-right font-mono text-amber-600 dark:text-amber-400`}>
                            {s1Total(key).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Section 2 Baseline ── */}
          <TabsContent value="section2b" className="flex-1 overflow-auto m-0 space-y-4">
            {/* Card 1: ข้อมูลพื้นฐาน (รายเดือน) */}
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md shadow-sm overflow-hidden">
              <div className="bg-primary/5 dark:bg-primary/10 px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-primary">ข้อมูลพื้นฐาน (รายเดือน)</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="max-w-md">
                  <label className="text-xs font-bold text-muted-foreground mb-2 block">ประเภทการบำบัดน้ำเสีย</label>
                  <Select
                    value={section2Baseline.wastewaterType[0]}
                    onValueChange={v => {
                      setSection2Baseline(prev => ({
                        ...prev,
                        wastewaterType: Array(12).fill(v)
                      }));
                    }}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="h-10 text-sm bg-muted/30 border-border/40">
                      <SelectValue placeholder="เลือกประเภทการบำบัด" />
                    </SelectTrigger>
                    <SelectContent>
                      {WASTEWATER_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <table className="border-collapse w-full text-sm min-w-[1000px]">
                    <thead>
                      <tr className="bg-primary/5 dark:bg-primary/10">
                        <th className="border border-border/40 px-4 py-2 text-left font-bold text-primary w-[200px]">รายการ</th>
                        {MONTHS_TH.map(m => <th key={m} className="border border-border/40 px-2 py-2 text-center font-bold text-primary">{m}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'operatingDays', label: 'วันเปิดบริการ (วัน)', step: 1 },
                        { key: 'staffCount',    label: 'จำนวนพนักงาน (คน)', step: 1 },
                        { key: 'waterUsed',     label: 'น้ำใช้รายเดือน (ลบ.ม.)', step: 'any' },
                      ].map((row) => (
                        <tr key={row.key} className="hover:bg-muted/20 transition-colors">
                          <td className="border border-border/30 px-4 py-3 font-medium text-foreground">{row.label}</td>
                          {MONTHS_TH.map((_, mi) => (
                            <td key={mi} className="border border-border/30 px-1 py-1">
                              <input
                                type="number"
                                step={row.step}
                                className="w-full h-9 text-center bg-muted/20 border border-border/40 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                                value={(section2Baseline[row.key as keyof Section2BaselineData] as number[])[mi] || ""}
                                disabled={isReadOnly}
                                onChange={e => setSbRow(row.key as any, mi, parseFloat(e.target.value) || 0)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Card 2: ผลคำนวณอัตโนมัติ */}
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md shadow-sm overflow-hidden">
              <div className="bg-primary/5 dark:bg-primary/10 px-4 py-3 border-b border-border/40">
                <h3 className="text-sm font-bold text-primary">ผลคำนวณอัตโนมัติ</h3>
              </div>
              <div className="p-6 overflow-x-auto text-foreground">
                <table className="border-collapse w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="border border-border/40 px-4 py-2 text-left font-bold text-foreground w-[200px]">รายการ</th>
                      {MONTHS_TH.map(m => <th key={m} className="border border-border/40 px-2 py-2 text-center font-bold text-foreground">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'methaneSeptic',     label: 'มีเทนจาก Septic Tank (kgCH4)', formula: 'วันที่เปิดบริการ * จำนวนพนักงาน * 1 * 1 * 0.3 * 40 * 0.001' },
                      { key: 'wastewater80',      label: 'น้ำเสีย 80% ของน้ำใช้ (ลบ.ม.)', formula: 'น้ำใช้รายเดือน (ลบ.ม.) * 0.8' },
                      { key: 'methaneWastewater', label: 'มีเทนจากบ่อบำบัด (kgCH4)', formula: 'น้ำเสีย 80% ของน้ำใช้ * ประเภทการบำบัดน้ำเสีย * 0.12' },
                    ].map((row) => (
                      <tr key={row.key} className="hover:bg-muted/20 transition-colors">
                        <td className="border border-border/30 px-4 py-3 font-medium text-foreground/80">
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dotted border-border/60">{row.label}</span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700 p-2">
                              <p className="text-[0.625rem] font-bold mb-1 uppercase text-slate-400">สูตรการคำนวณ:</p>
                              <code className="text-[0.6875rem] font-mono">{row.formula}</code>
                            </TooltipContent>
                          </UITooltip>
                        </td>
                        {MONTHS_TH.map((_, mi) => {
                          const val = (section2Baseline[row.key as keyof Section2BaselineData] as number[])[mi];
                          return (
                            <td key={mi} className="border border-border/30 px-2 py-3 text-center font-mono text-xs text-muted-foreground bg-muted/10">
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help w-full block">
                                    {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-slate-800 text-white border-slate-700">
                                  <p className="text-[0.625rem]">{row.formula}</p>
                                </TooltipContent>
                              </UITooltip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 4: Section 2 GHG ── */}
          <TabsContent value="section2g" className="flex-1 overflow-auto m-0">
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-md shadow-md overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 border-b border-border/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">บันทึกปริมาณการใช้รายเดือน และ Emission Factor (EF)</h3>
                    <p className="text-[0.6875rem] text-muted-foreground">กรอกค่า EF และปริมาณการใช้ในแต่ละเดือน ระบบจะคำนวณ kgCO2e ให้อัตโนมัติ</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <table className="border-collapse text-[0.8125rem] w-full min-w-[2000px] table-fixed text-foreground">
                  <thead>
                    <tr className="sticky top-0 z-20 bg-background shadow-sm">
                      <th className="sticky left-0 z-30 bg-background border-b border-r border-border/40 px-6 py-4 text-left font-bold text-foreground/80 w-[350px]">รายการ</th>
                      <th className="sticky left-[350px] z-30 bg-background border-b border-r border-border/40 px-2 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400 w-28 shadow-[1px_0_0_0_var(--border)]">Emission Factor</th>
                      {MONTHS_TH.map(m => (
                        <Fragment key={m}>
                          <th className="border-b border-r border-border/40 px-2 py-4 text-center font-bold text-foreground/60 w-32 bg-background">ปริมาณ {m}</th>
                          <th className="border-b border-r border-border/40 px-2 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400 w-32 bg-emerald-500/5">kgCO2e {m}</th>
                        </Fragment>
                      ))}
                      <th className="sticky right-0 z-30 border-b border-l border-amber-500/40 px-6 py-4 text-center font-bold text-amber-600 dark:text-amber-400 w-36 bg-background shadow-[-1px_0_0_0_var(--border)]">รวมปี (kgCO2e)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      let lastScope = 0;

                      GHG_ITEMS.forEach((item, idx) => {
                        if (item.scope !== lastScope) {
                          lastScope = item.scope;
                          
                          let customScopeLabel = "";
                          if (item.scope === 1) {
                            if (item.key === 'dieselGenerator' || item.key === 'dieselFirePump') {
                              customScopeLabel = "1. การเผาไหม้แบบอยู่กับที่ (Stationary Combustion)";
                            } else if (item.key === 'mobileDiesel') {
                              customScopeLabel = "2. การเผาไหม้แบบเคลื่อนที่ (Mobile Combustion)";
                            } else if (item.key === 'fireExtinguisher') {
                              customScopeLabel = "3. การใช้สารดับเพลิง (CO2)";
                            } else if (item.key === 'septicTank') {
                              customScopeLabel = "4. การปล่อยสารมีเทนจากระบบ septic tank";
                            } else if (item.key === 'wastewaterLagoon') {
                              customScopeLabel = "5. การปล่อยสารมีเทนจากบ่อบำบัดน้ำเสีย";
                            } else if (item.key.startsWith('refrigerant')) {
                              customScopeLabel = "6. การใช้สารทำความเย็น";
                            }
                          } else if (item.scope === 2) {
                            customScopeLabel = "7. การใช้พลังงานไฟฟ้า";
                          } else {
                            customScopeLabel = "8. การปล่อยก๊าซเรือนกระจกทางอ้อมอื่นๆ";
                          }

                          if (customScopeLabel) {
                            rows.push(
                              <tr key={`scope-header-${item.key}`} className="bg-muted/30">
                                <td className="sticky left-0 z-10 bg-background border-r border-border/40 px-6 py-3 font-bold text-foreground/80 text-sm">
                                  {customScopeLabel}
                                </td>
                                <td className="sticky left-[350px] z-10 bg-background border-r border-border/40 shadow-[1px_0_0_0_var(--border)]"></td>
                                <td colSpan={24} className="bg-transparent"></td>
                                <td className="sticky right-0 z-10 bg-background border-l border-border/40 shadow-[-1px_0_0_0_var(--border)]"></td>
                              </tr>
                            );
                          }
                        }

                        rows.push(
                          <tr key={item.key} className="hover:bg-primary/5 transition-colors group">
                            <td className="sticky left-0 z-10 bg-background group-hover:bg-muted border-r border-border/40 px-8 py-3 font-medium text-foreground/80 leading-tight">
                              {item.label} <span className="text-[0.625rem] text-muted-foreground font-normal">({item.unit})</span>
                            </td>
                            <td className="sticky left-[350px] z-10 bg-background group-hover:bg-muted border-r border-border/40 px-3 py-2 shadow-[1px_0_0_0_var(--border)]">
                              <input
                                type="number"
                                step="any"
                                className="w-full h-9 px-2 text-center text-sm border border-emerald-500/20 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono bg-muted/20 outline-none shadow-sm text-foreground"
                                value={section2Ghg[item.key].cfs[0]}
                                disabled={isReadOnly}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSection2Ghg(prev => ({
                                    ...prev,
                                    [item.key]: {
                                      ...prev[item.key],
                                      cfs: Array(12).fill(val)
                                    }
                                  }));
                                }}
                              />
                            </td>
                            {MONTHS_TH.map((_, mi) => {
                              const amount = section2Ghg[item.key].amounts[mi];
                              const ef = section2Ghg[item.key].cfs[mi];
                              const cf = amount * ef;
                              return (
                                <Fragment key={mi}>
                                  <td className="px-3 py-2 border-r border-border/20 bg-background/20">
                                    <input
                                      type="number"
                                      step="any"
                                      min={0}
                                      className="w-full h-9 px-2 text-center text-sm border border-border/40 rounded-lg focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all bg-muted/10 outline-none shadow-sm text-foreground"
                                      value={amount || ""}
                                      disabled={isReadOnly}
                                      onChange={(e) => setGhgAmount(item.key, mi, parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-3 py-2 bg-emerald-500/5 border-r border-emerald-500/10">
                                    <div className="w-full h-9 flex items-center justify-center text-center font-mono text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 rounded-lg border border-emerald-500/10">
                                      {cf === 0 ? "-" : cf.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                    </div>
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className="sticky right-0 z-10 bg-background group-hover:bg-muted border-l border-border/40 px-3 py-2 shadow-[-1px_0_0_0_var(--border)]">
                              <div className="w-full h-9 flex items-center justify-end px-3 text-right font-mono text-sm font-bold bg-muted/20 rounded-lg border border-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm">
                                {calcItemTotal(section2Ghg[item.key]).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 5: Summary ── */}
          <TabsContent value="summary" className="flex-1 overflow-auto m-0">
            <div className="space-y-8 p-6">
              
              {/* Summary Cards Section */}
              <div className="space-y-12 bg-background/40 backdrop-blur-md p-8 rounded-[2rem] border border-border/40 shadow-sm">
                {/* Row 1: สัดส่วน % tCO2e */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] px-2">สัดส่วน % tCO2e</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'ประเภทที่ 1', val: summary.scope1Tco2e, pct: summary.scope1Pct, dot: 'bg-emerald-500', unit: 'tCO2e' },
                      { label: 'ประเภทที่ 2', val: summary.scope2Tco2e, pct: summary.scope2Pct, dot: 'bg-amber-400',   unit: 'tCO2e' },
                      { label: 'ประเภทที่ 3', val: summary.scope3Tco2e, pct: summary.scope3Pct, dot: 'bg-blue-400',    unit: 'tCO2e' },
                      { label: 'รวมทั้งหมด',  val: summary.totalTco2e,  pct: 100,             dot: 'bg-emerald-700', unit: 'tCO2e', isTotal: true },
                    ].map((item) => (
                      <div key={item.label} className={`relative p-6 rounded-3xl border transition-all duration-300 hover:shadow-md ${item.isTotal ? 'bg-primary/10 border-primary/20' : 'bg-background/60 border-border/40'} flex flex-col gap-2`}>
                        <div className="flex items-center gap-2">
                          {item.isTotal ? (
                            <div className="flex items-center gap-1 text-primary font-bold text-xs uppercase tracking-tighter">
                              <TrendingUp className="w-4 h-4" /> {item.label}
                            </div>
                          ) : (
                            <>
                              <div className={`w-3 h-3 rounded-full ${item.dot} shadow-sm`} />
                              <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-black text-foreground tracking-tight">{item.pct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-wider">%tCO2e</span>
                        </div>
                        <div className="text-[0.6875rem] text-muted-foreground font-bold -mt-1">
                          {item.val.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {item.unit}
                        </div>
                        <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full shadow-sm" 
                            style={{ width: `${item.pct}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 2: สัดส่วน %GHG */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] px-2">สัดส่วน %GHG</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'ประเภทที่ 1', val: summary.scope1Tco2e * 1000, pct: summary.scope1Pct, dot: 'bg-emerald-500', unit: 'kgCO2e' },
                      { label: 'ประเภทที่ 2', val: summary.scope2Tco2e * 1000, pct: summary.scope2Pct, dot: 'bg-amber-400',   unit: 'kgCO2e' },
                      { label: 'ประเภทที่ 3', val: summary.scope3Tco2e * 1000, pct: summary.scope3Pct, dot: 'bg-blue-400',    unit: 'kgCO2e' },
                      { label: 'รวมทั้งหมด',  val: summary.totalTco2e * 1000,  pct: 100,             dot: 'bg-emerald-700', unit: 'kgCO2e', isTotal: true },
                    ].map((item) => (
                      <div key={item.label} className={`relative p-6 rounded-3xl border transition-all duration-300 hover:shadow-md ${item.isTotal ? 'bg-primary/10 border-primary/20' : 'bg-background/60 border-border/40'} flex flex-col gap-2`}>
                        <div className="flex items-center gap-2">
                          {item.isTotal ? (
                            <div className="flex items-center gap-1 text-primary font-bold text-xs uppercase tracking-tighter">
                              <TrendingUp className="w-4 h-4" /> {item.label}
                            </div>
                          ) : (
                            <>
                              <div className={`w-3 h-3 rounded-full ${item.dot} shadow-sm`} />
                              <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-black text-foreground tracking-tight">{item.pct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-wider">%GHG</span>
                        </div>
                        <div className="text-[0.6875rem] text-muted-foreground font-bold -mt-1">
                          {item.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {item.unit}
                        </div>
                        <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full shadow-sm" 
                            style={{ width: `${item.pct}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-background/60 backdrop-blur-md rounded-[2rem] border border-border/40 shadow-xl overflow-hidden">
                <div className="px-8 py-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">เปรียบเทียบรายเดือน</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Monthly Analytics Breakdown</p>
                  </div>
                  <div className="flex bg-muted p-1.5 rounded-2xl w-fit">
                    <button 
                      onClick={() => setChartView("trend")}
                      className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${chartView === "trend" ? "bg-background text-primary shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                      แนวโน้ม
                    </button>
                    <button 
                      onClick={() => setChartView("proportion")}
                      className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${chartView === "proportion" ? "bg-background text-primary shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
                      สัดส่วนรวม
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Chart Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-muted/30 rounded-[1.5rem] p-5 border border-border/40 shadow-sm">
                      <p className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2">Peak Month</p>
                      <p className="text-base font-black text-foreground">
                        {peakMonth.name} • <span className="text-primary">{peakMonth.val.toLocaleString()}</span> <span className="text-[0.6875rem] text-muted-foreground font-bold">kgCO2e</span>
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-[1.5rem] p-5 border border-border/40 shadow-sm">
                      <p className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2">Top Performer</p>
                      <p className="text-base font-black text-foreground">
                        {(() => {
                          const maxScope = summary.scope1Pct > summary.scope2Pct && summary.scope1Pct > summary.scope3Pct ? "ประเภทที่ 1" : summary.scope2Pct > summary.scope3Pct ? "ประเภทที่ 2" : "ประเภทที่ 3";
                          const maxPct = Math.max(summary.scope1Pct, summary.scope2Pct, summary.scope3Pct);
                          return (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
                              {maxScope} • {maxPct.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-[1.5rem] p-5 border border-border/40 shadow-sm">
                      <p className="text-[0.625rem] font-black text-muted-foreground uppercase tracking-widest mb-2">Growth Trend</p>
                      <p className="text-base font-black flex items-center gap-2">
                        <TrendingUp className={`w-5 h-5 ${trendQ4vsQ1 >= 0 ? "text-red-500" : "text-emerald-500"}`} />
                        <span className={trendQ4vsQ1 >= 0 ? "text-red-600" : "text-emerald-600"}>
                          {trendQ4vsQ1 >= 0 ? "+" : ""}{trendQ4vsQ1.toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actual Chart */}
                  <div className="h-[450px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartView === "trend" ? (
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#94a3b8', fontWeight: 600 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: '20px', border: 'none', background: 'var(--popover)', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '16px' }}
                            itemStyle={{ fontSize: '0.8125rem', fontWeight: 800 }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem', fontWeight: 800, paddingTop: '30px', color: '#94a3b8' }} />
                          <Line type="monotone" dataKey="ประเภทที่ 1" stroke="#10b981" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: 'var(--background)' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="ประเภทที่ 2" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: 'var(--background)' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="ประเภทที่ 3" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: 'var(--background)' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                        </LineChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#94a3b8', fontWeight: 600 }} />
                          <Tooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.4, radius: 10 }}
                            contentStyle={{ borderRadius: '20px', border: 'none', background: 'var(--popover)', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '16px' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem', fontWeight: 800, paddingTop: '30px', color: '#94a3b8' }} />
                          <Bar dataKey="ประเภทที่ 1" stackId="a" fill="#10b981" barSize={45} />
                          <Bar dataKey="ประเภทที่ 2" stackId="a" fill="#f59e0b" />
                          <Bar dataKey="ประเภทที่ 3" stackId="a" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertActionPopup
        open={showDeleteAll}
        onOpenChange={setShowDeleteAll}
        type="delete"
        trigger={<span className="hidden" />}
        title="ล้างข้อมูลทั้งหมด"
        description="ต้องการล้างข้อมูลทั้งหมดในตารางนี้หรือไม่? ค่าทุกช่องจะกลับเป็นศูนย์"
        action={handleDeleteAll}
      />

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-blue-600" />
              คัดลอกข้อมูลพื้นฐานจากปีอื่น
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-xs text-muted-foreground">
              เลือกปีที่ต้องการคัดลอกข้อมูล ส่วนที่ 1 (พื้นที่สำนักงาน และจำนวนพนักงาน) มาใช้
            </p>

            {loadingCopyList ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : copyRecords.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                ไม่มีข้อมูลปีอื่นที่จะคัดลอกได้
              </div>
            ) : (
              <Select value={copySelectedId} onValueChange={setCopySelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกปี" />
                </SelectTrigger>
                <SelectContent>
                  {copyRecords.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      ปี พ.ศ. {r.year + 543}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              disabled={!copySelectedId || copyingData || loadingCopyList}
              onClick={handleCopySection1}
              className="gap-1.5"
            >
              {copyingData && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              คัดลอก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
