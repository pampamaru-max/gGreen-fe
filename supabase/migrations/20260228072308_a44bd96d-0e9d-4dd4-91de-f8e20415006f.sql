
-- Create storage bucket for evaluation file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('evaluation-files', 'evaluation-files', true);

-- Allow anyone to read files
CREATE POLICY "Anyone can read evaluation files"
ON storage.objects FOR SELECT
USING (bucket_id = 'evaluation-files');

-- Allow anyone to upload files
CREATE POLICY "Anyone can upload evaluation files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evaluation-files');

-- Allow anyone to delete their files
CREATE POLICY "Anyone can delete evaluation files"
ON storage.objects FOR DELETE
USING (bucket_id = 'evaluation-files');
