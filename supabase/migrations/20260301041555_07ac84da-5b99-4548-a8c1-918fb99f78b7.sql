
-- Create scoring_levels table for defining score ranges and award levels
CREATE TABLE public.scoring_levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  min_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  color TEXT NOT NULL DEFAULT '#22c55e',
  icon TEXT NOT NULL DEFAULT 'trophy',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scoring_levels ENABLE ROW LEVEL SECURITY;

-- Public read, authenticated write
CREATE POLICY "Anyone can read scoring_levels" ON public.scoring_levels FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scoring_levels" ON public.scoring_levels FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update scoring_levels" ON public.scoring_levels FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete scoring_levels" ON public.scoring_levels FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_scoring_levels_updated_at
  BEFORE UPDATE ON public.scoring_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default levels (G-Green standard)
INSERT INTO public.scoring_levels (name, min_score, max_score, color, icon, sort_order) VALUES
  ('ทอง (Gold)', 80, 100, '#eab308', 'trophy', 1),
  ('เงิน (Silver)', 60, 79.99, '#9ca3af', 'medal', 2),
  ('ทองแดง (Bronze)', 40, 59.99, '#b45309', 'award', 3);
