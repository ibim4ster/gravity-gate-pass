
-- Enable pgcrypto for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  city TEXT NOT NULL,
  image_url TEXT,
  capacity INTEGER NOT NULL DEFAULT 100,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'ended')),
  organizer_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create price_tiers table
CREATE TABLE public.price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  max_quantity INTEGER NOT NULL,
  sold INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  price_tier_id UUID REFERENCES public.price_tiers(id),
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_user_id UUID REFERENCES auth.users(id),
  tier_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  qr_code TEXT NOT NULL DEFAULT '',
  qr_signature TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'used', 'cancelled')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES auth.users(id)
);

-- Create scan_logs table (audit)
CREATE TABLE public.scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id),
  event_id UUID NOT NULL REFERENCES public.events(id),
  staff_id UUID NOT NULL REFERENCES auth.users(id),
  result TEXT NOT NULL CHECK (result IN ('valid', 'already_used', 'invalid')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attendee_name TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Events policies (public read, admin write)
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete events" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Price tiers policies (public read, admin write)
CREATE POLICY "Anyone can view price tiers" ON public.price_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can insert price tiers" ON public.price_tiers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update price tiers" ON public.price_tiers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete price tiers" ON public.price_tiers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tickets policies
CREATE POLICY "Users view own tickets" ON public.tickets FOR SELECT TO authenticated USING (buyer_user_id = auth.uid());
CREATE POLICY "Admins view all tickets" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff view all tickets" ON public.tickets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Anyone can purchase tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

-- Scan logs policies
CREATE POLICY "Staff can insert scan logs" ON public.scan_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view scan logs" ON public.scan_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own scan logs" ON public.scan_logs FOR SELECT TO authenticated USING (staff_id = auth.uid());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to link guest tickets when user registers
CREATE OR REPLACE FUNCTION public.link_guest_tickets()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tickets SET buyer_user_id = NEW.id
  WHERE buyer_email = NEW.email AND buyer_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_link_tickets
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_guest_tickets();

-- Function to generate unique QR code and signature
CREATE OR REPLACE FUNCTION public.generate_ticket_signature()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_signature = encode(digest(NEW.id::text || NEW.event_id::text || NEW.purchased_at::text || gen_random_uuid()::text, 'sha256'), 'hex');
  IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
    NEW.qr_code = 'GRAV-' || substring(NEW.id::text, 1, 8) || '-' || substring(NEW.qr_signature, 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_ticket_qr BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_signature();

-- Add unique constraint on qr_code
ALTER TABLE public.tickets ADD CONSTRAINT tickets_qr_code_unique UNIQUE (qr_code);

-- Index for faster lookups
CREATE INDEX idx_tickets_buyer_email ON public.tickets(buyer_email);
CREATE INDEX idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX idx_tickets_qr_code ON public.tickets(qr_code);
CREATE INDEX idx_scan_logs_event_id ON public.scan_logs(event_id);
CREATE INDEX idx_price_tiers_event_id ON public.price_tiers(event_id);
