import { useAppStore } from '@/lib/store';
import { ScanResult } from '@/lib/types';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, CheckCircle2, XCircle, Search, Camera } from 'lucide-react';

const Scanner = () => {
  const { tickets, markTicketUsed, currentUser } = useAppStore();
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);

  const validateTicket = (code: string) => {
    const ticket = tickets.find((t) => t.qrCode === code);

    if (!ticket) {
      setResult({ status: 'invalid', message: 'Ticket no encontrado' });
      return;
    }

    if (ticket.status === 'used') {
      setResult({
        status: 'already_used',
        ticket,
        message: `Ya fue canjeado el ${new Date(ticket.usedAt!).toLocaleString('es')}`,
      });
      return;
    }

    // Mark as used
    markTicketUsed(ticket.id, currentUser?.id ?? 'unknown');
    setResult({
      status: 'valid',
      ticket,
      message: 'Entrada válida',
    });
  };

  const handleManualScan = () => {
    if (manualCode.trim()) {
      validateTicket(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Camera viewport simulation */}
      <div className="flex-1 relative bg-secondary flex items-center justify-center min-h-[50vh]">
        <div className="relative w-64 h-64 border-2 border-primary/50 rounded-2xl overflow-hidden">
          {/* Scanner animation */}
          <div className="absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_20px_hsl(185_80%_55%)] animate-scanner" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground text-center px-4">
              La cámara se activará con la integración del backend
            </p>
          </div>
          {/* Corner markers */}
          {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
            <div
              key={i}
              className={`absolute ${pos} w-6 h-6 border-primary ${
                i === 0 ? 'border-t-2 border-l-2 rounded-tl-lg' :
                i === 1 ? 'border-t-2 border-r-2 rounded-tr-lg' :
                i === 2 ? 'border-b-2 border-l-2 rounded-bl-lg' :
                'border-b-2 border-r-2 rounded-br-lg'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-x-0 top-1/4 flex justify-center z-30 px-4"
          >
            <div
              className={`w-full max-w-sm p-6 rounded-2xl border-2 text-center space-y-3 backdrop-blur-xl ${
                result.status === 'valid'
                  ? 'border-success bg-success/10'
                  : result.status === 'already_used'
                  ? 'border-accent bg-accent/10'
                  : 'border-destructive bg-destructive/10'
              }`}
            >
              {result.status === 'valid' ? (
                <CheckCircle2 className="w-16 h-16 mx-auto text-success" />
              ) : (
                <XCircle className={`w-16 h-16 mx-auto ${
                  result.status === 'already_used' ? 'text-accent' : 'text-destructive'
                }`} />
              )}
              <p className="font-display text-2xl font-bold">
                {result.status === 'valid' ? '✓ VÁLIDO' : result.status === 'already_used' ? '⚠ YA CANJEADO' : '✗ INVÁLIDO'}
              </p>
              {result.ticket && (
                <p className="text-lg font-medium text-foreground">{result.ticket.buyerName}</p>
              )}
              <p className="text-sm text-muted-foreground">{result.message}</p>
              <Button
                variant="outline"
                onClick={() => setResult(null)}
                className="mt-2"
              >
                Escanear otro
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual input */}
      <div className="p-6 card-glass border-t border-border space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="w-4 h-4 text-primary" />
          <span className="font-display font-medium">Búsqueda manual</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Código del ticket..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualScan()}
            className="bg-secondary border-border"
          />
          <Button onClick={handleManualScan} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Quick scan demo tickets */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Demo: pulsa para validar</p>
          <div className="flex flex-wrap gap-2">
            {tickets.filter(t => t.status === 'valid').slice(0, 3).map((t) => (
              <button
                key={t.id}
                onClick={() => validateTicket(t.qrCode)}
                className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                {t.buyerName} — {t.eventTitle}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
