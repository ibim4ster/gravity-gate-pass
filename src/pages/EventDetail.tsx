import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Calendar, MapPin, Clock, Users, ArrowLeft, Tag, Loader2, Music, ShieldAlert, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Event = Tables<'events'>;
type PriceTier = Tables<'price_tiers'>;

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('*, price_tiers(*)')
        .eq('id', id!)
        .single();
      if (data) setEvent(data);
      setLoading(false);
    };
    if (id) fetchEvent();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  if (!event) {
    return <div className="container py-20 text-center text-muted-foreground">Evento no encontrado.</div>;
  }

  const totalSold = (event.price_tiers || []).reduce((s: number, t: PriceTier) => s + t.sold, 0);
  const soldOutPercentage = event.capacity > 0 ? Math.round((totalSold / event.capacity) * 100) : 0;
  const galleryUrls: string[] = event.gallery_urls || [];

  return (
    <div className="min-h-screen">
      {/* Hero image */}
      <div className="relative h-72 md:h-96 bg-secondary overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl font-bold text-muted-foreground/10 tracking-[0.3em]">
              {event.category.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="container -mt-24 relative z-20 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          <div className="card-glass rounded-2xl p-6 md:p-8 space-y-6">
            {/* Title & category */}
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                {event.category}
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">{event.title}</h1>
              {event.description && (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: format(new Date(event.date), "d MMMM yyyy", { locale: es }) },
                { icon: Clock, label: `${event.time}h` },
                { icon: MapPin, label: `${event.venue}, ${event.city}` },
                { icon: Users, label: `${totalSold}/${event.capacity}` },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Min age */}
            {event.min_age > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
                <ShieldAlert className="w-4 h-4" />
                Edad mínima: +{event.min_age} años
              </div>
            )}

            {/* Lineup */}
            {event.lineup && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Music className="w-4 h-4 text-primary" />
                  <span className="font-display font-semibold">Lineup</span>
                </div>
                <p className="text-muted-foreground whitespace-pre-line text-sm">{event.lineup}</p>
              </div>
            )}

            {/* Video */}
            {event.video_url && (
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Play className="w-4 h-4 text-primary" />Video</h3>
                <div className="aspect-video rounded-xl overflow-hidden bg-secondary">
                  <iframe
                    src={event.video_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {/* Gallery */}
            {galleryUrls.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-display font-semibold text-sm">Galería</h3>
                <div className="grid grid-cols-3 gap-2">
                  {galleryUrls.map((url, i) => (
                    <button key={i} onClick={() => setSelectedImage(url)} className="aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                {(event.price_tiers || []).map((tier: PriceTier) => {
                  const soldOut = tier.sold >= tier.max_quantity;
                  const expired = tier.expires_at && new Date(tier.expires_at) < new Date();
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
                            {soldOut ? 'Agotado' : expired ? 'Expirado' : `${tier.max_quantity - tier.sold} restantes`}
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

      {/* Image lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Galería" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default EventDetail;
