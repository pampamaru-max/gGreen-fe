// 12-element arrays: index 0 = มกราคม, index 11 = ธันวาคม
export type MonthlyValues = number[];

export interface Section1Data {
  water: MonthlyValues;        // ลูกบาศก์เมตร
  electricity: MonthlyValues;  // กิโลวัตต์-ชั่วโมง
  paper: MonthlyValues;        // รีม
  wasteGeneral: MonthlyValues;    // กก.
  wasteRecyclable: MonthlyValues; // กก.
  wasteFood: MonthlyValues;       // กก.
  fuelDiesel: MonthlyValues;      // ลิตร
  fuelGasoline: MonthlyValues;    // ลิตร
  fuelGasohol: MonthlyValues;     // ลิตร
}

export interface Section2BaselineData {
  operatingDays: MonthlyValues;    // วัน
  staffCount: MonthlyValues;       // คน
  methaneSeptic: MonthlyValues;    // kgCH4
  waterUsed: MonthlyValues;        // ลบ.ม.
  wastewater80: MonthlyValues;     // ลบ.ม. (auto = waterUsed * 0.8)
  wastewaterType: string[];        // factor string e.g. "0.050"
  methaneWastewater: MonthlyValues; // kgCH4
}

export interface GhgItem {
  amounts: MonthlyValues;
  cfs: MonthlyValues;
}

export interface Section2GhgData {
  dieselGenerator: GhgItem;
  dieselFirePump: GhgItem;
  mobileDiesel: GhgItem;
  mobileGasohol91: GhgItem;
  mobileGasohol95: GhgItem;
  fireExtinguisher: GhgItem;
  septicTank: GhgItem;
  wastewaterLagoon: GhgItem;
  refrigerantR22: GhgItem;
  refrigerantR32: GhgItem;
  electricity: GhgItem;
  paperA4A3: GhgItem;
  waterBMA: GhgItem;
  waterProvincial: GhgItem;
  wasteLandfill: GhgItem;
  wasteIncinerate: GhgItem;
}

export const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export const DEFAULT_CF: Record<keyof Section2GhgData, number> = {
  dieselGenerator:  2.7396,
  dieselFirePump:   2.7396,
  mobileDiesel:     2.7396,
  mobileGasohol91:  2.2376,
  mobileGasohol95:  2.2376,
  fireExtinguisher: 1.0,
  septicTank:       25.0,
  wastewaterLagoon: 25.0,
  refrigerantR22:   1810.0,
  refrigerantR32:   675.0,
  electricity:      0.4999,
  paperA4A3:        2.1018,
  waterBMA:         0.7665,
  waterProvincial:  0.7665,
  wasteLandfill:    2.5316,
  wasteIncinerate:  0.0226,
};

export const SCOPE1_KEYS: (keyof Section2GhgData)[] = [
  'dieselGenerator','dieselFirePump','mobileDiesel','mobileGasohol91','mobileGasohol95',
  'fireExtinguisher','septicTank','wastewaterLagoon','refrigerantR22','refrigerantR32',
];
export const SCOPE2_KEYS: (keyof Section2GhgData)[] = ['electricity'];
export const SCOPE3_KEYS: (keyof Section2GhgData)[] = [
  'paperA4A3','waterBMA','waterProvincial','wasteLandfill','wasteIncinerate',
];

export const GHG_ITEMS: { key: keyof Section2GhgData; label: string; unit: string; scope: 1|2|3 }[] = [
  { key: 'dieselGenerator',  label: 'น้ำมันดีเซล (Generator)', unit: 'ลิตร', scope: 1 },
  { key: 'dieselFirePump',   label: 'น้ำมันดีเซล (Fire Pump)', unit: 'ลิตร', scope: 1 },
  { key: 'mobileDiesel',     label: 'รถยนต์ใช้น้ำมันดีเซล', unit: 'ลิตร', scope: 1 },
  { key: 'mobileGasohol91',  label: 'รถยนต์ใช้น้ำมันแก๊สโซฮอลล์', unit: 'ลิตร', scope: 1 },
  { key: 'mobileGasohol95',  label: 'น้ำมัน Gasohol 95', unit: 'ลิตร', scope: 1 },
  { key: 'fireExtinguisher', label: 'สารดับเพลิง CO2', unit: 'กก.', scope: 1 },
  { key: 'septicTank',       label: 'มีเทนจาก Septic Tank', unit: 'kgCH4', scope: 1 },
  { key: 'wastewaterLagoon', label: 'มีเทนจากบ่อบำบัดน้ำเสีย', unit: 'kgCH4', scope: 1 },
  { key: 'refrigerantR22',   label: 'สารทำความเย็น R-22', unit: 'กก.', scope: 1 },
  { key: 'refrigerantR32',   label: 'สารทำความเย็น R-32', unit: 'กก.', scope: 1 },
  { key: 'electricity',      label: 'ไฟฟ้า', unit: 'kWh', scope: 2 },
  { key: 'paperA4A3',        label: 'กระดาษ', unit: 'รีม', scope: 3 },
  { key: 'waterBMA',         label: 'น้ำประปา', unit: 'ลบ.ม.', scope: 3 },
  { key: 'waterProvincial',  label: 'น้ำประปา (ภูมิภาค)', unit: 'ลบ.ม.', scope: 3 },
  { key: 'wasteLandfill',    label: 'ขยะฝังกลบ', unit: 'กก.', scope: 3 },
  { key: 'wasteIncinerate',  label: 'ขยะเผา', unit: 'กก.', scope: 3 },
];

