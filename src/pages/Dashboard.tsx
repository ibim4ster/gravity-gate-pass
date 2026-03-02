import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';
import { BarChart3, Users, Ticket, TrendingUp, Calendar, Plus, Search, Loader2, Edit2, Save, X, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PriceTier = Tables<'price_tiers'>;
type EventRow = Tables<'events'>;
type EventWithTiers = EventRow & { price_tiers: PriceTier[] };

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
  const { user, hasRole, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventWithTiers[]>([]);
  const [tickets, setTickets] = useState<Tables<'tickets'>[]>([]);
  const [scanLogs, setScanLogs] = useState<Tables<'scan_logs'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'events' | 'attendees' | 'logs'>('overview');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState('');
  const [attendeeSearch, setAttendeeSearch] = useState('');

  // New event form
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: '', time: '', venue: '', city: '', category: 'General', capacity: '100',
    tiers: [{ name: 'General', price: '25', maxQuantity: '100', expiresAt: '' }],
  });

  const fetchData = async () => {
    const [eventsRes, ticketsRes, logsRes] = await Promise.all([
      supabase.from('events').select('*, price_tiers(*)').order('date'),
      supabase.from('tickets').select('*').order('purchased_at', { ascending: false }),
      supabase.from('scan_logs').select('*').order('scanned_at', { ascending: false }).limit(50),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data as EventWithTiers[]);
    if (ticketsRes.data) setTickets(ticketsRes.data);
    if (logsRes.data) setScanLogs(logsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (user && hasRole('admin')) fetchData();
  }, [user]);

  if (authLoading) return null;
  if (!user || !hasRole('admin')) return <Navigate to="/" replace />;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  const totalRevenue = tickets.reduce((s, t) => s + Number(t.price), 0);
  const usedTickets = tickets.filter((t) => t.status === 'used').length;
  const totalCapacity = events.reduce((s, e) => s + e.capacity, 0);
  const totalSold = events.reduce((s, e) => s + e.price_tiers.reduce((ss, t) => ss + t.sold, 0), 0);

  const createEvent = async () => {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date,
          time: newEvent.time,
          venue: newEvent.venue,
          city: newEvent.city,
          category: newEvent.category,
          capacity: parseInt(newEvent.capacity),
          organizer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create tiers
      for (const tier of newEvent.tiers) {
        await supabase.from('price_tiers').insert({
          event_id: event.id,
          name: tier.name,
          price: parseFloat(tier.price),
          max_quantity: parseInt(tier.maxQuantity),
          expires_at: tier.expiresAt || null,
        });
      }

      toast.success('Evento creado');
      setShowCreateEvent(false);
      setNewEvent({ title: '', description: '', date: '', time: '', venue: '', city: '', category: 'General', capacity: '100', tiers: [{ name: 'General', price: '25', maxQuantity: '100', expiresAt: '' }] });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateCapacity = async (eventId: string) => {
    const cap = parseInt(editCapacity);
    if (isNaN(cap) || cap < 1) return;
    await supabase.from('events').update({ capacity: cap }).eq('id', eventId);
    toast.success('Capacidad actualizada');
    setEditingEvent(null);
    fetchData();
  };

  const filteredTickets = attendeeSearch
    ? tickets.filter(t =>
        t.buyer_name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        t.buyer_email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        t.qr_code.toLowerCase().includes(attendeeSearch.toLowerCase())
      )
    : tickets;

  const tabs = [
    { key: 'overview', label: 'Resumen' },
    { key: 'events', label: 'Eventos' },
    { key: 'attendees', label: 'Asistentes' },
    { key: 'logs', label: 'Auditoría' },
  ] as const;

  return (
    <div className="container py-8 space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={TrendingUp} label="Ingresos" value={`${totalRevenue}€`} sub="Total" />
            <StatCard icon={Ticket} label="Tickets" value={`${tickets.length}`} sub={`${usedTickets} canjeados`} />
            <StatCard icon={Users} label="Vendidos" value={`${totalSold}`} sub={`de ${totalCapacity}`} />
            <StatCard icon={Calendar} label="Eventos" value={`${events.length}`} />
          </div>

          <div className="card-glass rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-display font-semibold">Ventas vs Capacidad</h3>
            </div>
            {events.map((event) => {
              const sold = event.price_tiers.reduce((s, t) => s + t.sold, 0);
              const pct = event.capacity > 0 ? Math.round((sold / event.capacity) * 100) : 0;
              return (
                <div key={event.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground">{sold}/{event.capacity} ({pct}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full"
                      style={{ background: pct >= 85 ? 'hsl(var(--accent))' : 'hsl(var(--primary))' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events Management */}
      {tab === 'events' && (
        <div className="space-y-4">
          <Button onClick={() => setShowCreateEvent(!showCreateEvent)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Evento
          </Button>

          {showCreateEvent && (
            <div className="card-glass rounded-xl p-6 space-y-4">
              <h3 className="font-display font-semibold">Crear Evento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Título</Label><Input value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Categoría</Label><Input value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value})} className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Hora</Label><Input value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} placeholder="23:00" className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Venue</Label><Input value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Ciudad</Label><Input value={newEvent.city} onChange={e => setNewEvent({...newEvent, city: e.target.value})} className="bg-secondary border-border" /></div>
                <div className="space-y-2 col-span-2"><Label>Descripción</Label><Input value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="bg-secondary border-border" /></div>
                <div className="space-y-2"><Label>Capacidad</Label><Input type="number" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: e.target.value})} className="bg-secondary border-border" /></div>
              </div>

              <h4 className="font-display font-medium text-sm mt-4">Tramos de precio</h4>
              {newEvent.tiers.map((tier, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-end">
                  <div><Label className="text-xs">Nombre</Label><Input value={tier.name} onChange={e => { const t = [...newEvent.tiers]; t[i].name = e.target.value; setNewEvent({...newEvent, tiers: t}); }} className="bg-secondary border-border" /></div>
                  <div><Label className="text-xs">Precio (€)</Label><Input type="number" value={tier.price} onChange={e => { const t = [...newEvent.tiers]; t[i].price = e.target.value; setNewEvent({...newEvent, tiers: t}); }} className="bg-secondary border-border" /></div>
                  <div><Label className="text-xs">Cantidad</Label><Input type="number" value={tier.maxQuantity} onChange={e => { const t = [...newEvent.tiers]; t[i].maxQuantity = e.target.value; setNewEvent({...newEvent, tiers: t}); }} className="bg-secondary border-border" /></div>
                  <div><Label className="text-xs">Expira</Label><Input type="datetime-local" value={tier.expiresAt} onChange={e => { const t = [...newEvent.tiers]; t[i].expiresAt = e.target.value; setNewEvent({...newEvent, tiers: t}); }} className="bg-secondary border-border" /></div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setNewEvent({...newEvent, tiers: [...newEvent.tiers, { name: '', price: '0', maxQuantity: '50', expiresAt: '' }]})}>
                + Añadir tramo
              </Button>

              <div className="flex gap-2">
                <Button onClick={createEvent} className="bg-primary text-primary-foreground hover:bg-primary/90">Crear Evento</Button>
                <Button variant="outline" onClick={() => setShowCreateEvent(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {/* Event list with capacity edit */}
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="card-glass rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold">{event.title}</h3>
                    <p className="text-xs text-muted-foreground">{event.city} · {format(new Date(event.date), "d MMM yyyy", { locale: es })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingEvent === event.id ? (
                      <>
                        <Input type="number" value={editCapacity} onChange={e => setEditCapacity(e.target.value)} className="w-24 bg-secondary border-border" />
                        <Button size="sm" onClick={() => updateCapacity(event.id)}><Save className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingEvent(null)}><X className="w-3 h-3" /></Button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground">Capacidad: {event.capacity}</span>
                        <Button size="sm" variant="outline" onClick={() => { setEditingEvent(event.id); setEditCapacity(String(event.capacity)); }}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {event.price_tiers.map(t => (
                    <span key={t.id} className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground">
                      {t.name}: {t.price}€ ({t.sold}/{t.max_quantity})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendees */}
      {tab === 'attendees' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email o código..."
              value={attendeeSearch}
              onChange={e => setAttendeeSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>

          <div className="card-glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left border-b border-border">
                  <th className="p-3 font-medium">Nombre</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium text-right">Precio</th>
                  <th className="p-3 font-medium">Estado</th>
                  <th className="p-3 font-medium">Código</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickets.map(t => (
                  <tr key={t.id}>
                    <td className="p-3 font-medium">{t.buyer_name}</td>
                    <td className="p-3 text-muted-foreground">{t.buyer_email}</td>
                    <td className="p-3 text-muted-foreground">{t.tier_name}</td>
                    <td className="p-3 text-right font-display text-primary">{t.price}€</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'valid' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>{t.status === 'valid' ? 'Válido' : 'Usado'}</span>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{t.qr_code.slice(0, 20)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTickets.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Sin resultados</p>
            )}
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {tab === 'logs' && (
        <div className="card-glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-sm">Logs de Escaneo</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Asistente</th>
                <th className="p-3 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {scanLogs.map(log => (
                <tr key={log.id}>
                  <td className="p-3 text-muted-foreground">{format(new Date(log.scanned_at), "d MMM HH:mm:ss", { locale: es })}</td>
                  <td className="p-3">{log.attendee_name || '—'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.result === 'valid' ? 'bg-success/10 text-success'
                      : log.result === 'already_used' ? 'bg-accent/10 text-accent'
                      : 'bg-destructive/10 text-destructive'
                    }`}>{log.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {scanLogs.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Sin logs de escaneo</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
