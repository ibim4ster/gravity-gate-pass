import { useAppStore } from '@/lib/store';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Wallet = () => {
  const { currentUser, tickets } = useAppStore();
  const userTickets = tickets.filter((t) => t.buyerEmail === currentUser?.email);

  return (
    <div className="container py-12 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold">Mi Wallet</h1>
          <p className="text-muted-foreground text-sm">Tus entradas en un solo lugar.</p>
        </div>

        {userTickets.length === 0 ? (
          <div className="card-glass rounded-xl p-12 text-center space-y-4">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No tienes tickets aún.</p>
            <Link to="/" className="text-primary text-sm font-medium hover:underline">
              Explorar eventos →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {userTickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/ticket/${ticket.id}`}
                  className="block card-glass rounded-xl p-4 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-display font-semibold group-hover:text-primary transition-colors">
                        {ticket.eventTitle}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(ticket.eventDate), "d MMM yyyy", { locale: es })}
                        </span>
                        <span className="text-primary font-medium">{ticket.tierName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ticket.status === 'valid'
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {ticket.status === 'valid' ? 'Válido' : 'Usado'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Wallet;