export const WASTEWATER_TYPE_OPTIONS = [
  { value: '0.025', label: 'ไม่ได้รับการบำบัด (factor 0.025)' },
  { value: '0.000', label: 'ได้รับการบำบัด แบบเติมอากาศ (factor 0)' },
  { value: '0.075', label: 'ได้รับการบำบัด แบบเติมอากาศ ไม่มีการควบคุมดูแล (factor 0.075)' },
  { value: '0.200a', label: 'รับการบำบัด กำจัดสัดจัดแบบไม่เติมอากาศ (factor 0.2)' },
  { value: '0.200b', label: 'รับการบำบัด Reactor แบบไม่เติมอากาศ (factor 0.2)' },
  { value: '0.050', label: 'รับการบำบัด บ่อบำบัดตื้น แบบไม่เติมอากาศ (factor 0.05)' },
  { value: '0.200c', label: 'รับการบำบัด บ่อบำบัดลึก แบบไม่เติมอากาศ (factor 0.2)' },
];

export function makeMonthly(defaultVal = 0): MonthlyValues {
  return Array(12).fill(defaultVal);
}

export function makeGhgItem(defaultCf: number): GhgItem {
  return { amounts: makeMonthly(0), cfs: makeMonthly(defaultCf) };
}

export function defaultSection1(): Section1Data {
  return {
    water: makeMonthly(), electricity: makeMonthly(), paper: makeMonthly(),
    wasteGeneral: makeMonthly(), wasteRecyclable: makeMonthly(), wasteFood: makeMonthly(),
    fuelDiesel: makeMonthly(), fuelGasoline: makeMonthly(), fuelGasohol: makeMonthly(),
  };
}

export function defaultSection2Baseline(): Section2BaselineData {
  return {
    operatingDays: makeMonthly(),
    staffCount: makeMonthly(),
    methaneSeptic: makeMonthly(),
    waterUsed: makeMonthly(),
    wastewater80: makeMonthly(),
    wastewaterType: Array(12).fill('0.050'),
    methaneWastewater: makeMonthly(),
  };
}

export function defaultSection2Ghg(): Section2GhgData {
  const d = DEFAULT_CF;
  return {
    dieselGenerator:  makeGhgItem(d.dieselGenerator),
    dieselFirePump:   makeGhgItem(d.dieselFirePump),
    mobileDiesel:     makeGhgItem(d.mobileDiesel),
    mobileGasohol91:  makeGhgItem(d.mobileGasohol91),
    mobileGasohol95:  makeGhgItem(d.mobileGasohol95),
    fireExtinguisher: makeGhgItem(d.fireExtinguisher),
    septicTank:       makeGhgItem(d.septicTank),
    wastewaterLagoon: makeGhgItem(d.wastewaterLagoon),
    refrigerantR22:   makeGhgItem(d.refrigerantR22),
    refrigerantR32:   makeGhgItem(d.refrigerantR32),
    electricity:      makeGhgItem(d.electricity),
    paperA4A3:        makeGhgItem(d.paperA4A3),
    waterBMA:         makeGhgItem(d.waterBMA),
    waterProvincial:  makeGhgItem(d.waterProvincial),
    wasteLandfill:    makeGhgItem(d.wasteLandfill),
    wasteIncinerate:  makeGhgItem(d.wasteIncinerate),
  };
}

export function calcItemTotal(item: GhgItem): number {
  return item.amounts.reduce((sum, a, i) => sum + a * item.cfs[i], 0);
}

export function calcScopeTotal(ghg: Section2GhgData, keys: (keyof Section2GhgData)[]): number {
  return keys.reduce((sum, k) => sum + calcItemTotal(ghg[k]), 0);
}

export function calcSummary(ghg: Section2GhgData) {
  const s1kg = calcScopeTotal(ghg, SCOPE1_KEYS);
  const s2kg = calcScopeTotal(ghg, SCOPE2_KEYS);
  const s3kg = calcScopeTotal(ghg, SCOPE3_KEYS);
  const totalKg = s1kg + s2kg + s3kg;
  const toTco2e = (kg: number) => kg / 1000;
  const toPct = (kg: number) => totalKg === 0 ? 0 : (kg / totalKg) * 100;
  return {
    scope1Tco2e: toTco2e(s1kg),
    scope2Tco2e: toTco2e(s2kg),
    scope3Tco2e: toTco2e(s3kg),
    totalTco2e:  toTco2e(totalKg),
    scope1Pct:   toPct(s1kg),
    scope2Pct:   toPct(s2kg),
    scope3Pct:   toPct(s3kg),
  };
}

export function safeParse<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

export function mergeMonthly(saved: any, defaultVal = 0): MonthlyValues {
  if (!Array.isArray(saved)) return makeMonthly(defaultVal);
  return Array(12).fill(defaultVal).map((d, i) => (typeof saved[i] === 'number' ? saved[i] : d));
}

export function mergeGhgItem(saved: any, defaultCf: number): GhgItem {
  if (!saved) return makeGhgItem(defaultCf);
  return {
    amounts: mergeMonthly(saved.amounts, 0),
    cfs: mergeMonthly(saved.cfs, defaultCf),
  };
}
