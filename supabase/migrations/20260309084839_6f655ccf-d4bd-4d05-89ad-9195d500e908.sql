-- Add description column to price_tiers
ALTER TABLE public.price_tiers ADD COLUMN IF NOT EXISTS description text;

-- Create storage bucket for bar images
INSERT INTO storage.buckets (id, name, public) VALUES ('bar-images', 'bar-images', true) ON CONFLICT DO NOTHING;

-- Allow anyone to view bar images
CREATE POLICY "Anyone can view bar images" ON storage.objects FOR SELECT USING (bucket_id = 'bar-images');

-- Allow admins to upload bar images
CREATE POLICY "Admins can upload bar images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bar-images' AND auth.role() = 'authenticated');

-- Allow admins to delete bar images
CREATE POLICY "Admins can delete bar images" ON storage.objects FOR DELETE USING (bucket_id = 'bar-images' AND auth.role() = 'authenticated');