import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { Calendar, MapPin, Clock, Users, ArrowLeft, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = useAppStore((s) => s.events.find((e) => e.id === id));
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Evento no encontrado.</p>
      </div>
    );
  }

  const soldOutPercentage = Math.round((event.ticketsSold / event.capacity) * 100);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative h-64 md:h-80 bg-secondary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-6xl font-bold text-muted-foreground/10 tracking-[0.3em]">
            {event.category.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="container -mt-20 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          <div className="card-glass rounded-2xl p-6 md:p-8 space-y-6">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                {event.category}
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                {event.title}
              </h1>
              <p className="text-muted-foreground leading-relaxed">{event.description}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: format(new Date(event.date), "d MMMM yyyy", { locale: es }) },
                { icon: Clock, label: `${event.time}h` },
                { icon: MapPin, label: `${event.venue}, ${event.city}` },
                { icon: Users, label: `${event.ticketsSold}/${event.capacity}` },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Capacity bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Aforo</span>
                <span>{soldOutPercentage}% vendido</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${soldOutPercentage}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>

            {/* Price tiers */}
            <div className="space-y-3">
              <h3 className="font-display font-semibold text-lg">Entradas</h3>
              <div className="grid gap-3">
                {event.priceTiers.map((tier) => {
                  const soldOut = tier.sold >= tier.maxQuantity;
                  const expired = tier.expiresAt && new Date(tier.expiresAt) < new Date();
                  const unavailable = soldOut || !!expired;

                  return (
                    <button
                      key={tier.id}
                      disabled={unavailable}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectedTier === tier.id
                          ? 'border-primary bg-primary/5'
                          : unavailable
                          ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Tag className="w-4 h-4 text-primary" />
                        <div className="text-left">
                          <p className="font-medium text-foreground">{tier.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {soldOut
                              ? 'Agotado'
                              : expired
                              ? 'Expirado'
                              : `${tier.maxQuantity - tier.sold} restantes`}
                          </p>
                        </div>
                      </div>
                      <span className="font-display font-bold text-xl text-primary">{tier.price}€</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              size="lg"
              disabled={!selectedTier}
              onClick={() => navigate(`/checkout/${event.id}/${selectedTier}`)}
              className="w-full text-base font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              Comprar Entrada
            </Button>
          </div>
        </motion.div>
      </div>
      <div className="h-20" />
    </div>
  );
};

export default EventDetail;
