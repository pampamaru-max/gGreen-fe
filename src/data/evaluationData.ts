export interface ScoringCriterion {
  score: number;
  label: string;
}

export interface Indicator {
  id: string;
  name: string;
  maxScore: number;
  scoreType?: 'score' | 'yes_no' | 'upgrade';
  description?: string;
  detail?: string;
  notes?: string;
  evidenceDescription?: string;
  scoringCriteria?: ScoringCriterion[];
}

export interface Topic {
  id: string;
  name: string;
  indicators: Indicator[];
}

export interface Category {
  id: number;
  name: string;
  maxScore: number;
  topics: Topic[];
}

export const evaluationData: Category[] = [
  {
    id: 1,
    name: "กำหนดนโยบายและแผน",
    maxScore: 25,
    topics: [
      {
        id: "1.1",
        name: "การกำหนดนโยบายสิ่งแวดล้อม",
        indicators: [
          { id: "1.1.1", name: "มีการกำหนดนโยบายสิ่งแวดล้อมเป็นลายลักษณ์อักษร", maxScore: 4 },
          { id: "1.1.2", name: "นโยบายมีการลงนามโดยผู้บริหารสูงสุด", maxScore: 4 },
          { id: "1.1.3", name: "มีการสื่อสารนโยบายให้บุคลากรรับทราบ", maxScore: 4 },
          { id: "1.1.4", name: "มีการทบทวนนโยบายอย่างสม่ำเสมอ", maxScore: 4 },
        ],
      },
      {
        id: "1.2",
        name: "คณะทำงานด้านสิ่งแวดล้อม",
        indicators: [
          { id: "1.2.1", name: "มีการแต่งตั้งคณะทำงานด้านสิ่งแวดล้อม", maxScore: 4 },
          { id: "1.2.2", name: "มีการกำหนดบทบาทหน้าที่ชัดเจน", maxScore: 4 },
        ],
      },
      {
        id: "1.3",
        name: "การวิเคราะห์กิจกรรมที่ส่งผลกระทบ",
        indicators: [
          { id: "1.3.1", name: "มีการระบุกิจกรรมที่ส่งผลกระทบต่อสิ่งแวดล้อม", maxScore: 4 },
          { id: "1.3.2", name: "มีการประเมินผลกระทบด้านสิ่งแวดล้อม", maxScore: 4 },
          { id: "1.3.3", name: "มีการจัดลำดับความสำคัญของปัญหา", maxScore: 4 },
        ],
      },
      {
        id: "1.4",
        name: "กฎหมายและข้อกำหนดที่เกี่ยวข้อง",
        indicators: [
          { id: "1.4.1", name: "มีการรวบรวมกฎหมายด้านสิ่งแวดล้อมที่เกี่ยวข้อง", maxScore: 4 },
          { id: "1.4.2", name: "มีการปฏิบัติตามกฎหมายอย่างครบถ้วน", maxScore: 4 },
        ],
      },
      {
        id: "1.5",
        name: "ข้อมูลก๊าซเรือนกระจก",
        indicators: [
          { id: "1.5.1", name: "มีการเก็บข้อมูลการปล่อยก๊าซเรือนกระจก", maxScore: 4 },
          { id: "1.5.2", name: "มีการวิเคราะห์ข้อมูลก๊าซเรือนกระจก", maxScore: 4 },
          { id: "1.5.3", name: "มีแผนการลดก๊าซเรือนกระจก", maxScore: 4 },
        ],
      },
      {
        id: "1.6",
        name: "แผนงานและเป้าหมาย",
        indicators: [
          { id: "1.6.1", name: "มีการกำหนดแผนงานด้านสิ่งแวดล้อม", maxScore: 4 },
          { id: "1.6.2", name: "มีการกำหนดเป้าหมายที่ชัดเจนและวัดผลได้", maxScore: 4 },
        ],
      },
      {
        id: "1.7",
        name: "การติดตามและประเมินผล",
        indicators: [
          { id: "1.7.1", name: "มีระบบการติดตามผลการดำเนินงาน", maxScore: 4 },
          { id: "1.7.2", name: "มีการรายงานผลการดำเนินงานเป็นระยะ", maxScore: 4 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "การสื่อสารและสร้างจิตสำนึก",
    maxScore: 15,
    topics: [
      {
        id: "2.1",
        name: "การสื่อสารและเผยแพร่ข้อมูล",
        indicators: [
          { id: "2.1.1", name: "มีช่องทางการสื่อสารด้านสิ่งแวดล้อมที่หลากหลาย", maxScore: 4 },
          { id: "2.1.2", name: "มีการเผยแพร่ข้อมูลด้านสิ่งแวดล้อมอย่างสม่ำเสมอ", maxScore: 4 },
        ],
      },
      {
        id: "2.2",
        name: "การรณรงค์สร้างจิตสำนึก",
        indicators: [
          { id: "2.2.1", name: "มีกิจกรรมรณรงค์สร้างจิตสำนึกด้านสิ่งแวดล้อม", maxScore: 4 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "ใช้ทรัพยากรและพลังงาน",
    maxScore: 15,
    topics: [
      {
        id: "3.1",
        name: "การใช้ไฟฟ้า",
        indicators: [
          { id: "3.1.1", name: "มีมาตรการประหยัดไฟฟ้า", maxScore: 4 },
          { id: "3.1.2", name: "มีการติดตามปริมาณการใช้ไฟฟ้า", maxScore: 4 },
          { id: "3.1.3", name: "ปริมาณการใช้ไฟฟ้าลดลง", maxScore: 4 },
        ],
      },
      {
        id: "3.2",
        name: "การใช้น้ำมันเชื้อเพลิง",
        indicators: [
          { id: "3.2.1", name: "มีมาตรการประหยัดน้ำมันเชื้อเพลิง", maxScore: 4 },
          { id: "3.2.2", name: "มีการติดตามปริมาณการใช้น้ำมัน", maxScore: 4 },
          { id: "3.2.3", name: "มีการส่งเสริมการใช้พลังงานทดแทน", maxScore: 4 },
          { id: "3.2.4", name: "มีการบำรุงรักษายานพาหนะอย่างสม่ำเสมอ", maxScore: 4 },
          { id: "3.2.5", name: "ปริมาณการใช้น้ำมันเชื้อเพลิงลดลง", maxScore: 4 },
        ],
      },
      {
        id: "3.3",
        name: "การใช้น้ำ",
        indicators: [
          { id: "3.3.1", name: "มีมาตรการประหยัดน้ำ", maxScore: 4 },
          { id: "3.3.2", name: "มีการติดตามปริมาณการใช้น้ำ", maxScore: 4 },
          { id: "3.3.3", name: "มีการนำน้ำกลับมาใช้ใหม่", maxScore: 4 },
          { id: "3.3.4", name: "มีการบำรุงรักษาระบบน้ำ", maxScore: 4 },
          { id: "3.3.5", name: "ปริมาณการใช้น้ำลดลง", maxScore: 4 },
        ],
      },
      {
        id: "3.4",
        name: "การใช้กระดาษและทรัพยากรอื่นๆ",
        indicators: [
          { id: "3.4.1", name: "มีมาตรการลดการใช้กระดาษและทรัพยากร", maxScore: 4 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "การจัดการของเสีย",
    maxScore: 15,
    topics: [
      {
        id: "4.1",
        name: "การจัดการขยะ",
        indicators: [
          { id: "4.1.1", name: "มีการคัดแยกขยะตามประเภท", maxScore: 4 },
          { id: "4.1.2", name: "มีการลดปริมาณขยะที่แหล่งกำเนิด", maxScore: 4 },
          { id: "4.1.3", name: "ปริมาณขยะลดลง", maxScore: 4 },
        ],
      },
      {
        id: "4.2",
        name: "การจัดการน้ำเสีย",
        indicators: [
          { id: "4.2.1", name: "มีระบบบำบัดน้ำเสีย", maxScore: 4 },
          { id: "4.2.2", name: "คุณภาพน้ำทิ้งเป็นไปตามมาตรฐาน", maxScore: 4 },
        ],
      },
    ],
  },
];
