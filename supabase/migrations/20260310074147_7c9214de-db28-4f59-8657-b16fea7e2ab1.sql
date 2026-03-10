
-- Fix 1: Drop permissive anonymous INSERT on tickets (verify-payment uses service role, bypasses RLS)
DROP POLICY IF EXISTS "Anyone can purchase tickets" ON public.tickets;

-- Fix 2: Recreate validate_and_redeem_ticket with caller role verification
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
BEGIN
  -- Verify caller is staff or admin
  IF NOT (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('status', 'invalid', 'message', 'No autorizado');
  END IF;

  SELECT * INTO _ticket FROM public.tickets WHERE qr_code = _qr_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'invalid', 'message', 'Ticket no encontrado en el sistema');
  END IF;

  SELECT title INTO _event_name FROM public.events WHERE id = _ticket.event_id;

  IF _allowed_event_ids IS NOT NULL AND NOT (_ticket.event_id = ANY(_allowed_event_ids)) THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
    VALUES (_ticket.id, _ticket.event_id, _staff_id, 'invalid', _ticket.buyer_name);
    RETURN jsonb_build_object(
      'status', 'invalid', 'message', 'Este ticket no pertenece a tu bar asignado',
      'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
    );
  END IF;

  IF _qr_signature IS NULL OR _qr_signature = '' OR _ticket.qr_signature <> _qr_signature THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
    VALUES (_ticket.id, _ticket.event_id, _staff_id, 'invalid', _ticket.buyer_name);
    RETURN jsonb_build_object(
      'status', 'invalid', 'message', 'Firma digital no válida — posible falsificación',
      'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
    );
  END IF;

  IF _ticket.status = 'used' THEN
    INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
    VALUES (_ticket.id, _ticket.event_id, _staff_id, 'already_used', _ticket.buyer_name);
    RETURN jsonb_build_object(
      'status', 'already_used', 'message', 'Ya canjeado el ' || to_char(_ticket.used_at, 'DD Mon YYYY "a las" HH24:MI'),
      'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
    );
  END IF;

  UPDATE public.tickets SET status = 'used', used_at = now(), scanned_by = _staff_id
  WHERE id = _ticket.id;

  INSERT INTO public.scan_logs (ticket_id, event_id, staff_id, result, attendee_name)
  VALUES (_ticket.id, _ticket.event_id, _staff_id, 'valid', _ticket.buyer_name);

  _ticket.status := 'used';
  _ticket.used_at := now();

  RETURN jsonb_build_object(
    'status', 'valid', 'message', 'Canje realizado con éxito',
    'ticket', row_to_json(_ticket)::jsonb, 'eventName', _event_name
  );
END;
$$;

-- Fix 3: Recreate get_ticket_by_id to strip PII for unauthenticated/non-owner callers
CREATE OR REPLACE FUNCTION public.get_ticket_by_id(_ticket_id uuid)
RETURNS TABLE (
  id uuid, event_id uuid, buyer_name text, buyer_email text, buyer_phone text,
  buyer_dni text, buyer_dob date, buyer_user_id uuid, tier_name text, price numeric,
  quantity integer, qr_code text, qr_signature text, status text,
  purchased_at timestamptz, used_at timestamptz, scanned_by uuid, price_tier_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid;
  _is_owner boolean;
  _is_privileged boolean;
BEGIN
  _caller_id := auth.uid();

  -- Check if caller is the ticket owner
  SELECT (t.buyer_user_id IS NOT NULL AND t.buyer_user_id = _caller_id)
  INTO _is_owner
  FROM public.tickets t WHERE t.id = _ticket_id;

  -- Check if caller is staff or admin
  _is_privileged := (_caller_id IS NOT NULL) AND (has_role(_caller_id, 'staff') OR has_role(_caller_id, 'admin'));

  IF _is_owner OR _is_privileged THEN
    -- Return full data for owner/staff/admin
    RETURN QUERY
    SELECT t.id, t.event_id, t.buyer_name, t.buyer_email, t.buyer_phone,
           t.buyer_dni, t.buyer_dob, t.buyer_user_id, t.tier_name, t.price,
           t.quantity, t.qr_code, t.qr_signature, t.status,
           t.purchased_at, t.used_at, t.scanned_by, t.price_tier_id
    FROM public.tickets t WHERE t.id = _ticket_id LIMIT 1;
  ELSE
    -- Return redacted data for anonymous/non-owner callers
    RETURN QUERY
    SELECT t.id, t.event_id, t.buyer_name, t.buyer_email, NULL::text, 
           NULL::text, NULL::date, t.buyer_user_id, t.tier_name, t.price,
           t.quantity, t.qr_code, t.qr_signature, t.status,
           t.purchased_at, t.used_at, t.scanned_by, t.price_tier_id
    FROM public.tickets t WHERE t.id = _ticket_id LIMIT 1;
  END IF;
END;
$$;
