import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { PageLoading } from "@/components/ui/page-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertActionPopup } from "@/components/AlertActionPopup";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Trash2, CheckCircle2, Loader2, Dices,
} from "lucide-react";
import * as XLSX from "xlsx";
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

  const staffTotal = staffPermanent + staffTemp + staffContract;
  const summary = useMemo(() => calcSummary(section2Ghg), [section2Ghg]);

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

  // Section 2 baseline helpers
  const setSbRow = (key: keyof Section2BaselineData, month: number, val: number | string) => {
    setSection2Baseline(prev => ({
      ...prev,
      [key]: (prev[key] as any[]).map((v, i) => i === month ? val : v),
    }));
  };
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

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4">
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
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />กำลังบันทึก...
              </span>
            ) : savedAt ? (
              <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />บันทึกอัตโนมัติ {savedAt.toLocaleTimeString('th-TH')}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">กรอกข้อมูลแล้วระบบจะบันทึกอัตโนมัติ</span>
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

      {/* Tabs */}
      <div className="flex-1 min-h-0 rounded-2xl overflow-hidden" style={glassCard}>
        <Tabs defaultValue="general" className="h-full flex flex-col">
          <div className="px-4 pt-3 shrink-0 border-b border-border/40">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="general" className="text-xs px-3">ข้อมูลทั่วไป</TabsTrigger>
              <TabsTrigger value="section1" className="text-xs px-3">ส่วนที่ 1</TabsTrigger>
              <TabsTrigger value="section2b" className="text-xs px-3">ส่วนที่ 2 พื้นฐาน</TabsTrigger>
              <TabsTrigger value="section2g" className="text-xs px-3">ส่วนที่ 2 GHG</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs px-3">สรุปผล</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Tab 1: ข้อมูลทั่วไป ── */}
          <TabsContent value="general" className="flex-1 overflow-y-auto m-0">
            <div className="p-4 max-w-xl space-y-5">
              <h3 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>
                บันทึกข้อมูลการใช้ทรัพยากร ปี พ.ศ. {thYear}
              </h3>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">พื้นที่ในสำนักงาน</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block">เฉพาะอาคาร ขนาด *</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} step="any" className="h-8 text-xs" disabled={isReadOnly}
                        value={officeBuilding || ""}
                        onChange={e => setOfficeBuilding(parseFloat(e.target.value) || 0)} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">ตารางเมตร</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">เฉพาะพื้นที่นอกอาคาร ขนาด *</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} step="any" className="h-8 text-xs" disabled={isReadOnly}
                        value={officeOutdoor || ""}
                        onChange={e => setOfficeOutdoor(parseFloat(e.target.value) || 0)} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">ตารางเมตร</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">จำนวนพนักงานภายในสำนักงาน</p>
                {[
                  { label: 'พนักงานประจำ *', hint: '(ไม่มีพนักงานประจำ ให้กรอกเลข 0)', val: staffPermanent, set: setStaffPermanent },
                  { label: 'พนักงานชั่วคราว *', hint: '(ไม่มีพนักงานชั่วคราว ให้กรอกเลข 0)', val: staffTemp, set: setStaffTemp },
                  { label: 'ผู้รับจ้างช่วง *', hint: '(ไม่มีผู้รับจ้างช่วง ให้กรอกเลข 0)', val: staffContract, set: setStaffContract },
                ].map(({ label, hint, val, set }) => (
                  <div key={label} className="flex items-center gap-3">
                    <label className="text-xs w-36 shrink-0">{label}</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} step={1} className="h-8 text-xs w-24" disabled={isReadOnly}
                        value={val || ""}
                        onChange={e => set(parseInt(e.target.value) || 0)} />
                      <span className="text-xs text-muted-foreground">คน {hint}</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                  <label className="text-xs w-36 shrink-0 font-semibold">รวมทั้งสิ้น *</label>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-24 border border-border/60 rounded-md flex items-center justify-center bg-muted/30 text-xs font-bold">
                      {staffTotal}
                    </div>
                    <span className="text-xs text-muted-foreground">คน</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 2: ส่วนที่ 1 ── */}
          <TabsContent value="section1" className="flex-1 overflow-auto m-0">
            <div className="p-3">
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--green-heading)" }}>
                ส่วนที่ 1 ข้อมูลปริมาณการใช้ทรัพยากร พลังงาน ของเสีย
              </h3>
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th className={`${headerCls} min-w-[180px] text-left px-2`}>รายการ</th>
                      <th className={`${headerCls} min-w-[70px]`}>หน่วย</th>
                      {MONTHS_TH.map(m => <th key={m} className={`${headerCls} min-w-[70px]`}>{m}</th>)}
                      <th className={`${headerCls} min-w-[80px] bg-amber-600/80`}>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { key: 'water',           label: '1. ปริมาณการใช้น้ำประปา',       unit: 'ลบ.ม.' },
                      { key: 'electricity',     label: '2. ปริมาณการใช้ไฟฟ้า',          unit: 'kWh' },
                      { key: 'electricity',     label: '', unit: '', spacer: true } as any,
                      { key: 'paper',           label: '3. ปริมาณการใช้กระดาษ',         unit: 'รีม' },
                      { key: 'wasteGeneral',    label: '4.1 ขยะทั่วไป',                 unit: 'กก.' },
                      { key: 'wasteRecyclable', label: '4.2 ขยะรีไซเคิล',              unit: 'กก.' },
                      { key: 'wasteFood',       label: '4.3 เศษอาหาร',                  unit: 'กก.' },
                      { key: 'fuelDiesel',      label: '5.1 น้ำมันดีเซล',               unit: 'ลิตร' },
                      { key: 'fuelGasoline',    label: '5.2 น้ำมันเบนซิน',              unit: 'ลิตร' },
                      { key: 'fuelGasohol',     label: '5.3 ก๊าซโซฮอลล์',              unit: 'ลิตร' },
                    ] as { key: keyof Section1Data; label: string; unit: string; spacer?: boolean }[])
                      .filter(r => !r.spacer)
                      .map(({ key, label, unit }) => (
                        <tr key={key} className="hover:bg-muted/10">
                          <td className={`${cellCls} text-left px-2 py-1 font-medium`}>{label}</td>
                          <td className={`${cellCls} py-1`}>{unit}</td>
                          {MONTHS_TH.map((_, mi) => (
                            <td key={mi} className={`${cellCls} p-0.5`}>
                              <NumInput value={section1[key][mi]} readOnly={isReadOnly}
                                onChange={v => setS1Row(key, mi, v)} />
                            </td>
                          ))}
                          <td className={`${totalCls} py-1 px-2`}>
                            {s1Total(key).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className={`${cellCls} bg-[#4e8a3a]/10 font-bold px-2 py-1.5`}></td>
                      {MONTHS_TH.map(m => <td key={m} className={`${headerCls}`}>{m}</td>)}
                      <td className={`${headerCls} bg-amber-600/80`}>รวม</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Section 2 Baseline ── */}
          <TabsContent value="section2b" className="flex-1 overflow-auto m-0">
            <div className="p-3">
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--green-heading)" }}>
                ส่วนที่ 2 ข้อมูลปริมาณการปลดปล่อยก๊าซเรือนกระจก
              </h3>
              <p className="text-xs text-muted-foreground mb-3">ข้อมูลพื้นฐาน</p>
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th className={`${headerCls} min-w-[230px] text-left px-2`}>ข้อมูล</th>
                      <th className={`${headerCls} min-w-[70px]`}>หน่วย</th>
                      {MONTHS_TH.map(m => <th key={m} className={`${headerCls} min-w-[75px]`}>{m}</th>)}
                      <th className={`${headerCls} min-w-[80px] bg-amber-600/80`}>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { key: 'operatingDays',     label: '1. จำนวนวันเปิดบริการ/ทำการ',                              unit: 'วัน' },
                      { key: 'staffCount',        label: '2. จำนวนพนักงานองค์กร',                                    unit: 'คน' },
                      { key: 'methaneSeptic',     label: '3. การปล่อยสารมีเทนจากระบบ septic tank',                   unit: 'kgCH₄' },
                      { key: 'waterUsed',         label: '4. ปริมาณน้ำใช้ในรอบปี',                                    unit: 'ลบ.ม.' },
                      { key: 'wastewater80',      label: '5. ปริมาณน้ำเสียคิดเป็น 80%',                              unit: 'ลบ.ม.' },
                      { key: 'methaneWastewater', label: '6. การปล่อยสารมีเทนจากบ่อบำบัดน้ำเสียแบบไม่เติมอากาศ', unit: 'kgCH₄' },
                    ] as { key: keyof Omit<Section2BaselineData,'wastewaterType'>; label: string; unit: string }[])
                      .map(({ key, label, unit }) => {
                        const isAuto = key === 'wastewater80';
                        return (
                          <tr key={key} className="hover:bg-muted/10">
                            <td className={`${cellCls} text-left px-2 py-1 font-medium`}>{label}</td>
                            <td className={`${cellCls} py-1`}>{unit}</td>
                            {MONTHS_TH.map((_, mi) => {
                              const autoVal = isAuto ? +(section2Baseline.waterUsed[mi] * 0.8).toFixed(3) : null;
                              return (
                                <td key={mi} className={`${cellCls} p-0.5`}>
                                  {isAuto ? (
                                    <span className="block text-center text-[11px] text-muted-foreground">
                                      {autoVal === 0 ? "-" : autoVal}
                                    </span>
                                  ) : (
                                    <NumInput value={section2Baseline[key][mi] as number} readOnly={isReadOnly}
                                      onChange={v => setSbRow(key, mi, v)} />
                                  )}
                                </td>
                              );
                            })}
                            <td className={`${totalCls} py-1 px-2`}>
                              {isAuto
                                ? (section2Baseline.waterUsed.reduce((a, b) => a + b, 0) * 0.8).toFixed(3)
                                : sbTotal(key).toLocaleString()
                              }
                            </td>
                          </tr>
                        );
                      })}
                    {/* Wastewater type dropdown row */}
                    <tr className="hover:bg-muted/10">
                      <td className={`${cellCls} text-left px-2 py-1 font-medium pl-6`} colSpan={2}>
                        ประเภทการบำบัดน้ำเสีย
                      </td>
                      {MONTHS_TH.map((_, mi) => (
                        <td key={mi} className={`${cellCls} p-0.5`}>
                          {isReadOnly ? (
                            <span className="text-[10px]">{section2Baseline.wastewaterType[mi]}</span>
                          ) : (
                            <Select
                              value={section2Baseline.wastewaterType[mi]}
                              onValueChange={v => setSbRow('wastewaterType', mi, v)}
                            >
                              <SelectTrigger className="h-7 text-[10px] border-0 bg-transparent px-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {WASTEWATER_TYPE_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      ))}
                      <td className={`${totalCls} py-1 px-2`}></td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className={`${cellCls} bg-[#4e8a3a]/10 px-2 py-1.5`}></td>
                      {MONTHS_TH.map(m => <td key={m} className={`${headerCls}`}>{m}</td>)}
                      <td className={`${headerCls} bg-amber-600/80`}>รวม</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 4: Section 2 GHG ── */}
          <TabsContent value="section2g" className="flex-1 overflow-auto m-0">
            <div className="p-3">
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--green-heading)" }}>
                ข้อมูลปริมาณก๊าซเรือนกระจก (kgCO₂e)
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                แต่ละรายการมี 2 แถวต่อเดือน: ปริมาณ (บรรทัดบน) และ CF (บรรทัดล่าง สีเขียว)
              </p>
              <div className="overflow-x-auto">
                <table className="border-collapse text-xs" style={{ minWidth: 1400 }}>
                  <thead>
                    <tr>
                      <th className={`${headerCls} min-w-[220px] text-left px-2`} rowSpan={2}>รายการ</th>
                      <th className={`${headerCls} min-w-[70px]`} rowSpan={2}>หน่วย</th>
                      {MONTHS_TH.map(m => (
                        <th key={m} className={`${headerCls} min-w-[130px]`} colSpan={2}>{m}</th>
                      ))}
                      <th className={`${headerCls} min-w-[90px] bg-amber-600/80`} rowSpan={2}>รวม (kgCO₂e)</th>
                    </tr>
                    <tr>
                      {MONTHS_TH.flatMap((m, i) => [
                        <th key={`a${i}`} className={`${headerCls} text-[10px]`}>ปริมาณ</th>,
                        <th key={`c${i}`} className={`${headerCls} text-[10px] bg-[#3a7d2c]/80`}>CF</th>,
                      ])}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Scope section labels */}
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      let lastScope = 0;
                      GHG_ITEMS.forEach((item, idx) => {
                        if (item.scope !== lastScope) {
                          lastScope = item.scope;
                          const scopeLabel = item.scope === 1
                            ? '1. การเผาไหม้แบบอยู่กับที่ / เคลื่อนที่ / การปล่อยโดยตรง (Scope 1)'
                            : item.scope === 2
                            ? '2. การใช้พลังงานไฟฟ้า (Scope 2)'
                            : '3. การปล่อยทางอ้อม (Scope 3)';
                          rows.push(
                            <tr key={`scope-${item.scope}`} className="bg-[#4e8a3a]/10">
                              <td colSpan={2 + 24 + 1} className={`${cellCls} text-left px-2 py-1.5 font-bold text-primary`}>
                                {scopeLabel}
                              </td>
                            </tr>
                          );
                        }
                        rows.push(
                          <tr key={item.key} className="hover:bg-muted/10">
                            <td className={`${cellCls} text-left px-2 py-1 font-medium`}>{item.label}</td>
                            <td className={`${cellCls} py-1 text-center`}>{item.unit}</td>
                            {MONTHS_TH.map((_, mi) => [
                              <td key={`a${mi}`} className={`${cellCls} p-0.5`}>
                                <NumInput value={section2Ghg[item.key].amounts[mi]} readOnly={isReadOnly}
                                  onChange={v => setGhgAmount(item.key, mi, v)} />
                              </td>,
                              <td key={`c${mi}`} className="border border-border/60 p-0.5 bg-[#3a7d2c]/10">
                                <NumInput value={section2Ghg[item.key].cfs[mi]} readOnly={isReadOnly}
                                  onChange={v => setGhgCf(item.key, mi, v)} className="w-20 text-[10px]" />
                              </td>,
                            ])}
                            <td className={`${totalCls} py-1 px-2`}>
                              {calcItemTotal(section2Ghg[item.key]).toFixed(4)}
                            </td>
                          </tr>
                        );
                      });
                      return rows;
                    })()}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className={`${cellCls} bg-[#4e8a3a]/10 px-2 py-1.5 font-bold`}>รวม</td>
                      {MONTHS_TH.flatMap((_, mi) => [
                        <td key={`fa${mi}`} className={`${cellCls} text-center text-[10px] font-bold py-1 bg-[#4e8a3a]/10`}>
                          {GHG_ITEMS.reduce((s, it) => s + section2Ghg[it.key].amounts[mi] * section2Ghg[it.key].cfs[mi], 0).toFixed(2)}
                        </td>,
                        <td key={`fc${mi}`} className={`${cellCls} bg-[#3a7d2c]/10`}></td>,
                      ])}
                      <td className={`${totalCls} font-bold py-1 px-2`}>
                        {GHG_ITEMS.reduce((s, it) => s + calcItemTotal(section2Ghg[it.key]), 0).toFixed(4)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 5: Summary ── */}
          <TabsContent value="summary" className="flex-1 overflow-auto m-0">
            <div className="p-4 max-w-2xl space-y-6">
              <h3 className="text-sm font-bold" style={{ color: "var(--green-heading)" }}>
                สรุปข้อมูลปริมาณการปลดปล่อยก๊าซเรือนกระจก
              </h3>

              <table className="border-collapse w-full text-sm">
                <thead>
                  <tr>
                    <th className={`${headerCls} text-left px-3 min-w-[200px]`}>ขอบเขตดำเนินงาน</th>
                    <th className={`${headerCls} min-w-[140px]`}>tCO₂e</th>
                    <th className={`${headerCls} min-w-[100px]`}>%GHG</th>
                    <th className={`${headerCls} min-w-[80px]`}>หน่วย</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'ประเภท 1 (Scope 1)', tco2e: summary.scope1Tco2e, pct: summary.scope1Pct },
                    { label: 'ประเภท 2 (Scope 2)', tco2e: summary.scope2Tco2e, pct: summary.scope2Pct },
                    { label: 'ประเภท 3 (Scope 3)', tco2e: summary.scope3Tco2e, pct: summary.scope3Pct },
                  ].map(({ label, tco2e, pct }) => (
                    <tr key={label} className="hover:bg-muted/10">
                      <td className={`${cellCls} text-left px-3 py-2`}>{label}</td>
                      <td className={`${cellCls} py-2 font-mono`}>
                        <Input readOnly className="h-8 text-xs text-center" value={tco2e.toFixed(4)} />
                      </td>
                      <td className={`${cellCls} py-2 font-mono`}>
                        <Input readOnly className="h-8 text-xs text-center" value={pct.toFixed(2)} />
                      </td>
                      <td className={`${cellCls} py-2`}>tCO₂e</td>
                    </tr>
                  ))}
                  <tr className="bg-[#4e8a3a]/10 font-bold">
                    <td className={`${cellCls} text-left px-3 py-2`}>รวม</td>
                    <td className={`${cellCls} py-2 font-mono`}>
                      <Input readOnly className="h-8 text-xs text-center font-bold" value={summary.totalTco2e.toFixed(4)} />
                    </td>
                    <td className={`${cellCls} py-2 font-mono`}>
                      <Input readOnly className="h-8 text-xs text-center" value="100.00" />
                    </td>
                    <td className={`${cellCls} py-2`}>tCO₂e</td>
                  </tr>
                </tbody>
              </table>

              {/* Breakdown by scope items */}
              <div className="space-y-3">
                {[
                  { title: 'Scope 1 (ประเภท 1)', keys: SCOPE1_KEYS, color: '#dc2626' },
                  { title: 'Scope 2 (ประเภท 2)', keys: SCOPE2_KEYS, color: '#2563eb' },
                  { title: 'Scope 3 (ประเภท 3)', keys: SCOPE3_KEYS, color: '#16a34a' },
                ].map(({ title, keys, color }) => (
                  <div key={title}>
                    <p className="text-xs font-semibold mb-1" style={{ color }}>{title}</p>
                    <table className="border-collapse w-full text-xs">
                      <tbody>
                        {keys.map(k => {
                          const item = GHG_ITEMS.find(g => g.key === k)!;
                          const kgco2e = calcItemTotal(section2Ghg[k]);
                          return (
                            <tr key={k} className="hover:bg-muted/10">
                              <td className={`${cellCls} text-left px-2 py-1`}>{item.label}</td>
                              <td className={`${cellCls} text-right px-2 py-1 font-mono`}>{kgco2e.toFixed(2)} kgCO₂e</td>
                              <td className={`${cellCls} text-right px-2 py-1 font-mono`}>{(kgco2e / 1000).toFixed(6)} tCO₂e</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
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
    </div>
  );
}
