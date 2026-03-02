
-- Recreate triggers safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_link_tickets ON auth.users;
CREATE TRIGGER on_auth_user_link_tickets
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_guest_tickets();

DROP TRIGGER IF EXISTS on_ticket_generate_signature ON public.tickets;
CREATE TRIGGER on_ticket_generate_signature
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_signature();

-- Add buyer fields to tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS buyer_phone text,
  ADD COLUMN IF NOT EXISTS buyer_dni text,
  ADD COLUMN IF NOT EXISTS buyer_dob date;

-- Create event_assignments table for staff/organizer assignment
CREATE TABLE IF NOT EXISTS public.event_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;

-- Use DO block to avoid policy-already-exists errors
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage event assignments') THEN
    CREATE POLICY "Admins can manage event assignments"
      ON public.event_assignments FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own assignments') THEN
    CREATE POLICY "Users can view own assignments"
      ON public.event_assignments FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Add more fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_age integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lineup text;
