
-- Create certificate_templates table linked to scoring_levels
CREATE TABLE public.certificate_templates (
  id SERIAL PRIMARY KEY,
  scoring_level_id INTEGER REFERENCES public.scoring_levels(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'ใบประกาศนียบัตร',
  subtitle TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT 'ขอมอบใบประกาศนียบัตรฉบับนี้ให้แก่',
  footer_text TEXT NOT NULL DEFAULT '',
  signer_name TEXT NOT NULL DEFAULT '',
  signer_title TEXT NOT NULL DEFAULT '',
  bg_image_url TEXT,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1a5632',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scoring_level_id)
);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read certificate_templates" ON public.certificate_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert certificate_templates" ON public.certificate_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update certificate_templates" ON public.certificate_templates FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete certificate_templates" ON public.certificate_templates FOR DELETE USING (true);

CREATE TRIGGER update_certificate_templates_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for certificate assets
INSERT INTO storage.buckets (id, name, public) VALUES ('certificate-assets', 'certificate-assets', true);

CREATE POLICY "Anyone can read certificate assets" ON storage.objects FOR SELECT USING (bucket_id = 'certificate-assets');
CREATE POLICY "Anyone can upload certificate assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificate-assets');
CREATE POLICY "Anyone can update certificate assets" ON storage.objects FOR UPDATE USING (bucket_id = 'certificate-assets');
CREATE POLICY "Anyone can delete certificate assets" ON storage.objects FOR DELETE USING (bucket_id = 'certificate-assets');
