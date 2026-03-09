import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, Search, Camera, AlertTriangle, Zap, CameraOff, User, MapPin, Package, Clock, Hash, RotateCcw } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid';
  ticket?: Tables<'tickets'>;
  eventName?: string;
  message: string;
}

const QR_READER_ID = 'gravity-qr-reader';

const Scanner = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [assignedEventIds, setAssignedEventIds] = useState<string[] | null>(null);
  const [events, setEvents] = useState<Tables<'events'>[]>([]);

  const html5QrRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const isAdmin = hasRole('admin');
  const isStaff = hasRole('staff');
  const canScan = isStaff || isAdmin;

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;
      if (isAdmin) {
        setAssignedEventIds(null);
        const { data: evts } = await supabase.from('events').select('*');
        setEvents(evts || []);
        return;
      }
      const { data } = await supabase
        .from('event_assignments')
        .select('event_id')
        .eq('user_id', user.id);
      const ids = data?.map(a => a.event_id) || [];
      setAssignedEventIds(ids);

      if (ids.length > 0) {
        const { data: evts } = await supabase.from('events').select('*').in('id', ids);
        setEvents(evts || []);
      }
    };
    fetchAssignments();
  }, [user, isAdmin]);

  const validateTicket = useCallback(async (qrValue: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const [qrCode, qrSignature] = qrValue.split('|');

      if (!qrCode) {
        setResult({ status: 'invalid', message: 'Código QR no válido' });
        return;
      }

      const { data: ticket, error } = await supabase.from('tickets').select('*').eq('qr_code', qrCode).single();

      if (error || !ticket) {
        setResult({ status: 'invalid', message: 'Ticket no encontrado en el sistema' });
        return;
      }

      const ev = events.find(e => e.id === ticket.event_id);
      const eventName = ev?.title || 'Bar desconocido';

      // Staff restriction
      if (!isAdmin && assignedEventIds && !assignedEventIds.includes(ticket.event_id)) {
        setResult({ status: 'invalid', ticket, eventName, message: 'Este ticket no pertenece a tu bar asignado' });
        if (user) {
          await supabase.from('scan_logs').insert({
            ticket_id: ticket.id, event_id: ticket.event_id, staff_id: user.id,
            result: 'invalid', attendee_name: ticket.buyer_name,
          });
        }
        return;
      }

      if (qrSignature && ticket.qr_signature !== qrSignature) {
        setResult({ status: 'invalid', ticket, eventName, message: 'Firma digital no válida — posible falsificación' });
        if (user) {
          await supabase.from('scan_logs').insert({
            ticket_id: ticket.id, event_id: ticket.event_id, staff_id: user.id,
            result: 'invalid', attendee_name: ticket.buyer_name,
          });
        }
        return;
      }

      if (ticket.status === 'used') {
        setResult({ status: 'already_used', ticket, eventName, message: `Ya canjeado el ${format(new Date(ticket.used_at!), "d MMM yyyy 'a las' HH:mm", { locale: es })}` });
        if (user) {
          await supabase.from('scan_logs').insert({
            ticket_id: ticket.id, event_id: ticket.event_id, staff_id: user.id,
            result: 'already_used', attendee_name: ticket.buyer_name,
          });
        }
        return;
      }

      await supabase.from('tickets').update({ status: 'used', used_at: new Date().toISOString(), scanned_by: user?.id ?? null }).eq('id', ticket.id);

      if (user) {
        await supabase.from('scan_logs').insert({
          ticket_id: ticket.id, event_id: ticket.event_id, staff_id: user.id,
          result: 'valid', attendee_name: ticket.buyer_name,
        });
      }

      setResult({ status: 'valid', ticket: { ...ticket, status: 'used' }, eventName, message: 'Canje realizado con éxito' });
    } catch {
      setResult({ status: 'invalid', message: 'Error al validar' });
    } finally {
      setTimeout(() => { processingRef.current = false; }, 1500);
    }
  }, [user, isAdmin, assignedEventIds, events]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      setCameraActive(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const html5 = new Html5Qrcode(QR_READER_ID, { verbose: false });
      html5QrRef.current = html5;
      await html5.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1 },
        (decodedText) => { if (!processingRef.current) void validateTicket(decodedText); },
        () => {}
      );
    } catch (err: any) {
      setCameraError(err?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Activa el permiso en la configuración del navegador.'
        : 'No se pudo acceder a la cámara. Asegúrate de usar HTTPS y conceder permisos.');
      toast.error('Error al acceder a la cámara');
      setCameraActive(false);
    }
  };

  const stopCamera = useCallback(async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch {}
      try { await html5QrRef.current.clear(); } catch {}
      html5QrRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => { return () => { void stopCamera(); }; }, [stopCamera]);

  const handleManualScan = () => {
    if (manualCode.trim()) {
      void validateTicket(manualCode.trim());
      setManualCode('');
    }
  };

  const handleScanAnother = () => {
    setResult(null);
    processingRef.current = false;
  };

  if (authLoading) return null;
  if (!user || !canScan) return <Navigate to="/" replace />;

  const qty = result?.ticket?.quantity || 1;

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && assignedEventIds && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 text-center">
          <p className="text-xs font-medium text-primary">
            {assignedEventIds.length > 0
              ? `Escaneando para: ${events.map(e => e.title).join(', ')}`
              : 'No tienes ningún bar asignado. Contacta con el administrador.'}
          </p>
        </div>
      )}

      <div className="flex-1 relative bg-black flex items-center justify-center min-h-[55vh]">
        <div className={`absolute inset-0 ${cameraActive ? '' : 'hidden'}`}>
          <div id={QR_READER_ID} className="h-full w-full [&_video]{object-fit:cover;width:100%;height:100%}" />
        </div>

        {cameraActive && !result && (
          <Button onClick={() => void stopCamera()} variant="outline" className="absolute top-4 right-4 z-30 rounded-xl gap-2 bg-background/80 backdrop-blur-sm">
            <CameraOff className="w-4 h-4" /> Detener
          </Button>
        )}

        {!cameraActive && !result && (
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-64 border-2 border-primary/30 rounded-3xl overflow-hidden mx-auto bg-background/10">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera className="w-12 h-12 text-white/30" />
                <p className="text-sm text-white/60">Pulsa para activar</p>
              </div>
            </div>
            {cameraError && <div className="max-w-sm mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{cameraError}</div>}
            {!isAdmin && assignedEventIds?.length === 0 ? (
              <p className="text-sm text-white/60">No puedes escanear porque no tienes un bar asignado.</p>
            ) : (
              <Button onClick={startCamera} size="lg" className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                <Zap className="w-4 h-4" /> Activar Cámara
              </Button>
            )}
            <p className="text-xs text-white/40 max-w-xs mx-auto">Si el escaneo automático no funciona, usa la búsqueda manual de abajo.</p>
          </div>
        )}

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-4 flex items-center justify-center z-30">
              <div className={`w-full max-w-md p-6 rounded-3xl border-2 backdrop-blur-xl space-y-5 ${
                result.status === 'valid' ? 'border-green-500 bg-green-500/20' :
                result.status === 'already_used' ? 'border-yellow-500 bg-yellow-500/20' :
                'border-red-500 bg-red-500/20'
              }`}>
                {/* Status icon */}
                <div className="text-center">
                  {result.status === 'valid' ? <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" /> :
                   result.status === 'already_used' ? <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500" /> :
                   <XCircle className="w-16 h-16 mx-auto text-red-500" />}
                  <p className="font-display text-2xl font-bold text-white mt-2">
                    {result.status === 'valid' ? '✓ VÁLIDO' : result.status === 'already_used' ? '⚠ YA CANJEADO' : '✗ INVÁLIDO'}
                  </p>
                </div>

                {/* Detailed info */}
                {result.ticket && (
                  <div className="space-y-3 bg-black/20 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-white/60 shrink-0" />
                      <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Cliente</p>
                        <p className="text-white font-semibold">{result.ticket.buyer_name}</p>
                      </div>
                    </div>
                    {result.eventName && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-white/60 shrink-0" />
                        <div>
                          <p className="text-[10px] text-white/50 uppercase tracking-wider">Bar</p>
                          <p className="text-white font-medium">{result.eventName}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-white/60 shrink-0" />
                      <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Pack</p>
                        <p className="text-white font-medium">{result.ticket.tier_name}</p>
                      </div>
                    </div>
                    {qty > 1 && (
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-white/60 shrink-0" />
                        <div>
                          <p className="text-[10px] text-white/50 uppercase tracking-wider">Cantidad</p>
                          <p className="text-white text-xl font-bold">{qty} unidades</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-white/60 shrink-0" />
                      <div>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">Precio</p>
                        <p className="text-white font-bold text-lg">{result.ticket.price} €</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-white/70 text-center">{result.message}</p>

                <Button
                  onClick={handleScanAnother}
                  size="lg"
                  className="w-full rounded-xl gap-2 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <RotateCcw className="w-4 h-4" /> Escanear otro QR
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-background border-t border-border space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="w-4 h-4 text-primary" />
          <span className="font-display font-medium">Búsqueda manual</span>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Código del ticket (ej: GRAV-xxxxx)..." value={manualCode} onChange={(e) => setManualCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualScan()} />
          <Button onClick={handleManualScan} className="rounded-xl"><Search className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
