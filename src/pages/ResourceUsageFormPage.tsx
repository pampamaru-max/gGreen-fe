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
import { toast } from "sonner";
import {
  ArrowLeft, Download, Trash2, CheckCircle2, Loader2, Dices,
  Building2, Users2, Check, TrendingUp, Copy,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx";
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
  background: "#f0fdf4",
  border: "1px solid #dcfce7",
} as React.CSSProperties;

const cellCls = "border border-border/60 text-center text-xs";
const headerCls = "border border-border/60 bg-[#4e8a3a] text-white text-xs font-semibold text-center px-1 py-1.5 whitespace-nowrap";
const inputCls = "h-7 w-20 text-xs text-center border-0 bg-transparent focus:ring-1 focus:ring-primary/50 rounded p-1";
const totalCls = "border border-border/60 bg-amber-50/60 dark:bg-amber-900/10 text-center text-xs font-semibold";

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
  const { role } = useUserRole();
  const isReadOnly = role !== "user";

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

    // Sheet 1 — General info
    const info = [
      [`บันทึกข้อมูลการใช้ทรัพยากร ปี พ.ศ. ${thYear}`],
      [],
      ['พื้นที่ในสำนักงาน', '', 'ตร.ม.'],
      ['เฉพาะอาคาร', officeBuilding],
      ['เฉพาะพื้นที่นอกอาคาร', officeOutdoor],
      ['จำนวนพนักงาน', '', 'คน'],
      ['พนักงานประจำ', staffPermanent],
      ['พนักงานชั่วคราว', staffTemp],
      ['ผู้รับจ้างช่วง', staffContract],
      ['รวมทั้งสิ้น', staffTotal],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), 'ข้อมูลทั่วไป');

    // Sheet 2 — Section 1
    const s1Header = ['รายการ', 'หน่วย', ...MONTHS_TH, 'รวม'];
    const s1Rows = [
      ['1. น้ำประปา', 'ลบ.ม.', ...section1.water, s1Total('water')],
      ['2. ไฟฟ้า', 'kWh', ...section1.electricity, s1Total('electricity')],
      ['3. กระดาษ', 'รีม', ...section1.paper, s1Total('paper')],
      ['4.1 ขยะทั่วไป', 'กก.', ...section1.wasteGeneral, s1Total('wasteGeneral')],
      ['4.2 ขยะรีไซเคิล', 'กก.', ...section1.wasteRecyclable, s1Total('wasteRecyclable')],
      ['4.3 เศษอาหาร', 'กก.', ...section1.wasteFood, s1Total('wasteFood')],
      ['5.1 น้ำมันดีเซล', 'ลิตร', ...section1.fuelDiesel, s1Total('fuelDiesel')],
      ['5.2 น้ำมันเบนซิน', 'ลิตร', ...section1.fuelGasoline, s1Total('fuelGasoline')],
      ['5.3 ก๊าซโซฮอลล์', 'ลิตร', ...section1.fuelGasohol, s1Total('fuelGasohol')],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([s1Header, ...s1Rows]), 'ส่วนที่ 1');

    // Sheet 3 — Section 2 Baseline
    const sbHeader = ['ข้อมูล', 'หน่วย', ...MONTHS_TH, 'รวม'];
    const sbRows = [
      ['1. วันเปิดบริการ', 'วัน', ...section2Baseline.operatingDays, sbTotal('operatingDays')],
      ['2. จำนวนพนักงาน', 'คน', ...section2Baseline.staffCount, sbTotal('staffCount')],
      ['3. มีเทน septic tank', 'kgCH4', ...section2Baseline.methaneSeptic, sbTotal('methaneSeptic')],
      ['4. ปริมาณน้ำใช้', 'ลบ.ม.', ...section2Baseline.waterUsed, sbTotal('waterUsed')],
      ['5. น้ำเสีย 80%', 'ลบ.ม.', ...section2Baseline.wastewater80, sbTotal('wastewater80')],
      ['ประเภทบำบัด', '', ...section2Baseline.wastewaterType, ''],
      ['6. มีเทนบ่อบำบัด', 'kgCH4', ...section2Baseline.methaneWastewater, sbTotal('methaneWastewater')],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([sbHeader, ...sbRows]), 'ส่วนที่ 2 ข้อมูลพื้นฐาน');

    // Sheet 4 — GHG emissions
    const ghgHeader = ['รายการ', 'หน่วย', ...MONTHS_TH.flatMap(m => [`ปริมาณ-${m}`, `CF-${m}`]), 'รวม (kgCO2e)'];
    const ghgRows = GHG_ITEMS.map(item => {
      const monthCells = MONTHS_TH.flatMap((_, i) => [section2Ghg[item.key].amounts[i], section2Ghg[item.key].cfs[i]]);
      return [item.label, item.unit, ...monthCells, calcItemTotal(section2Ghg[item.key])];
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([ghgHeader, ...ghgRows]), 'ส่วนที่ 2 GHG');

    // Sheet 5 — Summary
    const sumData = calcSummary(section2Ghg);
    const sumRows = [
      ['สรุปข้อมูลปริมาณการปลดปล่อยก๊าซเรือนกระจก'],
      [],
      ['ขอบเขตดำเนินงาน', 'tCO2e', '%GHG'],
      ['ประเภท 1 (Scope 1)', sumData.scope1Tco2e.toFixed(4), sumData.scope1Pct.toFixed(2)],
      ['ประเภท 2 (Scope 2)', sumData.scope2Tco2e.toFixed(4), sumData.scope2Pct.toFixed(2)],
      ['ประเภท 3 (Scope 3)', sumData.scope3Tco2e.toFixed(4), sumData.scope3Pct.toFixed(2)],
      ['รวม', sumData.totalTco2e.toFixed(4), '100.00'],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumRows), 'สรุป');

    XLSX.writeFile(wb, `ข้อมูลการใช้ทรัพยากร_${thYear}.xlsx`);
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
                  ? "bg-[#f0fdf4] border-[#16a34a] shadow-sm" 
                  : "bg-white border-border/60 hover:border-border/100 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold ${
                    isActive ? "bg-[#16a34a] text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-[0.625rem] font-medium ${isActive ? "text-[#16a34a]" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
                {isActive && (
                  <div className="w-5 h-5 rounded-full border border-[#16a34a] flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#16a34a]" />
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
            <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#f0fdf4] px-4 py-3 flex items-center gap-2 border-b border-emerald-50">
                <Building2 className="w-5 h-5 text-[#16a34a]" />
                <h3 className="text-sm font-bold text-[#16a34a]">พื้นที่สำนักงาน</h3>
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
                      className="h-10 text-sm bg-slate-50/50" 
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
                      className="h-10 text-sm bg-slate-50/50" 
                      disabled={isReadOnly}
                      value={officeOutdoor || ""}
                      onChange={e => setOfficeOutdoor(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">รวมพื้นที่ทั้งหมด (ตร.ม.)</label>
                    <div className="h-10 px-3 rounded-md flex items-center justify-end bg-amber-50/50 border border-amber-100 text-sm font-bold">
                      {officeTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: จำนวนพนักงาน */}
            <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#f0fdf4] px-4 py-3 flex items-center gap-2 border-b border-emerald-50">
                <Users2 className="w-5 h-5 text-[#16a34a]" />
                <h3 className="text-sm font-bold text-[#16a34a]">จำนวนพนักงาน</h3>
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
                      className="h-10 text-sm bg-slate-50/50" 
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
                      className="h-10 text-sm bg-slate-50/50" 
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
                      className="h-10 text-sm bg-slate-50/50" 
                      disabled={isReadOnly}
                      value={staffContract || ""}
                      onChange={e => setStaffContract(parseInt(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">รวมทั้งสิ้น (คน)</label>
                    <div className="h-10 px-3 rounded-md flex items-center justify-end bg-amber-50/50 border border-amber-100 text-sm font-bold">
                      {staffTotal.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 2: ส่วนที่ 1 ── */}
          <TabsContent value="section1" className="flex-1 overflow-auto m-0">
            <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#f0fdf4] px-4 py-3 border-b border-emerald-50">
                <h3 className="text-sm font-bold text-[#16a34a]">ส่วนที่ 2 ข้อมูลปริมาณการใช้ทรัพยากร พลังงาน ของเสีย</h3>
              </div>
              <div className="p-4 overflow-x-auto">
                <table className="border-collapse text-xs w-full" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th className={`${headerCls} min-w-[180px] text-left px-4 rounded-tl-lg`}>รายการ</th>
                      <th className={`${headerCls} min-w-[70px]`}>หน่วย</th>
                      {MONTHS_TH.map(m => <th key={m} className={`${headerCls} min-w-[70px]`}>{m}</th>)}
                      <th className={`${headerCls} min-w-[80px] bg-amber-600/80 rounded-tr-lg`}>รวม</th>
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
                        <tr key={key} className="hover:bg-muted/10 transition-colors">
                          <td className={`${cellCls} text-left px-4 py-2 font-medium`}>{label}</td>
                          <td className={`${cellCls} py-2`}>{unit}</td>
                          {MONTHS_TH.map((_, mi) => (
                            <td key={mi} className={`${cellCls} p-0.5`}>
                              <NumInput value={section1[key][mi]} readOnly={isReadOnly}
                                onChange={v => setS1Row(key, mi, v)} />
                            </td>
                          ))}
                          <td className={`${totalCls} py-2 px-2 text-right font-mono text-amber-700`}>
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
            <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#f0fdf4] px-4 py-3 border-b border-emerald-50 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#16a34a]">ข้อมูลพื้นฐาน (รายเดือน)</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="max-w-md">
                  <label className="text-xs font-bold text-slate-600 mb-2 block">ประเภทการบำบัดน้ำเสีย</label>
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
                    <SelectTrigger className="h-10 text-sm bg-slate-50/50 border-slate-200">
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
                      <tr className="bg-emerald-50/50">
                        <th className="border border-emerald-100 px-4 py-2 text-left font-bold text-emerald-800 w-[200px]">รายการ</th>
                        {MONTHS_TH.map(m => <th key={m} className="border border-emerald-100 px-2 py-2 text-center font-bold text-emerald-800">{m}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'operatingDays', label: 'วันเปิดบริการ (วัน)', step: 1 },
                        { key: 'staffCount',    label: 'จำนวนพนักงาน (คน)', step: 1 },
                        { key: 'waterUsed',     label: 'น้ำใช้รายเดือน (ลบ.ม.)', step: 'any' },
                      ].map((row) => (
                        <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-100 px-4 py-3 font-medium text-slate-700">{row.label}</td>
                          {MONTHS_TH.map((_, mi) => (
                            <td key={mi} className="border border-slate-100 px-1 py-1">
                              <input
                                type="number"
                                step={row.step}
                                className="w-full h-9 text-center bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-100 outline-none"
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
            <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-[#f0fdf4] px-4 py-3 border-b border-emerald-50">
                <h3 className="text-sm font-bold text-[#16a34a]">ผลคำนวณอัตโนมัติ</h3>
              </div>
              <div className="p-6 overflow-x-auto">
                <table className="border-collapse w-full text-sm min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-200 px-4 py-2 text-left font-bold text-slate-700 w-[200px]">รายการ</th>
                      {MONTHS_TH.map(m => <th key={m} className="border border-slate-200 px-2 py-2 text-center font-bold text-slate-700">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'methaneSeptic',     label: 'มีเทนจาก Septic Tank (kgCH4)', formula: 'วันที่เปิดบริการ * จำนวนพนักงาน * 1 * 1 * 0.3 * 40 * 0.001' },
                      { key: 'wastewater80',      label: 'น้ำเสีย 80% ของน้ำใช้ (ลบ.ม.)', formula: 'น้ำใช้รายเดือน (ลบ.ม.) * 0.8' },
                      { key: 'methaneWastewater', label: 'มีเทนจากบ่อบำบัด (kgCH4)', formula: 'น้ำเสีย 80% ของน้ำใช้ * ประเภทการบำบัดน้ำเสีย * 0.12' },
                    ].map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-100 px-4 py-3 font-medium text-slate-700">
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dotted border-slate-300">{row.label}</span>
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
                            <td key={mi} className="border border-slate-100 px-2 py-3 text-center font-mono text-xs text-slate-500 bg-slate-50/30">
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
            <div className="rounded-2xl border border-emerald-100 bg-white shadow-md overflow-hidden flex flex-col h-full">
              <div className="bg-gradient-to-r from-[#f0fdf4] to-white px-6 py-4 border-b border-emerald-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-900">บันทึกปริมาณการใช้รายเดือน และ Emission Factor (EF)</h3>
                    <p className="text-[0.6875rem] text-emerald-600/80">กรอกค่า EF และปริมาณการใช้ในแต่ละเดือน ระบบจะคำนวณ kgCO2e ให้อัตโนมัติ</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                <table className="border-collapse text-[0.8125rem] w-full min-w-[2000px] table-fixed">
                  <thead>
                    <tr className="sticky top-0 z-20 bg-[#f8fafc]">
                      <th className="sticky left-0 z-30 bg-[#f8fafc] border-b border-r border-slate-200 px-6 py-4 text-left font-bold text-slate-700 w-[350px]">รายการ</th>
                      <th className="sticky left-[349px] z-30 bg-[#ecfdf5] border-b border-r border-emerald-200 px-2 py-4 text-center font-bold text-emerald-800 w-28 shadow-[1px_0_0_0_#e2e8f0]">Emission Factor</th>
                      {MONTHS_TH.map(m => (
                        <Fragment key={m}>
                          <th className="border-b border-r border-slate-200 px-2 py-4 text-center font-bold text-slate-600 w-32 bg-white">ปริมาณ {m}</th>
                          <th className="border-b border-r border-slate-200 px-2 py-4 text-center font-bold text-emerald-700 w-32 bg-[#f0fdf4]">kgCO2e {m}</th>
                        </Fragment>
                      ))}
                      <th className="sticky right-0 z-30 border-b border-l border-amber-200 px-6 py-4 text-center font-bold text-amber-900 w-36 bg-[#fffbeb]">รวมปี (kgCO2e)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                              <tr key={`scope-header-${item.key}`} className="bg-slate-50/80">
                                <td className="sticky left-0 z-10 bg-[#f8fafc] border-r border-slate-200 px-6 py-3 font-bold text-slate-800 text-sm">
                                  {customScopeLabel}
                                </td>
                                <td className="sticky left-[349px] z-10 bg-[#f8fafc] border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]"></td>
                                <td colSpan={24} className="bg-slate-50/50"></td>
                                <td className="sticky right-0 z-10 bg-[#fffbeb]/50 border-l border-amber-100"></td>
                              </tr>
                            );
                          }
                        }

                        rows.push(
                          <tr key={item.key} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50 border-r border-slate-200 px-8 py-3 font-medium text-slate-700 leading-tight">
                              {item.label} <span className="text-[0.625rem] text-slate-400 font-normal">({item.unit})</span>
                            </td>
                            <td className="sticky left-[349px] z-10 bg-[#ecfdf5] group-hover:bg-[#dcfce7] border-r border-emerald-100 px-3 py-2 shadow-[1px_0_0_0_#e2e8f0]">
                              <input
                                type="number"
                                step="any"
                                className="w-full h-9 px-2 text-center text-sm border border-emerald-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all font-mono bg-white outline-none shadow-sm"
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
                                  <td className="px-3 py-2 border-r border-slate-100">
                                    <input
                                      type="number"
                                      step="any"
                                      min={0}
                                      className="w-full h-9 px-2 text-center text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white outline-none shadow-sm"
                                      value={amount || ""}
                                      disabled={isReadOnly}
                                      onChange={(e) => setGhgAmount(item.key, mi, parseFloat(e.target.value) || 0)}
                                    />
                                  </td>
                                  <td className="px-3 py-2 bg-[#f0fdf4]/20 border-r border-emerald-50/50">
                                    <div className="w-full h-9 flex items-center justify-center text-center font-mono text-xs text-emerald-700 font-semibold bg-emerald-50/40 rounded-lg border border-emerald-100/50">
                                      {cf === 0 ? "-" : cf.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                                    </div>
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className="sticky right-0 z-10 bg-[#fffbeb] group-hover:bg-[#fef3c7] border-l border-amber-200 px-3 py-2">
                              <div className="w-full h-9 flex items-center justify-end px-3 text-right font-mono text-sm font-bold bg-white rounded-lg border border-amber-200 text-amber-700 shadow-sm">
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
              <div className="space-y-12 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                {/* Row 1: สัดส่วน % tCO2e */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] px-2">สัดส่วน % tCO2e</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'ประเภทที่ 1', val: summary.scope1Tco2e, pct: summary.scope1Pct, dot: 'bg-emerald-500', unit: 'tCO2e' },
                      { label: 'ประเภทที่ 2', val: summary.scope2Tco2e, pct: summary.scope2Pct, dot: 'bg-amber-400',   unit: 'tCO2e' },
                      { label: 'ประเภทที่ 3', val: summary.scope3Tco2e, pct: summary.scope3Pct, dot: 'bg-blue-400',    unit: 'tCO2e' },
                      { label: 'รวมทั้งหมด',  val: summary.totalTco2e,  pct: 100,             dot: 'bg-emerald-700', unit: 'tCO2e', isTotal: true },
                    ].map((item) => (
                      <div key={item.label} className={`relative p-6 rounded-3xl border transition-all duration-300 hover:shadow-md ${item.isTotal ? 'bg-[#f0fdf4] border-emerald-200' : 'bg-white border-slate-200/60'} flex flex-col gap-2`}>
                        <div className="flex items-center gap-2">
                          {item.isTotal ? (
                            <div className="flex items-center gap-1 text-emerald-800 font-bold text-xs uppercase tracking-tighter">
                              <TrendingUp className="w-4 h-4" /> {item.label}
                            </div>
                          ) : (
                            <>
                              <div className={`w-3 h-3 rounded-full ${item.dot} shadow-sm`} />
                              <span className="text-xs font-bold text-slate-500">{item.label}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-black text-slate-900 tracking-tight">{item.pct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider">%tCO2e</span>
                        </div>
                        <div className="text-[0.6875rem] text-slate-500 font-bold -mt-1">
                          {item.val.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })} {item.unit}
                        </div>
                        <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full shadow-sm" 
                            style={{ width: `${item.pct}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 2: สัดส่วน %GHG */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] px-2">สัดส่วน %GHG</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'ประเภทที่ 1', val: summary.scope1Tco2e * 1000, pct: summary.scope1Pct, dot: 'bg-emerald-500', unit: 'kgCO2e' },
                      { label: 'ประเภทที่ 2', val: summary.scope2Tco2e * 1000, pct: summary.scope2Pct, dot: 'bg-amber-400',   unit: 'kgCO2e' },
                      { label: 'ประเภทที่ 3', val: summary.scope3Tco2e * 1000, pct: summary.scope3Pct, dot: 'bg-blue-400',    unit: 'kgCO2e' },
                      { label: 'รวมทั้งหมด',  val: summary.totalTco2e * 1000,  pct: 100,             dot: 'bg-emerald-700', unit: 'kgCO2e', isTotal: true },
                    ].map((item) => (
                      <div key={item.label} className={`relative p-6 rounded-3xl border transition-all duration-300 hover:shadow-md ${item.isTotal ? 'bg-[#f0fdf4] border-emerald-200' : 'bg-white border-slate-200/60'} flex flex-col gap-2`}>
                        <div className="flex items-center gap-2">
                          {item.isTotal ? (
                            <div className="flex items-center gap-1 text-emerald-800 font-bold text-xs uppercase tracking-tighter">
                              <TrendingUp className="w-4 h-4" /> {item.label}
                            </div>
                          ) : (
                            <>
                              <div className={`w-3 h-3 rounded-full ${item.dot} shadow-sm`} />
                              <span className="text-xs font-bold text-slate-500">{item.label}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-black text-slate-900 tracking-tight">{item.pct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider">%GHG</span>
                        </div>
                        <div className="text-[0.6875rem] text-slate-500 font-bold -mt-1">
                          {item.val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {item.unit}
                        </div>
                        <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 rounded-full shadow-sm" 
                            style={{ width: `${item.pct}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">เปรียบเทียบรายเดือน</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Monthly Analytics Breakdown</p>
                  </div>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
                    <button 
                      onClick={() => setChartView("trend")}
                      className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${chartView === "trend" ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-800"}`}>
                      แนวโน้ม
                    </button>
                    <button 
                      onClick={() => setChartView("proportion")}
                      className={`px-6 py-2 text-xs font-black rounded-xl transition-all ${chartView === "proportion" ? "bg-white text-blue-600 shadow-md" : "text-slate-500 hover:text-slate-800"}`}>
                      สัดส่วนรวม
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-8">
                  {/* Chart Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
                      <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-2">Peak Month</p>
                      <p className="text-base font-black text-slate-800">
                        {peakMonth.name} • <span className="text-blue-600">{peakMonth.val.toLocaleString()}</span> <span className="text-[0.6875rem] text-slate-400 font-bold">kgCO2e</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
                      <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-2">Top Performer</p>
                      <p className="text-base font-black text-slate-800">
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
                    <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
                      <p className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest mb-2">Growth Trend</p>
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
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#cbd5e1', fontWeight: 600 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                            itemStyle={{ fontSize: '0.8125rem', fontWeight: 800 }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem', fontWeight: 800, paddingTop: '30px', color: '#64748b' }} />
                          <Line type="monotone" dataKey="ประเภทที่ 1" stroke="#10b981" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: 'white' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="ประเภทที่ 2" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: 'white' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="ประเภทที่ 3" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: 'white' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                        </LineChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: '0.75rem', fill: '#cbd5e1', fontWeight: 600 }} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc', radius: 10 }}
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.75rem', fontWeight: 800, paddingTop: '30px', color: '#64748b' }} />
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
