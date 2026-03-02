import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import EventCard from '@/components/EventCard';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';

type Event = Tables<'events'>;
type PriceTier = Tables<'price_tiers'>;
type EventWithTiers = Event & { price_tiers: PriceTier[] };

const Index = () => {
  const [events, setEvents] = useState<EventWithTiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, price_tiers(*)')
        .order('date', { ascending: true });
      if (!error && data) {
        setEvents(data as EventWithTiers[]);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filtered = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <section className="relative py-20 overflow-hidden bg-glow">
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center space-y-6"
          >
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight">
              <span className="text-gradient">Gravity</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Descubre experiencias únicas. Compra tus entradas al instante, sin registro obligatorio.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar eventos, ciudades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container py-12">
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
          <p className="text-center text-muted-foreground py-20">
            No se encontraron eventos. {events.length === 0 && 'Inicia sesión como admin para crear eventos.'}
          </p>
        )}
      </section>
    </div>
  );
};

export default Index;
