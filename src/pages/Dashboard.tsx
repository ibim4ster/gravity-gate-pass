import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { BarChart3, Users, Ticket, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const StatCard = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) => (
  <div className="card-glass rounded-xl p-5 space-y-2">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="font-display text-3xl font-bold">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const { events, tickets } = useAppStore();

  const totalRevenue = tickets.reduce((sum, t) => sum + t.price, 0);
  const totalCapacity = events.reduce((sum, e) => sum + e.capacity, 0);
  const totalSold = events.reduce((sum, e) => sum + e.ticketsSold, 0) + tickets.length;
  const usedTickets = tickets.filter((t) => t.status === 'used').length;

  return (
    <div className="container py-8 space-y-8 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Vista general de tu ecosistema de eventos.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Ingresos" value={`${totalRevenue}€`} sub="Total generado" />
        <StatCard icon={Ticket} label="Tickets" value={`${tickets.length}`} sub={`${usedTickets} canjeados`} />
        <StatCard icon={Users} label="Aforo total" value={`${totalSold}`} sub={`de ${totalCapacity}`} />
        <StatCard icon={Calendar} label="Eventos" value={`${events.length}`} sub="Activos" />
      </div>

      {/* Sales chart placeholder */}
      <div className="card-glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold">Ventas vs Capacidad</h3>
        </div>
        <div className="space-y-3">
          {events.map((event) => {
            const pct = Math.round((event.ticketsSold / event.capacity) * 100);
            return (
              <div key={event.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{event.title}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{
                      background: pct >= 85
                        ? 'hsl(var(--accent))'
                        : 'hsl(var(--primary))',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent tickets */}
      <div className="card-glass rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold">Últimas compras</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="pb-2 font-medium">Comprador</th>
                <th className="pb-2 font-medium">Evento</th>
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium text-right">Precio</th>
                <th className="pb-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((t) => (
                <tr key={t.id} className="text-foreground">
                  <td className="py-3">{t.buyerName}</td>
                  <td className="py-3 text-muted-foreground">{t.eventTitle}</td>
                  <td className="py-3 text-muted-foreground">{t.tierName}</td>
                  <td className="py-3 text-right font-display font-medium text-primary">{t.price}€</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.status === 'valid' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {t.status === 'valid' ? 'Válido' : 'Usado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
