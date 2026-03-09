import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, ArrowRight, Loader2, Wallet as WalletIcon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const Wallet = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<(Tables<'tickets'> & { events?: Tables<'events'> | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .eq('buyer_user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (data && data.length > 0) {
        const eventIds = [...new Set(data.map(t => t.event_id))];
        const { data: events } = await supabase.from('events').select('*').in('id', eventIds);
        const eventMap = new Map((events || []).map(e => [e.id, e]));
        setTickets(data.map(t => ({ ...t, events: eventMap.get(t.event_id) || null })));
      } else {
        setTickets([]);
      }
      setLoading(false);
    };
    fetchTickets();
  }, [user]);

  if (!user) {
    return (
      <div className="container py-20 text-center space-y-4">
        <WalletIcon className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="font-display text-2xl font-bold">Mi Wallet</h2>
        <p className="text-muted-foreground">Inicia sesión para ver tus tickets.</p>
        <Link to="/auth">
          <Button className="rounded-xl">Iniciar Sesión</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-12 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">Mis Packs</h1>
          <p className="text-muted-foreground text-sm">Tus packs comprados en un solo lugar.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-4">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No tienes packs aún.</p>
            <Link to="/events">
              <Button variant="outline" className="rounded-xl">Explorar bares →</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket, i) => {
              const qty = (ticket as any).quantity || 1;
              return (
                <motion.div key={ticket.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <Link to={`/ticket/${ticket.id}`} className="block glass-card-hover p-4 group">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-display font-semibold group-hover:text-primary transition-colors truncate">
                          {ticket.events?.title || ticket.tier_name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ticket.events ? format(new Date(ticket.events.date), "d MMM yyyy", { locale: es }) : format(new Date(ticket.purchased_at), "d MMM yyyy", { locale: es })}
                          </span>
                          <span>{ticket.tier_name}{qty > 1 ? ` x${qty}` : ''} — {ticket.price}€</span>
                        </div>
                        {ticket.status === 'used' && ticket.used_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Canjeado: {format(new Date(ticket.used_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {qty > 1 && (
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                            x{qty}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          ticket.status === 'valid' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                        }`}>
                          {ticket.status === 'valid' ? 'Válido' : 'Canjeado'}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Wallet;
