import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, Search, Camera, AlertTriangle, Zap, CameraOff } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
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

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError' 
        ? 'Permiso de cámara denegado. Activa el permiso en la configuración del navegador.' 
        : 'No se pudo acceder a la cámara. Asegúrate de que no esté en uso por otra aplicación.');
      toast.error('Error al acceder a la cámara');
    }
  };

  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Use BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      detector.detect(canvas).then((barcodes: any[]) => {
        if (barcodes.length > 0 && !processingRef.current) {
          validateTicket(barcodes[0].rawValue);
        }
      }).catch(() => {});
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const stopCamera = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

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
      <div className="flex-1 relative bg-black flex items-center justify-center min-h-[55vh]">
        <video ref={videoRef} className={`w-full h-full object-cover absolute inset-0 ${cameraActive ? '' : 'hidden'}`} playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {cameraActive && (
          <>
            {/* Scanner overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="relative w-64 h-64">
                <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_20px_hsl(217,91%,60%)] animate-scanner" />
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-10 h-10 border-primary ${
                    i === 0 ? 'border-t-3 border-l-3 rounded-tl-2xl' :
                    i === 1 ? 'border-t-3 border-r-3 rounded-tr-2xl' :
                    i === 2 ? 'border-b-3 border-l-3 rounded-bl-2xl' :
                    'border-b-3 border-r-3 rounded-br-2xl'
                  }`} />
                ))}
              </div>
            </div>
            <Button onClick={stopCamera} variant="outline" className="absolute top-4 right-4 z-30 rounded-xl gap-2 bg-background/80 backdrop-blur-sm">
              <CameraOff className="w-4 h-4" /> Detener
            </Button>
          </>
        )}

        {!cameraActive && (
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-64 border-2 border-primary/30 rounded-3xl overflow-hidden mx-auto bg-background/10">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera className="w-12 h-12 text-white/30" />
                <p className="text-sm text-white/60">Pulsa para activar</p>
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
            {cameraError && (
              <div className="max-w-sm mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {cameraError}
              </div>
            )}
            <Button onClick={startCamera} size="lg" className="rounded-xl gap-2 shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4" /> Activar Cámara
            </Button>
            <p className="text-xs text-white/40 max-w-xs mx-auto">
              Si el escaneo automático no funciona, usa la búsqueda manual de abajo.
            </p>
          </div>
        )}

        {/* Result overlay */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-x-4 top-4 flex justify-center z-30"
            >
              <div className={`w-full max-w-sm p-8 rounded-3xl border-2 text-center space-y-4 backdrop-blur-xl ${
                result.status === 'valid' ? 'border-green-500 bg-green-500/20'
                : result.status === 'already_used' ? 'border-yellow-500 bg-yellow-500/20'
                : 'border-red-500 bg-red-500/20'
              }`}>
                {result.status === 'valid' ? (
                  <CheckCircle2 className="w-20 h-20 mx-auto text-green-500" />
                ) : result.status === 'already_used' ? (
                  <AlertTriangle className="w-20 h-20 mx-auto text-yellow-500" />
                ) : (
                  <XCircle className="w-20 h-20 mx-auto text-red-500" />
                )}
                <p className="font-display text-2xl font-bold text-white">
                  {result.status === 'valid' ? '✓ VÁLIDO' : result.status === 'already_used' ? '⚠ YA CANJEADO' : '✗ INVÁLIDO'}
                </p>
                {result.ticket && <p className="text-xl font-semibold text-white">{result.ticket.buyer_name}</p>}
                <p className="text-sm text-white/70">{result.message}</p>
                <Button variant="outline" onClick={() => setResult(null)} className="mt-2 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">Escanear otro</Button>
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
