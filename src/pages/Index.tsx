import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import EventCard from '@/components/EventCard';
import { motion } from 'framer-motion';
import { Search, Loader2, MapPin, ArrowRight, Wine, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

type Event = Tables<'events'>;
type PriceTier = Tables<'price_tiers'>;
type EventWithTiers = Event & { price_tiers: PriceTier[] };

const Index = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, price_tiers(*)')
        .eq('city', 'Logroño')
        .eq('status', 'active')
        .order('title', { ascending: true });

      if (!error && data) {
        setEvents(data as EventWithTiers[]);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filtered = events.filter((e) =>
    [e.title, e.city, e.category, e.venue].some((field) =>
      field?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/30" />
        <div className="container relative py-14 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center space-y-6"
          >
            <div className="flex justify-center">
              <img src="/logo-sanjuan.png" alt="La Calle San Juan · Logroño" className="h-20 md:h-28 object-contain drop-shadow-sm" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Ruta de pinchos <span className="text-primary">Calle San Juan</span>
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              Descubre los mejores bares de Logroño, compra packs de pinchos y vinos, y canjéalos con QR en segundos.
            </p>

            <div className="flex justify-center gap-6 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <span className="font-medium">{events.length} bares</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wine className="w-4 h-4 text-primary" />
                <span className="font-medium">Pinchos & vinos</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">Logroño</span>
              </div>
            </div>

            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar bares o packs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all shadow-sm"
              />
            </div>

            {!user && (
              <div className="flex justify-center pt-2">
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 shadow-sm">
                    Crear cuenta para guardar tus packs <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Bars grid */}
      <section className="pb-16">
        <div className="container">
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>{filtered.length} establecimientos en Calle San Juan</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <p className="text-muted-foreground">No se encontraron bares.</p>
            </div>
          )}
        </div>
      </section>

      {/* Map section */}
      <section className="pb-16">
        <div className="container">
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Ubicación
            </h2>
            <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1466.6!2d-2.4467!3d42.4668!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd5aa1f6a6c8e4a3%3A0x5a2c7e9b0d8e2a1!2sCalle%20San%20Juan%2C%20Logro%C3%B1o!5e0!3m2!1ses!2ses!4v1709900000000!5m2!1ses!2ses"
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Calle San Juan, Logroño"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
