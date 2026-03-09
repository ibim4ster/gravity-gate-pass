
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS maps_url text;

-- Update bars with Google Maps URLs by title
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+El+Albergue+de+la+Tortilla+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Albergue%Tortilla%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+El+Tahit%C3%AD+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Tahití%' OR title ILIKE '%Tahiti%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+El+Rey+de+la+Tortilla+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Rey%Tortilla%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Juan+y+Pinchame+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Juan y Pinchame%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+Garc%C3%ADa+Jubera+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%García Jubera%' OR title ILIKE '%Garcia Jubera%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=In+Vino+Veritas+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%In Vino Veritas%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+Casita+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%La Casita%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Cueva+Calle+San+Juan+Logro%C3%B1o' WHERE title = 'Bar La Cueva' OR title ILIKE 'La Cueva';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+Fontana+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%La Fontana%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Cueva+de+Floren+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Cueva de Floren%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+Gota+de+Vino+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Gota de Vino%' OR title ILIKE '%Gota de vino%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Esquina+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%La Esquina%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+M%C3%A9ngua+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Méngua%' OR title ILIKE '%Mengua%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Pasarela+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%La Pasarela%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+Segunda+Taberna+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Segunda Taberna%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Pizarra+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%La Pizarra%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+Taberna+de+Baco+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Taberna de Baco%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Quimera+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%La Quimera%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+Taberna+del+Laurel+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Taberna del Laurel%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Traves%C3%ADa+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Travesía%' OR title ILIKE '%Travesia%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=La+Tasca+del+Pato+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Tasca del Pato%' OR title ILIKE '%Tasca del pato%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+Que+Pasada+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Que Pasada%' OR title ILIKE '%Que pasada%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+La+Universidad+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%La Universidad%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Tastavin+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Tastavín%' OR title ILIKE '%Tastavin%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Los+Rotos+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Los Rotos%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Bar+Tenessi+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Tenessi%' OR title ILIKE '%Tennessee%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Mes%C3%B3n+del+Abuelo+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Mesón del Abuelo%' OR title ILIKE '%Meson del Abuelo%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Torres+Gastrobar+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Torres%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=P%C3%A1ganos+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Páganos%' OR title ILIKE '%Paganos%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=Vin%C3%ADssimo+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Viníssimo%' OR title ILIKE '%Vinissimo%';
UPDATE public.events SET maps_url = 'https://www.google.com/maps/search/?api=1&query=El+Env%C3%A1s+Calle+San+Juan+Logro%C3%B1o' WHERE title ILIKE '%Envás%' OR title ILIKE '%Envas%';
