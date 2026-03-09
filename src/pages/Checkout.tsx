import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Loader2, MapPin, Clock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const Checkout = () => {
  const { eventId, tierId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<Tables<'events'> | null>(null);
  const [tier, setTier] = useState<any>(null);
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

  if (pageLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  if (!event || !tier) return <div className="container py-20 text-center text-muted-foreground">Datos no válidos.</div>;

  const handlePurchase = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !dni.trim() || !dob) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          eventId: event.id,
          tierId: tier.id,
          buyerName: name.trim(),
          buyerEmail: email.trim().toLowerCase(),
          buyerPhone: phone.trim(),
          buyerDni: dni.trim().toUpperCase(),
          buyerDob: dob,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        // Open in new tab to avoid iframe restrictions in preview
        const newWindow = window.open(data.url, '_blank');
        if (!newWindow) {
          // Fallback if popup blocked
          window.location.href = data.url;
        }
        setLoading(false);
      } else {
        throw new Error('No se pudo crear la sesión de pago');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      toast.error(err.message || 'Error al procesar el pago');
      setLoading(false);
    }
  };

  const isFormValid = name.trim() && email.trim() && phone.trim() && dni.trim() && dob;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <div className="glass-card p-6 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">Compra de pack</h2>
            </div>
            <p className="text-sm text-muted-foreground">Sin registro obligatorio. Recibe tu QR al instante.</p>
          </div>

          <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
            <p className="font-display font-semibold text-foreground">{event.title}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />Horario: {event.time}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />{event.venue}, {event.city}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tier.name}</span>
                <span className="font-display text-2xl font-bold text-primary">{tier.price}€</span>
              </div>
              {tier.description && (
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input id="name" placeholder="Nombre y apellidos" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input id="phone" type="tel" placeholder="+34 600..." value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI / Pasaporte *</Label>
                <Input id="dni" placeholder="12345678A" value={dni} onChange={(e) => setDni(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Fecha de nacimiento *</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
          </div>

          <Button
            size="lg"
            disabled={!isFormValid || loading}
            onClick={handlePurchase}
            className="w-full font-display font-semibold rounded-xl shadow-lg shadow-primary/20"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirigiendo a pago...</>
            ) : (
              `Pagar ${tier.price}€`
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            Pago seguro con Stripe
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Checkout;
