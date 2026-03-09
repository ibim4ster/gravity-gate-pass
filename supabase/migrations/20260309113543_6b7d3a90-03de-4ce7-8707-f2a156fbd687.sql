-- Add quantity column to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

-- Create contact_requests table for new bar requests
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  bar_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact request
CREATE POLICY "Anyone can insert contact requests"
  ON public.contact_requests FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can view contact requests
CREATE POLICY "Admins can view contact requests"
  ON public.contact_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete contact requests
CREATE POLICY "Admins can delete contact requests"
  ON public.contact_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));