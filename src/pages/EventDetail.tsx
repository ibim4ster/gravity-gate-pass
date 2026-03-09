import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { MapPin, ArrowLeft, Tag, Loader2, Image, ExternalLink, Clock, Info, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

type PriceTier = Tables<'price_tiers'> & { description?: string | null; image_urls?: string[] | null };

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase.from('events').select('*, price_tiers(*)').eq('id', id!).single();
      if (data) setEvent(data);
      setLoading(false);
    };
    if (id) fetchEvent();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  if (!event) return <div className="container py-20 text-center text-muted-foreground">Local no encontrado.</div>;

  const galleryUrls: string[] = event.gallery_urls || [];
  const mapsUrl = event.maps_url || null;
  const hasOffer = !!event.offer_active && !!event.offer_text;

  return (
    <div className="min-h-screen">
      <div className="relative h-64 md:h-80 bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <span className="font-display text-5xl font-bold text-muted-foreground/10 tracking-[0.3em] uppercase">{event.category}</span>
          </div>
        )}
      </div>

      <div className="container -mt-20 relative z-20 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>

          <div className="glass-card p-6 md:p-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">{event.category}</span>
                {hasOffer && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold">
                    <Percent className="w-3 h-3" /> Oferta
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{event.title}</h1>
              {hasOffer && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2"><Percent className="w-4 h-4" /> {event.offer_text}</p>
                </div>
              )}
              {event.description && <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-primary" /></div>
                <span>Calle San Juan, {event.city}</span>
              </div>
              {event.time && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-primary" /></div>
                  <span>Horario: {event.time}</span>
                </div>
              )}
            </div>

            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex">
                <Button variant="outline" className="rounded-xl gap-2"><MapPin className="w-4 h-4" /> Ver en Google Maps <ExternalLink className="w-3.5 h-3.5" /></Button>
              </a>
            )}

            {galleryUrls.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Image className="w-4 h-4 text-primary" /><span className="font-display">Galería</span></div>
                <div className="grid grid-cols-3 gap-2">
                  {galleryUrls.map((url, i) => (
                    <button key={i} onClick={() => setSelectedImage(url)} className="aspect-square rounded-xl overflow-hidden bg-muted hover:opacity-80 transition-opacity border border-border">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-display font-semibold text-lg">Packs disponibles</h3>
              <div className="grid gap-3">
                {(event.price_tiers || []).map((tier: PriceTier) => {
                  const soldOut = tier.sold >= tier.max_quantity;
                  const expired = tier.expires_at && new Date(tier.expires_at) < new Date();
                  const unavailable = soldOut || !!expired;
                  const tierImages = (tier as any).image_urls || [];

                  return (
                    <button key={tier.id} disabled={unavailable} onClick={() => setSelectedTier(tier.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        selectedTier === tier.id ? 'border-primary bg-primary/5' :
                        unavailable ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed' : 'border-border hover:border-primary/40'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Tag className="w-4 h-4 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{tier.name}</p>
                            <p className="text-xs text-muted-foreground">{soldOut ? 'Agotado' : expired ? 'Expirado' : `${tier.max_quantity - tier.sold} disponibles`}</p>
                          </div>
                        </div>
                        <span className="font-display font-bold text-xl text-primary">{tier.price}€</span>
                      </div>
                      {(tier as any).description && (
                        <div className="mt-2 ml-7 flex items-start gap-1.5">
                          <Info className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">{(tier as any).description}</p>
                        </div>
                      )}
                      {tierImages.length > 0 && (
                        <div className="mt-3 ml-7 flex gap-2 flex-wrap">
                          {tierImages.map((url: string, idx: number) => (
                            <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                              <img src={url} alt="" className="w-full h-full object-cover" onClick={(e) => { e.stopPropagation(); setSelectedImage(url); }} />
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button size="lg" disabled={!selectedTier} onClick={() => navigate(`/checkout/${event.id}/${selectedTier}`)}
              className="w-full text-base font-display font-semibold rounded-xl shadow-lg shadow-primary/20">
              Comprar pack
            </Button>
          </div>
        </motion.div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Galería" className="max-w-full max-h-[90vh] rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default EventDetail;
