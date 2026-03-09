import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Send, CheckCircle2, Store, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [barName, setBarName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Rellena los campos obligatorios');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('contact_requests' as any).insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      bar_name: barName.trim() || null,
      message: message.trim(),
    } as any);

    if (error) {
      toast.error('Error al enviar. Inténtalo de nuevo.');
      console.error(error);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center glass-card p-10 space-y-6">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h2 className="font-display text-2xl font-bold">¡Solicitud enviada!</h2>
          <p className="text-muted-foreground text-sm">Nos pondremos en contacto contigo lo antes posible para darte de alta en la ruta.</p>
          <Link to="/"><Button variant="outline" className="rounded-xl">Volver a inicio</Button></Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>

        <div className="glass-card p-8 space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Store className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Registra tu bar</h1>
            <p className="text-sm text-muted-foreground">¿Tienes un bar en la Calle San Juan? Rellena el formulario y nos pondremos en contacto contigo para darte de alta en la ruta de pinchos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" placeholder="+34 600..." value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barName">Nombre del bar</Label>
                <Input id="barName" placeholder="Mi bar" value={barName} onChange={e => setBarName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje *</Label>
              <Textarea id="message" placeholder="Cuéntanos sobre tu bar, ubicación, tipo de cocina..." value={message} onChange={e => setMessage(e.target.value)} className="min-h-[120px]" required />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-xl gap-2 font-display font-semibold">
              {loading ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar solicitud</>}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Contact;
