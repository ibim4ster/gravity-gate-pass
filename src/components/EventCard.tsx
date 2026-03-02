import { Tables } from '@/integrations/supabase/types';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Event = Tables<'events'>;
type PriceTier = Tables<'price_tiers'>;

interface EventCardProps {
  event: Event & { price_tiers: PriceTier[] };
  index: number;
}

const EventCard = ({ event, index }: EventCardProps) => {
  const now = new Date();
  const availableTier = event.price_tiers.find(
    (t) => t.sold < t.max_quantity && (!t.expires_at || new Date(t.expires_at) > now)
  );
  const lowestPrice = availableTier?.price ?? event.price_tiers[0]?.price ?? 0;

  const totalSold = event.price_tiers.reduce((s, t) => s + t.sold, 0);
  const soldOutPercentage = event.capacity > 0 ? Math.round((totalSold / event.capacity) * 100) : 0;
  const almostSoldOut = soldOutPercentage >= 85;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link to={`/event/${event.id}`} className="block group">
        <div className="card-glass rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:glow-primary">
          <div className="relative h-48 overflow-hidden bg-secondary">
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10" />
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-3xl font-bold text-muted-foreground/30 tracking-widest">
                  {event.category.toUpperCase()}
                </span>
              </div>
            )}
            {almostSoldOut && (
              <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider">
                Últimas entradas
              </div>
            )}
            <div className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-medium">
              {event.category}
            </div>
          </div>

          <div className="p-5 space-y-3">
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {format(new Date(event.date), "d MMM yyyy", { locale: es })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {event.time}h
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {event.city}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  {totalSold}/{event.capacity}
                </span>
                <span className="font-display font-bold text-primary text-lg">
                  {lowestPrice}€
                </span>
              </div>
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(soldOutPercentage, 100)}%`,
                    background: almostSoldOut ? 'hsl(var(--accent))' : 'hsl(var(--primary))',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;
