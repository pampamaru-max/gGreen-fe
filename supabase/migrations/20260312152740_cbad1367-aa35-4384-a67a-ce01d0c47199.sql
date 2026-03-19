
-- Drop old default first
ALTER TABLE public.programs ALTER COLUMN about DROP DEFAULT;

-- Convert about from text to jsonb
ALTER TABLE public.programs 
  ALTER COLUMN about TYPE jsonb 
  USING CASE 
    WHEN about = '' THEN '[]'::jsonb 
    ELSE jsonb_build_array(jsonb_build_object('type', 'text', 'content', about))
  END;

-- Set new default
ALTER TABLE public.programs ALTER COLUMN about SET DEFAULT '[]'::jsonb;

-- Create storage bucket for program assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('program-assets', 'program-assets', true);

-- Storage policies
CREATE POLICY "Anyone can read program assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'program-assets');
CREATE POLICY "Authenticated can upload program assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'program-assets');
CREATE POLICY "Authenticated can update program assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'program-assets');
CREATE POLICY "Authenticated can delete program assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'program-assets');
