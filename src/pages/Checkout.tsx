import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Checkout = () => {
  const { eventId, tierId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<Tables<'events'> | null>(null);
  const [tier, setTier] = useState<Tables<'price_tiers'> | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dni, setDni] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [eventRes, tierRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId!).single(),
        supabase.from('price_tiers').select('*').eq('id', tierId!).single(),
      ]);
      if (eventRes.data) setEvent(eventRes.data);
      if (tierRes.data) setTier(tierRes.data);
      setPageLoading(false);
    };
    if (eventId && tierId) fetch();
  }, [eventId, tierId]);

  useEffect(() => {
    if (user && profile) {
      setName(profile.display_name || '');
      setEmail(profile.email || user.email || '');
    }
  }, [user, profile]);

  if (pageLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }
  if (!event || !tier) {
    return <div className="container py-20 text-center text-muted-foreground">Datos no válidos.</div>;
  }

  const handlePurchase = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !dni.trim() || !dob) return;
    setLoading(true);

    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          event_id: event.id,
          price_tier_id: tier.id,
          buyer_name: name.trim(),
          buyer_email: email.trim().toLowerCase(),
          buyer_user_id: user?.id || null,
          tier_name: tier.name,
          price: tier.price,
          buyer_phone: phone.trim(),
          buyer_dni: dni.trim().toUpperCase(),
          buyer_dob: dob,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('price_tiers')
        .update({ sold: tier.sold + 1 })
        .eq('id', tier.id);

      toast.success('¡Entrada comprada con éxito!');
      navigate(`/ticket/${ticket.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al comprar');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim() && email.trim() && phone.trim() && dni.trim() && dob;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <div className="card-glass rounded-2xl p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold">Compra Express</h2>
            <p className="text-sm text-muted-foreground">Sin registro. Recibe tu ticket al instante.</p>
          </div>

          {/* Event summary */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
            <p className="font-display font-semibold text-foreground">{event.title}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" />{format(new Date(event.date), "d MMM yyyy", { locale: es })}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />{event.time}h</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />{event.venue}, {event.city}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{tier.name}</span>
              <span className="font-display text-2xl font-bold text-primary">{tier.price}€</span>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input id="name" placeholder="Nombre y apellidos" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input id="phone" type="tel" placeholder="+34 600 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI / Pasaporte *</Label>
                <Input id="dni" placeholder="12345678A" value={dni} onChange={(e) => setDni(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="dob">Fecha de nacimiento *</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="bg-secondary border-border" />
              </div>
            </div>
          </div>

          <Button
            size="lg"
            disabled={!isFormValid || loading}
            onClick={handlePurchase}
            className="w-full font-display font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</>
            ) : (
              `Pagar ${tier.price}€`
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            Pago seguro y cifrado
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Checkout;
