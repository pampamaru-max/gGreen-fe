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
  dieselGenerator:  2.68,
  dieselFirePump:   2.68,
  mobileDiesel:     2.68,
  mobileGasohol91:  2.19,
  mobileGasohol95:  2.19,
  fireExtinguisher: 1.0,
  septicTank:       25.0,
  wastewaterLagoon: 25.0,
  refrigerantR22:   1810.0,
  refrigerantR32:   675.0,
  electricity:      0.5764,
  paperA4A3:        3.84,
  waterBMA:         0.708,
  waterProvincial:  0.708,
  wasteLandfill:    0.58,
  wasteIncinerate:  3.36,
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
  { key: 'dieselGenerator',  label: 'Diesel (Generator)',                                       unit: 'ลิตร',       scope: 1 },
  { key: 'dieselFirePump',   label: 'Diesel (Fire pump)',                                       unit: 'ลิตร',       scope: 1 },
  { key: 'mobileDiesel',     label: 'น้ำมัน Diesel',                                            unit: 'ลิตร',       scope: 1 },
  { key: 'mobileGasohol91',  label: 'น้ำมัน Gasohol 91, E20, E85',                              unit: 'ลิตร',       scope: 1 },
  { key: 'mobileGasohol95',  label: 'น้ำมัน Gasohol 95',                                        unit: 'ลิตร',       scope: 1 },
  { key: 'fireExtinguisher', label: 'การใช้สารดับเพลิง (CO₂)',                                  unit: 'kg',         scope: 1 },
  { key: 'septicTank',       label: 'การปล่อยสารมีเทนจากระบบ septic tank',                      unit: 'kgCH₄',      scope: 1 },
  { key: 'wastewaterLagoon', label: 'การปล่อยสารมีเทนจากบ่อบำบัดน้ำเสียแบบไม่เติมอากาศ',      unit: 'kgCH₄',      scope: 1 },
  { key: 'refrigerantR22',   label: 'การใช้สารทำความเย็นชนิด R22',                              unit: 'kgCHClF₂',   scope: 1 },
  { key: 'refrigerantR32',   label: 'การใช้สารทำความเย็นชนิด R32',                              unit: 'kgCH₂F₂',    scope: 1 },
  { key: 'electricity',      label: 'การใช้พลังงานไฟฟ้า',                                       unit: 'kWh',        scope: 2 },
  { key: 'paperA4A3',        label: 'การใช้กระดาษ A4 และ A3 (สีขาว)',                            unit: 'kg',         scope: 3 },
  { key: 'waterBMA',         label: 'น้ำประปา-การประปานครหลวง',                                 unit: 'm³',         scope: 3 },
  { key: 'waterProvincial',  label: 'น้ำประปา-การประปาส่วนภูมิภาค',                             unit: 'm³',         scope: 3 },
  { key: 'wasteLandfill',    label: 'ขยะของเสีย (ฝังกลบ)',                                       unit: 'kg',         scope: 3 },
  { key: 'wasteIncinerate',  label: 'ขยะของเสีย (เผาจัดการโดยใช้น้ำมันดีเซล)',                  unit: 'ลิตร',       scope: 3 },
];

export const WASTEWATER_TYPE_OPTIONS = [
  { value: '0.025', label: '0.025 : ไม่ได้รับการบำบัด' },
  { value: '0.000', label: '0 : ได้รับการบำบัด แบบเติมอากาศ' },
  { value: '0.075', label: '0.075 : ได้รับการบำบัด แบบเติมอากาศ ไม่มีการควบคุมดูแลและมีการทำงานเกินความจุ' },
  { value: '0.200a', label: '0.200 : รับการบำบัด กำจัดสัดจัดแบบไม่เติมอากาศ' },
  { value: '0.200b', label: '0.200 : รับการบำบัด Reactor แบบไม่เติมอากาศ' },
  { value: '0.050', label: '0.050 : รับการบำบัด บ่อบำบัดตื้น แบบไม่เติมอากาศ ลึกไม่เกิน 2 ม.' },
  { value: '0.200c', label: '0.200 : รับการบำบัด บ่อบำบัดลึก แบบไม่เติมอากาศ ลึกมากกว่า 2 ม.' },
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
