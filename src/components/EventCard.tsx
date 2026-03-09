import { Tables } from '@/integrations/supabase/types';
import { MapPin, Tag, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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
  const packCount = event.price_tiers.length;
  const hasOffer = !!(event as any).offer_active && !!(event as any).offer_text;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/event/${event.id}`} className="block group">
        <div className="glass-card-hover overflow-hidden relative">
          {hasOffer && (
            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-lg">
              <Percent className="w-3 h-3" /> Oferta
            </div>
          )}
          <div className="relative h-48 overflow-hidden bg-muted">
            <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent z-10" />
            {event.image_url ? (
              <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                <span className="font-display text-2xl font-bold text-muted-foreground/20 tracking-widest uppercase">{event.category}</span>
              </div>
            )}
          </div>

          <div className="p-5 space-y-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-primary">{event.category}</span>
              <h3 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">{event.title}</h3>
            </div>
            {hasOffer && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">{(event as any).offer_text}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Calle San Juan, {event.city}</span>
              <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" />{packCount} {packCount === 1 ? 'pack' : 'packs'}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Desde</span>
              <span className="font-display font-bold text-lg text-primary">{lowestPrice > 0 ? `${lowestPrice}€` : 'Gratis'}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EventCard;
