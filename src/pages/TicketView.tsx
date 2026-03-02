import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Download, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const TicketView = () => {
  const { ticketId } = useParams();
  const ticket = useAppStore((s) => s.tickets.find((t) => t.id === ticketId));

  if (!ticket) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Ticket no encontrado.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a eventos
        </Link>

        {/* Ticket card */}
        <div className="relative overflow-hidden rounded-2xl card-glass">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <span className="font-display text-[8rem] font-bold tracking-widest rotate-[-30deg]">
              GRAVITY
            </span>
          </div>

          {/* Top section */}
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
                ticket.status === 'valid'
                  ? 'bg-success/10 text-success'
                  : ticket.status === 'used'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {ticket.status === 'valid' ? 'Válido' : ticket.status === 'used' ? 'Usado' : 'Cancelado'}
              </span>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">{ticket.eventTitle}</h2>
              <p className="text-sm text-primary font-medium mt-1">{ticket.tierName} · {ticket.price}€</p>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-primary" />
                {format(new Date(ticket.eventDate), "d MMM yyyy", { locale: es })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                {ticket.eventTime}h
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {ticket.eventVenue}
              </span>
            </div>

            <p className="text-sm text-foreground font-medium">{ticket.buyerName}</p>
          </div>

          {/* Divider with cutout effect */}
          <div className="relative">
            <div className="border-t border-dashed border-border mx-6" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-background" />
          </div>

          {/* QR section */}
          <div className="p-6 flex flex-col items-center gap-4 relative z-10">
            <div className="p-4 rounded-xl bg-foreground animate-float">
              <QRCodeSVG
                value={ticket.qrCode}
                size={180}
                level="H"
                fgColor="hsl(220, 20%, 4%)"
                bgColor="hsl(210, 20%, 95%)"
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
              {ticket.qrCode.slice(0, 30)}...
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1 text-sm" disabled>
            <Download className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default TicketView;
