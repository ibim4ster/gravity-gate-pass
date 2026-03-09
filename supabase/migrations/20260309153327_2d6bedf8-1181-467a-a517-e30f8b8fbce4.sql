
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS offer_text text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS offer_active boolean NOT NULL DEFAULT false;

ALTER TABLE public.price_tiers ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage settings" ON public.site_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_settings (key, value) VALUES 
  ('site_name', 'Gravity'),
  ('logo_url', '/logo-sanjuan.png'),
  ('contact_email', 'info@gravitysanjuan.com')
ON CONFLICT (key) DO NOTHING;
