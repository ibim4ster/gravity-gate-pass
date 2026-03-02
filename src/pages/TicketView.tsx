import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ArrowLeft, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';

const TicketView = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<any>(null);
  const [event, setEvent] = useState<Tables<'events'> | null>(null);
  const [loading, setLoading] = useState(true);
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId!)
        .maybeSingle();
      if (data) {
        setTicket(data);
        const { data: ev } = await supabase.from('events').select('*').eq('id', data.event_id).single();
        setEvent(ev);
      }
      setLoading(false);
    };
    if (ticketId) fetchTicket();
  }, [ticketId]);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#0a0c14',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `gravity-ticket-${ticket.qr_code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback: print
      window.print();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }
  if (!ticket) {
    return <div className="container py-20 text-center text-muted-foreground">Ticket no encontrado. Inicia sesión para ver tus tickets.</div>;
  }

  const qrValue = `${ticket.qr_code}|${ticket.qr_signature}`;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <Link to="/wallet" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Mis tickets
          </Link>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" /> Descargar
          </Button>
        </div>

        <div ref={ticketRef} className="relative overflow-hidden rounded-2xl card-glass">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <span className="font-display text-[8rem] font-bold tracking-widest rotate-[-30deg]">GRAVITY</span>
          </div>

          <div className="p-6 space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                  <span className="font-display font-bold text-primary-foreground text-[10px]">G</span>
                </div>
                <span className="font-display text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  Gravity Ticket
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                ticket.status === 'valid' ? 'bg-success/10 text-success'
                : ticket.status === 'used' ? 'bg-muted text-muted-foreground'
                : 'bg-destructive/10 text-destructive'
              }`}>
                {ticket.status === 'valid' ? 'Válido' : ticket.status === 'used' ? 'Usado' : 'Cancelado'}
              </span>
            </div>

            {/* Event info */}
            {event && (
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold tracking-tight">{event.title}</h2>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" />{format(new Date(event.date), "d MMM yyyy", { locale: es })}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-primary" />{event.time}h</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />{event.venue}, {event.city}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-display font-semibold">{ticket.tier_name}</p>
              </div>
              <p className="font-display text-2xl font-bold text-primary">{ticket.price}€</p>
            </div>

            {/* Buyer info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="font-medium">{ticket.buyer_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{ticket.buyer_email}</p>
              </div>
              {ticket.buyer_dni && (
                <div>
                  <p className="text-xs text-muted-foreground">DNI</p>
                  <p className="font-medium">{ticket.buyer_dni}</p>
                </div>
              )}
              {ticket.buyer_phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{ticket.buyer_phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dashed separator */}
          <div className="relative">
            <div className="border-t border-dashed border-border mx-6" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-background" />
          </div>

          {/* QR */}
          <div className="p-6 flex flex-col items-center gap-4 relative z-10">
            <div className="p-4 rounded-xl bg-foreground animate-float">
              <QRCodeSVG value={qrValue} size={180} level="H" fgColor="hsl(220, 20%, 4%)" bgColor="hsl(210, 20%, 95%)" />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
              {ticket.qr_code}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TicketView;
