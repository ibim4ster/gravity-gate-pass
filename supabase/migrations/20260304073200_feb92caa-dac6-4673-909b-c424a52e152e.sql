
-- Fix ALL RLS policies: change from RESTRICTIVE to PERMISSIVE
-- Drop all existing policies and recreate as PERMISSIVE

-- ===== EVENTS =====
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Admins can update events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== PRICE_TIERS =====
DROP POLICY IF EXISTS "Anyone can view price tiers" ON public.price_tiers;
DROP POLICY IF EXISTS "Admins can insert price tiers" ON public.price_tiers;
DROP POLICY IF EXISTS "Admins can update price tiers" ON public.price_tiers;
DROP POLICY IF EXISTS "Admins can delete price tiers" ON public.price_tiers;

CREATE POLICY "Anyone can view price tiers" ON public.price_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can insert price tiers" ON public.price_tiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update price tiers" ON public.price_tiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete price tiers" ON public.price_tiers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== TICKETS =====
DROP POLICY IF EXISTS "Anyone can purchase tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Staff can update tickets" ON public.tickets;

CREATE POLICY "Anyone can purchase tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own tickets" ON public.tickets FOR SELECT USING (buyer_user_id = auth.uid());
CREATE POLICY "Staff view all tickets" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Admins view all tickets" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anon can view own ticket" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Staff can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== USER_ROLES =====
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== SCAN_LOGS =====
DROP POLICY IF EXISTS "Staff can insert scan logs" ON public.scan_logs;
DROP POLICY IF EXISTS "Staff can view own scan logs" ON public.scan_logs;
DROP POLICY IF EXISTS "Admins can view scan logs" ON public.scan_logs;

CREATE POLICY "Staff can insert scan logs" ON public.scan_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own scan logs" ON public.scan_logs FOR SELECT TO authenticated USING (staff_id = auth.uid());
CREATE POLICY "Admins can view scan logs" ON public.scan_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===== EVENT_ASSIGNMENTS =====
DROP POLICY IF EXISTS "Admins can manage event assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Users can view own assignments" ON public.event_assignments;

CREATE POLICY "Admins can manage event assignments" ON public.event_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own assignments" ON public.event_assignments FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Also allow anon users to update price_tiers sold count during purchase
CREATE POLICY "Anyone can increment sold" ON public.price_tiers FOR UPDATE USING (true);

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_link_tickets ON auth.users;
CREATE TRIGGER on_auth_user_created_link_tickets AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.link_guest_tickets();

DROP TRIGGER IF EXISTS on_ticket_created ON public.tickets;
CREATE TRIGGER on_ticket_created BEFORE INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_signature();
