import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, Search, Camera, AlertTriangle, Zap } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Navigate } from 'react-router-dom';

interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid';
  ticket?: Tables<'tickets'>;
  message: string;
}

const Scanner = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const canScan = hasRole('staff') || hasRole('admin');

  const validateTicket = useCallback(async (qrValue: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const [qrCode, qrSignature] = qrValue.split('|');

      if (!qrCode) {
        setResult({ status: 'invalid', message: 'Código QR no válido' });
        return;
      }

      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (error || !ticket) {
        setResult({ status: 'invalid', message: 'Ticket no encontrado en el sistema' });
        if (user) {
          await supabase.from('scan_logs').insert({
            ticket_id: '00000000-0000-0000-0000-000000000000',
            event_id: '00000000-0000-0000-0000-000000000000',
            staff_id: user.id,
            result: 'invalid',
            attendee_name: null,
          });
        }
        return;
      }

      if (qrSignature && ticket.qr_signature !== qrSignature) {
        setResult({ status: 'invalid', ticket, message: 'Firma digital no válida — posible falsificación' });
        return;
      }

      if (ticket.status === 'used') {
        setResult({
          status: 'already_used',
          ticket,
          message: `Ya canjeado el ${new Date(ticket.used_at!).toLocaleString('es')}`,
        });
        await supabase.from('scan_logs').insert({
          ticket_id: ticket.id, event_id: ticket.event_id, staff_id: user!.id,
          result: 'already_used', attendee_name: ticket.buyer_name,
        });
        return;
      }

      await supabase.from('tickets').update({
        status: 'used', used_at: new Date().toISOString(), scanned_by: user!.id,
      }).eq('id', ticket.id);

      await supabase.from('scan_logs').insert({
        ticket_id: ticket.id, event_id: ticket.event_id, staff_id: user!.id,
        result: 'valid', attendee_name: ticket.buyer_name,
      });

      setResult({ status: 'valid', ticket: { ...ticket, status: 'used' }, message: 'Entrada válida' });
    } catch {
      setResult({ status: 'invalid', message: 'Error al validar' });
    } finally {
      setTimeout(() => { processingRef.current = false; }, 2000);
    }
  }, [user]);

  useEffect(() => {
    return () => { scannerRef.current?.stop().catch(() => {}); };
  }, []);

  const startCamera = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => validateTicket(decodedText),
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      setCameraActive(false);
    }
  };

  const handleManualScan = () => {
    if (manualCode.trim()) {
      validateTicket(manualCode.trim());
      setManualCode('');
    }
  };

  if (authLoading) return null;
  if (!user || !canScan) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Camera viewport */}
      <div className="flex-1 relative bg-muted flex items-center justify-center min-h-[55vh]">
        <div id="qr-reader" className={`w-full max-w-md ${cameraActive ? '' : 'hidden'}`} />

        {!cameraActive && (
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-64 border-2 border-primary/30 rounded-3xl overflow-hidden mx-auto bg-background/50">
              <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_20px_hsl(217,91%,60%)] animate-scanner" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera className="w-12 h-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Pulsa para activar</p>
              </div>
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-8 h-8 border-primary ${
                  i === 0 ? 'border-t-2 border-l-2 rounded-tl-2xl' :
                  i === 1 ? 'border-t-2 border-r-2 rounded-tr-2xl' :
                  i === 2 ? 'border-b-2 border-l-2 rounded-bl-2xl' :
                  'border-b-2 border-r-2 rounded-br-2xl'
                }`} />
              ))}
            </div>
            <Button onClick={startCamera} size="lg" className="rounded-xl gap-2 shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4" /> Activar Cámara
            </Button>
          </div>
        )}

        {cameraActive && (
          <Button onClick={stopCamera} variant="outline" className="absolute top-4 right-4 z-30 rounded-xl">
            Detener
          </Button>
        )}

        {/* Result overlay */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-x-4 top-4 flex justify-center z-30"
            >
              <div className={`w-full max-w-sm p-8 rounded-3xl border-2 text-center space-y-4 backdrop-blur-xl ${
                result.status === 'valid' ? 'border-success bg-success/10'
                : result.status === 'already_used' ? 'border-warning bg-warning/10'
                : 'border-destructive bg-destructive/10'
              }`}>
                {result.status === 'valid' ? (
                  <CheckCircle2 className="w-20 h-20 mx-auto text-success" />
                ) : result.status === 'already_used' ? (
                  <AlertTriangle className="w-20 h-20 mx-auto text-warning" />
                ) : (
                  <XCircle className="w-20 h-20 mx-auto text-destructive" />
                )}
                <p className="font-display text-2xl font-bold">
                  {result.status === 'valid' ? '✓ VÁLIDO' : result.status === 'already_used' ? '⚠ YA CANJEADO' : '✗ INVÁLIDO'}
                </p>
                {result.ticket && <p className="text-xl font-semibold text-foreground">{result.ticket.buyer_name}</p>}
                <p className="text-sm text-muted-foreground">{result.message}</p>
                <Button variant="outline" onClick={() => setResult(null)} className="mt-2 rounded-xl">Escanear otro</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual input */}
      <div className="p-6 bg-background border-t border-border space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="w-4 h-4 text-primary" />
          <span className="font-display font-medium">Búsqueda manual</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Código del ticket (ej: GRAV-xxxxx)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
          />
          <Button onClick={handleManualScan} className="rounded-xl">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
