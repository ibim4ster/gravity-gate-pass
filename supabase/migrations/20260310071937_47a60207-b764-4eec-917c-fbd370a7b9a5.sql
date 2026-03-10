
-- Fix 1: Drop overly permissive "Anyone can increment sold" policy
DROP POLICY IF EXISTS "Anyone can increment sold" ON public.price_tiers;

-- Fix 2: Replace storage policies with admin-only checks
DROP POLICY IF EXISTS "Admins can upload bar images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete bar images" ON storage.objects;

CREATE POLICY "Admins can upload bar images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'bar-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete bar images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'bar-images'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Fix 3: Tighten staff ticket update policy to respect event assignments
DROP POLICY IF EXISTS "Staff can update tickets" ON public.tickets;

CREATE POLICY "Staff can update tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'staff')
      AND EXISTS (
        SELECT 1 FROM public.event_assignments ea
        WHERE ea.user_id = auth.uid() AND ea.event_id = tickets.event_id
      )
    )
  );
