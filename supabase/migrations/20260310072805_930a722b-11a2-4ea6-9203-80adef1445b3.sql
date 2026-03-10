
-- Fix 1: Drop overly permissive anonymous ticket SELECT policy
DROP POLICY IF EXISTS "Anon can view own ticket by id" ON public.tickets;

-- Fix 2: Tighten profiles INSERT to only allow own user_id
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix 3: Create SECURITY DEFINER RPC for unauthenticated ticket view (by ticket ID)
CREATE OR REPLACE FUNCTION public.get_ticket_by_id(_ticket_id uuid)
RETURNS TABLE (
  id uuid, event_id uuid, buyer_name text, buyer_email text, buyer_phone text,
  buyer_dni text, buyer_dob date, buyer_user_id uuid, tier_name text, price numeric,
  quantity integer, qr_code text, qr_signature text, status text,
  purchased_at timestamptz, used_at timestamptz, scanned_by uuid, price_tier_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.event_id, t.buyer_name, t.buyer_email, t.buyer_phone,
         t.buyer_dni, t.buyer_dob, t.buyer_user_id, t.tier_name, t.price,
         t.quantity, t.qr_code, t.qr_signature, t.status,
         t.purchased_at, t.used_at, t.scanned_by, t.price_tier_id
  FROM public.tickets t
  WHERE t.id = _ticket_id
  LIMIT 1;
$$;

-- Fix 4: Create SECURITY DEFINER RPC for server-side ticket validation
CREATE OR REPLACE FUNCTION public.validate_and_redeem_ticket(
  _qr_code text,
  _qr_signature text,
  _staff_id uuid,
  _allowed_event_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ticket record;
  _event_name text;
  _result text;
BEGIN
  -- Find ticket by qr_code
  SELECT * INTO _ticket FROM public.tickets WHERE qr_code = _qr_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid', 'message', 'Ticket no encontrado en el sistema');
  END IF;

  -- Get event name
  SELECT title INTO _event_name FROM public.events WHERE id = _ticket.event_id;

  -- Check event assignment for staff
  IF _allowed_event_ids IS NOT NULL AND NOT (_ticket.event_id = ANY(_allowed_event_ids)) THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
    VALUES (_ticket.id, _ticket.event_id, _staff_id, 'invalid', _ticket.buyer_name);
    RETURN jsonb_build_object(
      'status', 'invalid', 'message', 'Este ticket no pertenece a tu bar asignado',
      'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
    );
  END IF;

  -- Validate signature (ALWAYS required — never skip)
  IF _qr_signature IS NULL OR _qr_signature = '' OR _ticket.qr_signature <> _qr_signature THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
    VALUES (_ticket.id, _ticket.event_id, _staff_id, 'invalid', _ticket.buyer_name);
    RETURN jsonb_build_object(
      'status', 'invalid', 'message', 'Firma digital no válida — posible falsificación',
      'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
    );
  END IF;

  -- Check if already used
  IF _ticket.status = 'used' THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
    VALUES (_ticket.id, _ticket.event_id, _staff_id, 'already_used', _ticket.buyer_name);
    RETURN jsonb_build_object(
      'status', 'already_used', 'message', 'Ya canjeado el ' || to_char(_ticket.used_at, 'DD Mon YYYY "a las" HH24:MI'),
      'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
    );
  END IF;

  -- Redeem ticket
  UPDATE public.tickets SET status = 'used', used_at = now(), scanned_by = _staff_id
  WHERE id = _ticket.id;

  INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
  VALUES (_ticket.id, _ticket.event_id, _staff_id, 'valid', _ticket.buyer_name);

  -- Return updated ticket
  _ticket.status := 'used';
  _ticket.used_at := now();

  RETURN jsonb_build_object(
    'status', 'valid', 'message', 'Canje realizado con éxito',
    'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
  );
END;
$$;
