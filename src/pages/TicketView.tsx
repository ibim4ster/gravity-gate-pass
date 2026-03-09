import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, ArrowLeft, Loader2, Download, Share2, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '@/hooks/useTheme';
import jsPDF from 'jspdf';

const TicketView = () => {
  const { ticketId } = useParams();
  const { resolvedTheme } = useTheme();
  const [ticket, setTicket] = useState<any>(null);
  const [event, setEvent] = useState<Tables<'events'> | null>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      const { data } = await supabase.from('tickets').select('*').eq('id', ticketId!).maybeSingle();
      if (data) {
        setTicket(data);
        const { data: ev } = await supabase.from('events').select('*').eq('id', data.event_id).single();
        setEvent(ev);
      }
      setLoading(false);
    };
    if (ticketId) fetchTicket();
  }, [ticketId]);

  const handleDownloadPDF = async () => {
    if (!ticket || !qrRef.current) return;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const margin = 14;

    // Background
    pdf.setFillColor(250, 249, 247);
    pdf.rect(0, 0, w, h, 'F');

    // Header bar
    pdf.setFillColor(45, 122, 90);
    pdf.rect(0, 0, w, 34, 'F');

    // Logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject();
        logoImg.src = '/logo-sanjuan.png';
      });
      const canvas = document.createElement('canvas');
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(logoImg, 0, 0);
      const logoData = canvas.toDataURL('image/png');
      pdf.addImage(logoData, 'PNG', w / 2 - 11, 5, 22, 22);
    } catch {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GRAVITY', w / 2, 20, { align: 'center' });
    }

    let y = 42;

    // Title
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    const title = event?.title || 'Ruta de Pinchos';
    pdf.text(title, w / 2, y, { align: 'center' });
    y += 7;

    // Event details
    if (event) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(130, 130, 130);
      const dateStr = format(new Date(event.date), "d 'de' MMMM yyyy", { locale: es });
      pdf.text(`${dateStr}  ·  ${event.time}h`, w / 2, y, { align: 'center' });
      y += 4;
      pdf.text(`${event.venue}, ${event.city}`, w / 2, y, { align: 'center' });
      y += 7;
    }

    // Divider
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.line(margin, y, w - margin, y);
    pdf.setLineDashPattern([], 0);
    y += 6;

    // Ticket details
    const qty = ticket.quantity || 1;
    const details: [string, string][] = [
      ['Pack', `${ticket.tier_name}${qty > 1 ? ` x${qty}` : ''}`],
      ['Precio', `${ticket.price}€${qty > 1 ? ` (${qty} uds.)` : ''}`],
      ['Nombre', ticket.buyer_name],
      ['Email', ticket.buyer_email],
    ];
    if (ticket.buyer_dni) details.push(['DNI', ticket.buyer_dni]);
    if (ticket.buyer_phone) details.push(['Teléfono', ticket.buyer_phone]);

    for (const [label, value] of details) {
      pdf.setFontSize(7);
      pdf.setTextColor(160, 160, 160);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, margin + 4, y);
      pdf.setFontSize(9);
      pdf.setTextColor(50, 50, 50);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(value), w - margin - 4, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      y += 6;
    }

    y += 3;

    // Divider
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.line(margin, y, w - margin, y);
    pdf.setLineDashPattern([], 0);
    y += 5;

    // QR Code
    const svgEl = qrRef.current.querySelector('svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const qrData = canvas.toDataURL('image/png');
      const qrSize = 40;
      pdf.addImage(qrData, 'PNG', w / 2 - qrSize / 2, y, qrSize, qrSize);
      URL.revokeObjectURL(url);
      y += qrSize + 4;
    }

    // QR code text
    pdf.setFontSize(6);
    pdf.setTextColor(160, 160, 160);
    pdf.setFont('courier', 'normal');
    pdf.text(ticket.qr_code, w / 2, y, { align: 'center' });
    y += 5;

    // Status
    const statusText = ticket.status === 'valid' ? 'VÁLIDO' : ticket.status === 'used' ? 'CANJEADO' : 'CANCELADO';
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(ticket.status === 'valid' ? 34 : 160, ticket.status === 'valid' ? 139 : 160, ticket.status === 'valid' ? 34 : 160);
    pdf.text(statusText, w / 2, y, { align: 'center' });

    if (ticket.status === 'used' && ticket.used_at) {
      y += 4;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(130, 130, 130);
      pdf.text(`Canjeado: ${format(new Date(ticket.used_at), "d MMM yyyy HH:mm", { locale: es })}`, w / 2, y, { align: 'center' });
    }

    // Footer
    pdf.setFontSize(6);
    pdf.setTextColor(180, 180, 180);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Gravity · Ruta de Pinchos Calle San Juan · Logroño', w / 2, h - 6, { align: 'center' });

    pdf.save(`gravity-ticket-${ticket.qr_code}.pdf`);
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    const startDate = new Date(`${event.date}T${event.time.replace('h', ':00')}`);
    const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const calUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(startDate)}/${fmt(endDate)}&location=${encodeURIComponent(`${event.venue}, ${event.city}`)}&details=${encodeURIComponent(`Pack: ${ticket.tier_name}\nCódigo: ${ticket.qr_code}\nVer ticket: ${window.location.href}`)}`;
    window.open(calUrl, '_blank');
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Ticket - ${event?.title}`,
        text: `Mi entrada para ${event?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  if (!ticket) return <div className="container py-20 text-center text-muted-foreground">Ticket no encontrado.</div>;

  const qrValue = `${ticket.qr_code}|${ticket.qr_signature}`;
  const qty = ticket.quantity || 1;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <Link to="/wallet" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Mis tickets
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 rounded-xl">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="gap-2 rounded-xl" title="Añadir al calendario">
              <CalendarPlus className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2 rounded-xl">
              <Download className="w-4 h-4" /> PDF
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl glass-card">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <span className="font-display text-[8rem] font-bold tracking-widest rotate-[-30deg]">GRAVITY</span>
          </div>

          <div className="p-6 space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo-sanjuan.png" alt="San Juan" className="w-8 h-8 rounded-lg object-contain" />
                <span className="font-display text-xs font-semibold text-muted-foreground tracking-wider uppercase">Gravity Ticket</span>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                ticket.status === 'valid' ? 'bg-success/10 text-success'
                : ticket.status === 'used' ? 'bg-muted text-muted-foreground'
                : 'bg-destructive/10 text-destructive'
              }`}>
                {ticket.status === 'valid' ? 'Válido' : ticket.status === 'used' ? 'Canjeado' : 'Cancelado'}
              </span>
            </div>

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
                <p className="font-display font-semibold">{ticket.tier_name}{qty > 1 ? ` x${qty}` : ''}</p>
              </div>
              <p className="font-display text-2xl font-bold text-primary">{ticket.price}€</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Nombre</p><p className="font-medium">{ticket.buyer_name}</p></div>
              <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium truncate">{ticket.buyer_email}</p></div>
              {ticket.buyer_dni && <div><p className="text-xs text-muted-foreground">DNI</p><p className="font-medium">{ticket.buyer_dni}</p></div>}
              {ticket.buyer_phone && <div><p className="text-xs text-muted-foreground">Teléfono</p><p className="font-medium">{ticket.buyer_phone}</p></div>}
            </div>

            {ticket.status === 'used' && ticket.used_at && (
              <div className="p-3 rounded-xl bg-muted border border-border">
                <p className="text-xs text-muted-foreground">Canjeado</p>
                <p className="text-sm font-medium">{format(new Date(ticket.used_at), "EEEE d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}</p>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="border-t border-dashed border-border mx-6" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-background" />
          </div>

          <div className="p-6 flex flex-col items-center gap-4 relative z-10">
            <div ref={qrRef} className="p-4 rounded-2xl bg-white animate-float">
              <QRCodeSVG value={qrValue} size={180} level="H" fgColor="#0c1222" bgColor="#ffffff" />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">{ticket.qr_code}</p>
            {qty > 1 && (
              <p className="text-sm font-display font-semibold text-primary">Cantidad: {qty} uds.</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TicketView;
