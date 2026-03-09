
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check CHECK (status IN ('upcoming', 'active', 'ended', 'cancelled', 'cerrado'));
ALTER TABLE public.events ALTER COLUMN status SET DEFAULT 'cerrado';

-- Deduplicate display_names before adding unique index
UPDATE public.profiles p SET display_name = p.display_name || '_' || substring(p.user_id::text, 1, 4)
WHERE p.id NOT IN (
  SELECT DISTINCT ON (lower(display_name)) id FROM public.profiles WHERE display_name IS NOT NULL ORDER BY lower(display_name), created_at ASC
) AND p.display_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_display_name_unique ON public.profiles (lower(display_name)) WHERE display_name IS NOT NULL;
