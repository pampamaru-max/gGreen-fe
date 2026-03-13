
-- Categories table
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 15,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Topics table
CREATE TABLE public.topics (
  id TEXT PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indicators table
CREATE TABLE public.indicators (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 4,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

-- Public read access (evaluation criteria are public reference data)
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Anyone can read indicators" ON public.indicators FOR SELECT USING (true);

-- Public write access for now (can be restricted to admin later)
CREATE POLICY "Anyone can insert categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete categories" ON public.categories FOR DELETE USING (is_default = false);

CREATE POLICY "Anyone can insert topics" ON public.topics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update topics" ON public.topics FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete topics" ON public.topics FOR DELETE USING (true);

CREATE POLICY "Anyone can insert indicators" ON public.indicators FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update indicators" ON public.indicators FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete indicators" ON public.indicators FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_indicators_updated_at BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default data
INSERT INTO public.categories (id, name, max_score, sort_order, is_default) VALUES
  (1, 'กำหนดนโยบายและแผน', 25, 1, true),
  (2, 'การสื่อสารและสร้างจิตสำนึก', 15, 2, true),
  (3, 'ใช้ทรัพยากรและพลังงาน', 15, 3, true),
  (4, 'การจัดการของเสีย', 15, 4, true);

SELECT setval('categories_id_seq', 4);

INSERT INTO public.topics (id, category_id, name, sort_order) VALUES
  ('1.1', 1, 'การกำหนดนโยบายสิ่งแวดล้อม', 1),
  ('1.2', 1, 'คณะทำงานด้านสิ่งแวดล้อม', 2),
  ('1.3', 1, 'การวิเคราะห์กิจกรรมที่ส่งผลกระทบ', 3),
  ('1.4', 1, 'กฎหมายและข้อกำหนดที่เกี่ยวข้อง', 4),
  ('1.5', 1, 'ข้อมูลก๊าซเรือนกระจก', 5),
  ('1.6', 1, 'แผนงานและเป้าหมาย', 6),
  ('1.7', 1, 'การติดตามและประเมินผล', 7),
  ('2.1', 2, 'การสื่อสารและเผยแพร่ข้อมูล', 1),
  ('2.2', 2, 'การรณรงค์สร้างจิตสำนึก', 2),
  ('3.1', 3, 'การใช้ไฟฟ้า', 1),
  ('3.2', 3, 'การใช้น้ำมันเชื้อเพลิง', 2),
  ('3.3', 3, 'การใช้น้ำ', 3),
  ('3.4', 3, 'การใช้กระดาษและทรัพยากรอื่นๆ', 4),
  ('4.1', 4, 'การจัดการขยะ', 1),
  ('4.2', 4, 'การจัดการน้ำเสีย', 2);

INSERT INTO public.indicators (id, topic_id, name, max_score, sort_order) VALUES
  ('1.1.1', '1.1', 'มีการกำหนดนโยบายสิ่งแวดล้อมเป็นลายลักษณ์อักษร', 4, 1),
  ('1.1.2', '1.1', 'นโยบายมีการลงนามโดยผู้บริหารสูงสุด', 4, 2),
  ('1.1.3', '1.1', 'มีการสื่อสารนโยบายให้บุคลากรรับทราบ', 4, 3),
  ('1.1.4', '1.1', 'มีการทบทวนนโยบายอย่างสม่ำเสมอ', 4, 4),
  ('1.2.1', '1.2', 'มีการแต่งตั้งคณะทำงานด้านสิ่งแวดล้อม', 4, 1),
  ('1.2.2', '1.2', 'มีการกำหนดบทบาทหน้าที่ชัดเจน', 4, 2),
  ('1.3.1', '1.3', 'มีการระบุกิจกรรมที่ส่งผลกระทบต่อสิ่งแวดล้อม', 4, 1),
  ('1.3.2', '1.3', 'มีการประเมินผลกระทบด้านสิ่งแวดล้อม', 4, 2),
  ('1.3.3', '1.3', 'มีการจัดลำดับความสำคัญของปัญหา', 4, 3),
  ('1.4.1', '1.4', 'มีการรวบรวมกฎหมายด้านสิ่งแวดล้อมที่เกี่ยวข้อง', 4, 1),
  ('1.4.2', '1.4', 'มีการปฏิบัติตามกฎหมายอย่างครบถ้วน', 4, 2),
  ('1.5.1', '1.5', 'มีการเก็บข้อมูลการปล่อยก๊าซเรือนกระจก', 4, 1),
  ('1.5.2', '1.5', 'มีการวิเคราะห์ข้อมูลก๊าซเรือนกระจก', 4, 2),
  ('1.5.3', '1.5', 'มีแผนการลดก๊าซเรือนกระจก', 4, 3),
  ('1.6.1', '1.6', 'มีการกำหนดแผนงานด้านสิ่งแวดล้อม', 4, 1),
  ('1.6.2', '1.6', 'มีการกำหนดเป้าหมายที่ชัดเจนและวัดผลได้', 4, 2),
  ('1.7.1', '1.7', 'มีระบบการติดตามผลการดำเนินงาน', 4, 1),
  ('1.7.2', '1.7', 'มีการรายงานผลการดำเนินงานเป็นระยะ', 4, 2),
  ('2.1.1', '2.1', 'มีช่องทางการสื่อสารด้านสิ่งแวดล้อมที่หลากหลาย', 4, 1),
  ('2.1.2', '2.1', 'มีการเผยแพร่ข้อมูลด้านสิ่งแวดล้อมอย่างสม่ำเสมอ', 4, 2),
  ('2.2.1', '2.2', 'มีกิจกรรมรณรงค์สร้างจิตสำนึกด้านสิ่งแวดล้อม', 4, 1),
  ('3.1.1', '3.1', 'มีมาตรการประหยัดไฟฟ้า', 4, 1),
  ('3.1.2', '3.1', 'มีการติดตามปริมาณการใช้ไฟฟ้า', 4, 2),
  ('3.1.3', '3.1', 'ปริมาณการใช้ไฟฟ้าลดลง', 4, 3),
  ('3.2.1', '3.2', 'มีมาตรการประหยัดน้ำมันเชื้อเพลิง', 4, 1),
  ('3.2.2', '3.2', 'มีการติดตามปริมาณการใช้น้ำมัน', 4, 2),
  ('3.2.3', '3.2', 'มีการส่งเสริมการใช้พลังงานทดแทน', 4, 3),
  ('3.2.4', '3.2', 'มีการบำรุงรักษายานพาหนะอย่างสม่ำเสมอ', 4, 4),
  ('3.2.5', '3.2', 'ปริมาณการใช้น้ำมันเชื้อเพลิงลดลง', 4, 5),
  ('3.3.1', '3.3', 'มีมาตรการประหยัดน้ำ', 4, 1),
  ('3.3.2', '3.3', 'มีการติดตามปริมาณการใช้น้ำ', 4, 2),
  ('3.3.3', '3.3', 'มีการนำน้ำกลับมาใช้ใหม่', 4, 3),
  ('3.3.4', '3.3', 'มีการบำรุงรักษาระบบน้ำ', 4, 4),
  ('3.3.5', '3.3', 'ปริมาณการใช้น้ำลดลง', 4, 5),
  ('3.4.1', '3.4', 'มีมาตรการลดการใช้กระดาษและทรัพยากร', 4, 1),
  ('4.1.1', '4.1', 'มีการคัดแยกขยะตามประเภท', 4, 1),
  ('4.1.2', '4.1', 'มีการลดปริมาณขยะที่แหล่งกำเนิด', 4, 2),
  ('4.1.3', '4.1', 'ปริมาณขยะลดลง', 4, 3),
  ('4.2.1', '4.2', 'มีระบบบำบัดน้ำเสีย', 4, 1),
  ('4.2.2', '4.2', 'คุณภาพน้ำทิ้งเป็นไปตามมาตรฐาน', 4, 2);
