
-- Enable pgcrypto for digest() function
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Now recreate the trigger function to use extensions.digest
CREATE OR REPLACE FUNCTION public.generate_ticket_signature()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.qr_signature = encode(extensions.digest(NEW.id::text || NEW.event_id::text || NEW.purchased_at::text || gen_random_uuid()::text, 'sha256'), 'hex');
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    NEW.qr_code = 'GRAV-' || substring(NEW.id::text, 1, 8) || '-' || substring(NEW.qr_signature, 1, 12);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_generate_ticket_signature ON public.tickets;
CREATE TRIGGER trg_generate_ticket_signature
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_signature();

-- Create trigger for handle_new_user if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for link_guest_tickets if missing
DROP TRIGGER IF EXISTS on_auth_user_created_link_tickets ON auth.users;
CREATE TRIGGER on_auth_user_created_link_tickets
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_guest_tickets();

-- Fix ALL RLS policies: Drop RESTRICTIVE ones and recreate as PERMISSIVE

-- === EVENTS ===
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- === PRICE_TIERS ===
DROP POLICY IF EXISTS "Anyone can view price tiers" ON public.price_tiers;
CREATE POLICY "Anyone can view price tiers" ON public.price_tiers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert price tiers" ON public.price_tiers;
CREATE POLICY "Admins can insert price tiers" ON public.price_tiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update price tiers" ON public.price_tiers;
CREATE POLICY "Admins can update price tiers" ON public.price_tiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can increment sold" ON public.price_tiers;
CREATE POLICY "Anyone can increment sold" ON public.price_tiers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete price tiers" ON public.price_tiers;
CREATE POLICY "Admins can delete price tiers" ON public.price_tiers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- === TICKETS ===
DROP POLICY IF EXISTS "Anyone can purchase tickets" ON public.tickets;
CREATE POLICY "Anyone can purchase tickets" ON public.tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own tickets" ON public.tickets;
CREATE POLICY "Users view own tickets" ON public.tickets FOR SELECT TO authenticated USING (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view all tickets" ON public.tickets;
CREATE POLICY "Staff view all tickets" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "Admins view all tickets" ON public.tickets;
CREATE POLICY "Admins view all tickets" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anon can view own ticket" ON public.tickets;
CREATE POLICY "Anon can view own ticket by id" ON public.tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can update tickets" ON public.tickets;
CREATE POLICY "Staff can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- === PROFILES ===
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- === SCAN_LOGS ===
DROP POLICY IF EXISTS "Staff can insert scan logs" ON public.scan_logs;
CREATE POLICY "Staff can insert scan logs" ON public.scan_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can view own scan logs" ON public.scan_logs;
CREATE POLICY "Staff can view own scan logs" ON public.scan_logs FOR SELECT TO authenticated USING (staff_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view scan logs" ON public.scan_logs;
CREATE POLICY "Admins can view scan logs" ON public.scan_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- === USER_ROLES ===
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- === EVENT_ASSIGNMENTS ===
DROP POLICY IF EXISTS "Admins can manage event assignments" ON public.event_assignments;
CREATE POLICY "Admins can manage event assignments" ON public.event_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own assignments" ON public.event_assignments;
CREATE POLICY "Users can view own assignments" ON public.event_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());
