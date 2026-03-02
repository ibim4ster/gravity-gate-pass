import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, Search, Camera, AlertTriangle } from 'lucide-react';
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
      // QR format: "qr_code|qr_signature"
      const [qrCode, qrSignature] = qrValue.split('|');

      if (!qrCode) {
        setResult({ status: 'invalid', message: 'Código QR no válido' });
        return;
      }

      // Find ticket by qr_code
      const { data: ticket, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (error || !ticket) {
        setResult({ status: 'invalid', message: 'Ticket no encontrado en el sistema' });
        // Log invalid scan
        if (user) {
          await supabase.from('scan_logs').insert({
            ticket_id: '00000000-0000-0000-0000-000000000000', // placeholder for invalid
            event_id: '00000000-0000-0000-0000-000000000000',
            staff_id: user.id,
            result: 'invalid',
            attendee_name: null,
          }).then(() => {}); // fire and forget
        }
        return;
      }

      // Validate signature
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
        // Log
        await supabase.from('scan_logs').insert({
          ticket_id: ticket.id,
          event_id: ticket.event_id,
          staff_id: user!.id,
          result: 'already_used',
          attendee_name: ticket.buyer_name,
        });
        return;
      }

      // Mark as used
      await supabase
        .from('tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          scanned_by: user!.id,
        })
        .eq('id', ticket.id);

      // Log success
      await supabase.from('scan_logs').insert({
        ticket_id: ticket.id,
        event_id: ticket.event_id,
        staff_id: user!.id,
        result: 'valid',
        attendee_name: ticket.buyer_name,
      });

      setResult({
        status: 'valid',
        ticket: { ...ticket, status: 'used' },
        message: 'Entrada válida',
      });
    } catch (err) {
      setResult({ status: 'invalid', message: 'Error al validar' });
    } finally {
      setTimeout(() => { processingRef.current = false; }, 2000);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          validateTicket(decodedText);
        },
        () => {} // ignore errors
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
  if (!user || !canScan) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Camera viewport */}
      <div className="flex-1 relative bg-secondary flex items-center justify-center min-h-[50vh]">
        <div id="qr-reader" className={`w-full max-w-md ${cameraActive ? '' : 'hidden'}`} />

        {!cameraActive && (
          <div className="text-center space-y-4">
            <div className="relative w-64 h-64 border-2 border-primary/50 rounded-2xl overflow-hidden mx-auto">
              <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_20px_hsl(185_80%_55%)] animate-scanner" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground text-center px-4">
                  Pulsa para activar la cámara
                </p>
              </div>
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6 border-primary ${
                  i === 0 ? 'border-t-2 border-l-2 rounded-tl-lg' :
                  i === 1 ? 'border-t-2 border-r-2 rounded-tr-lg' :
                  i === 2 ? 'border-b-2 border-l-2 rounded-bl-lg' :
                  'border-b-2 border-r-2 rounded-br-lg'
                }`} />
              ))}
            </div>
            <Button onClick={startCamera} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Camera className="w-4 h-4 mr-2" /> Activar Cámara
            </Button>
          </div>
        )}

        {cameraActive && (
          <Button
            onClick={stopCamera}
            variant="outline"
            className="absolute top-4 right-4 z-30"
          >
            Detener
          </Button>
        )}

        {/* Result overlay */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute inset-x-4 top-4 flex justify-center z-30"
            >
              <div className={`w-full max-w-sm p-6 rounded-2xl border-2 text-center space-y-3 backdrop-blur-xl ${
                result.status === 'valid' ? 'border-success bg-success/10'
                : result.status === 'already_used' ? 'border-accent bg-accent/10'
                : 'border-destructive bg-destructive/10'
              }`}>
                {result.status === 'valid' ? (
                  <CheckCircle2 className="w-16 h-16 mx-auto text-success" />
                ) : result.status === 'already_used' ? (
                  <AlertTriangle className="w-16 h-16 mx-auto text-accent" />
                ) : (
                  <XCircle className="w-16 h-16 mx-auto text-destructive" />
                )}
                <p className="font-display text-2xl font-bold">
                  {result.status === 'valid' ? '✓ VÁLIDO' : result.status === 'already_used' ? '⚠ YA CANJEADO' : '✗ INVÁLIDO'}
                </p>
                {result.ticket && (
                  <p className="text-lg font-medium text-foreground">{result.ticket.buyer_name}</p>
                )}
                <p className="text-sm text-muted-foreground">{result.message}</p>
                <Button variant="outline" onClick={() => setResult(null)} className="mt-2">
                  Escanear otro
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Manual input */}
      <div className="p-6 card-glass border-t border-border space-y-4">
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
            className="bg-secondary border-border"
          />
          <Button onClick={handleManualScan} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
