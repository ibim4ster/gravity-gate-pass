import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No se encontró la sesión de pago');
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId },
        });

        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        setTicketId(data.ticketId);
        setStatus('success');
      } catch (err: any) {
        console.error('Payment verification error:', err);
        setErrorMsg(err.message || 'Error verificando el pago');
        setStatus('error');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm text-center space-y-6">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <h2 className="font-display text-2xl font-bold">Verificando pago...</h2>
            <p className="text-muted-foreground text-sm">Un momento, estamos procesando tu compra</p>
          </div>
        )}

        {status === 'success' && (
          <div className="glass-card p-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="font-display text-2xl font-bold">¡Compra exitosa!</h2>
            <p className="text-muted-foreground text-sm">
              Tu pack ha sido creado. Te hemos enviado un email con tu ticket y código QR.
            </p>
            <div className="space-y-3">
              {ticketId && (
                <Button onClick={() => navigate(`/ticket/${ticketId}`)} className="w-full rounded-xl gap-2">
                  Ver mi ticket <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              <Link to="/">
                <Button variant="outline" className="w-full rounded-xl">Volver a bares</Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card p-8 space-y-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="font-display text-2xl font-bold">Error en el pago</h2>
            <p className="text-muted-foreground text-sm">{errorMsg}</p>
            <Link to="/">
              <Button variant="outline" className="w-full rounded-xl">Volver</Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
