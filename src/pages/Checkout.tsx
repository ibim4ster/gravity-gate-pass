import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Loader2, MapPin, Clock, CreditCard, Minus, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateDNI = (dni: string) => {
  const trimmed = dni.trim().toUpperCase();
  // Spanish DNI: 8 digits + letter
  if (/^\d{8}[A-Z]$/.test(trimmed)) return true;
  // Spanish NIE: X/Y/Z + 7 digits + letter
  if (/^[XYZ]\d{7}[A-Z]$/.test(trimmed)) return true;
  // Passport: at least 5 alphanumeric characters
  if (/^[A-Z0-9]{5,20}$/.test(trimmed)) return true;
  return false;
};

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
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const maxAvailable = Math.min(tier.max_quantity - tier.sold, 10);
  const totalPrice = (tier.price * quantity).toFixed(2);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Obligatorio';
    if (!email.trim()) newErrors.email = 'Obligatorio';
    else if (!validateEmail(email.trim())) newErrors.email = 'Email no válido (ej: tu@email.com)';
    if (!phone.trim()) newErrors.phone = 'Obligatorio';
    if (!dni.trim()) newErrors.dni = 'Obligatorio';
    else if (!validateDNI(dni.trim())) newErrors.dni = 'Formato no válido (DNI, NIE o pasaporte)';
    if (!dob) newErrors.dob = 'Obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePurchase = async () => {
    if (!validateForm()) return;
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
          quantity,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        const newWindow = window.open(data.url, '_blank');
        if (!newWindow) {
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

  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
        <AlertCircle className="w-3 h-3" /> {errors[field]}
      </p>
    ) : null;

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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tier.name}</span>
                <span className="text-sm text-muted-foreground">{tier.price}€ / ud.</span>
              </div>
              {tier.description && <p className="text-xs text-muted-foreground">{tier.description}</p>}

              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm font-medium">Cantidad</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-display text-lg font-bold w-8 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => Math.min(maxAvailable, q + 1))} disabled={quantity >= maxAvailable}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-medium">Total</span>
                <span className="font-display text-2xl font-bold text-primary">{totalPrice}€</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo *</Label>
              <Input id="name" placeholder="Nombre y apellidos" value={name} onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }} className={errors.name ? 'border-destructive' : ''} />
              <FieldError field="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }} className={errors.email ? 'border-destructive' : ''} />
              <FieldError field="email" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input id="phone" type="tel" placeholder="+34 600..." value={phone} onChange={(e) => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: '' })); }} className={errors.phone ? 'border-destructive' : ''} />
                <FieldError field="phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI / NIE / Pasaporte *</Label>
                <Input id="dni" placeholder="12345678A" value={dni} onChange={(e) => { setDni(e.target.value); setErrors(prev => ({ ...prev, dni: '' })); }} className={errors.dni ? 'border-destructive' : ''} />
                <FieldError field="dni" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Fecha de nacimiento *</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => { setDob(e.target.value); setErrors(prev => ({ ...prev, dob: '' })); }} className={errors.dob ? 'border-destructive' : ''} />
              <FieldError field="dob" />
            </div>
          </div>

          <Button size="lg" disabled={!isFormValid || loading} onClick={handlePurchase}
            className="w-full font-display font-semibold rounded-xl shadow-lg shadow-primary/20">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirigiendo a pago...</>
            ) : (
              `Pagar ${totalPrice}€${quantity > 1 ? ` (${quantity}x)` : ''}`
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
            Pago seguro con Stripe
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Checkout;
