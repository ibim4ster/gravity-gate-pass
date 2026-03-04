import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, Ticket, TrendingUp, Calendar, Plus, Search, Loader2,
  Edit2, Save, X, ClipboardList, UserCog, Trash2, Shield, Link2, Eye,
  DollarSign, Activity, ChevronDown, ChevronUp, MapPin, Clock, Image, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigate, Link as RouterLink } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PriceTier = Tables<'price_tiers'>;
type EventRow = Tables<'events'>;
type EventWithTiers = EventRow & { price_tiers: PriceTier[] };

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary' }: { icon: React.ElementType; label: string; value: string; sub?: string; color?: string }) => (
  <div className="glass-card p-5 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}/10`}>
        <Icon className={`w-4 h-4 text-${color}`} />
      </div>
    </div>
    <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventWithTiers[]>([]);
  const [tickets, setTickets] = useState<Tables<'tickets'>[]>([]);
  const [scanLogs, setScanLogs] = useState<Tables<'scan_logs'>[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'events' | 'attendees' | 'users' | 'logs'>('overview');

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', date: '', time: '', venue: '', city: '',
    category: 'General', capacity: '100', status: 'upcoming',
    image_url: '', video_url: '', lineup: '', min_age: '0',
    gallery_urls: '',
    tiers: [{ id: '', name: 'General', price: '25', maxQuantity: '100', expiresAt: '' }],
  });

  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('client');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignEventId, setAssignEventId] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const fetchData = async () => {
    const [eventsRes, ticketsRes, logsRes, profilesRes, rolesRes, assignRes] = await Promise.all([
      supabase.from('events').select('*, price_tiers(*)').order('date'),
      supabase.from('tickets').select('*').order('purchased_at', { ascending: false }),
      supabase.from('scan_logs').select('*').order('scanned_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('event_assignments').select('*'),
    ]);

    if (eventsRes.data) setEvents(eventsRes.data as EventWithTiers[]);
    if (ticketsRes.data) setTickets(ticketsRes.data);
    if (logsRes.data) setScanLogs(logsRes.data);
    if (assignRes.data) setAssignments(assignRes.data);

    if (profilesRes.data && rolesRes.data) {
      const roleMap: Record<string, string[]> = {};
      rolesRes.data.forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      setUsers(profilesRes.data.map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        email: p.email,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        roles: roleMap[p.user_id] || [],
      })));
    }
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

  const resetEventForm = () => {
    setEventForm({
      title: '', description: '', date: '', time: '', venue: '', city: '',
      category: 'General', capacity: '100', status: 'upcoming',
      image_url: '', video_url: '', lineup: '', min_age: '0', gallery_urls: '',
      tiers: [{ id: '', name: 'General', price: '25', maxQuantity: '100', expiresAt: '' }],
    });
    setEditingEventId(null);
    setShowCreateEvent(false);
  };

  const startEditEvent = (ev: EventWithTiers) => {
    setEditingEventId(ev.id);
    setShowCreateEvent(true);
    setEventForm({
      title: ev.title,
      description: ev.description || '',
      date: ev.date,
      time: ev.time,
      venue: ev.venue,
      city: ev.city,
      category: ev.category,
      capacity: String(ev.capacity),
      status: ev.status,
      image_url: ev.image_url || '',
      video_url: ev.video_url || '',
      lineup: ev.lineup || '',
      min_age: String(ev.min_age || 0),
      gallery_urls: (ev.gallery_urls || []).join('\n'),
      tiers: ev.price_tiers.map(t => ({
        id: t.id,
        name: t.name,
        price: String(t.price),
        maxQuantity: String(t.max_quantity),
        expiresAt: t.expires_at ? t.expires_at.slice(0, 16) : '',
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEvent = async () => {
    try {
      const galleryArray = eventForm.gallery_urls.split('\n').map(u => u.trim()).filter(Boolean);
      const eventData = {
        title: eventForm.title,
        description: eventForm.description || null,
        date: eventForm.date,
        time: eventForm.time,
        venue: eventForm.venue,
        city: eventForm.city,
        category: eventForm.category,
        capacity: parseInt(eventForm.capacity),
        status: eventForm.status,
        image_url: eventForm.image_url || null,
        video_url: eventForm.video_url || null,
        lineup: eventForm.lineup || null,
        min_age: parseInt(eventForm.min_age) || 0,
        gallery_urls: galleryArray.length > 0 ? galleryArray : null,
      };

      let eventId = editingEventId;

      if (editingEventId) {
        const { error } = await supabase.from('events').update(eventData).eq('id', editingEventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('events').insert({ ...eventData, organizer_id: user.id }).select().single();
        if (error) throw error;
        eventId = data.id;
      }

      for (const tier of eventForm.tiers) {
        const tierData = {
          event_id: eventId!,
          name: tier.name,
          price: parseFloat(tier.price),
          max_quantity: parseInt(tier.maxQuantity),
          expires_at: tier.expiresAt || null,
        };
        if (tier.id) {
          await supabase.from('price_tiers').update(tierData).eq('id', tier.id);
        } else {
          await supabase.from('price_tiers').insert(tierData);
        }
      }

      toast.success(editingEventId ? 'Evento actualizado' : 'Evento creado');
      resetEventForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('¿Eliminar este evento y todos sus datos?')) return;
    await supabase.from('price_tiers').delete().eq('event_id', id);
    await supabase.from('events').delete().eq('id', id);
    toast.success('Evento eliminado');
    fetchData();
  };

  const deleteTier = async (tierId: string) => {
    const newTiers = eventForm.tiers.filter(t => t.id !== tierId);
    if (tierId) await supabase.from('price_tiers').delete().eq('id', tierId);
    setEventForm({ ...eventForm, tiers: newTiers });
  };

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'El usuario ya tiene ese rol' : error.message);
    } else {
      toast.success('Rol añadido');
      fetchData();
    }
    setEditingUserId(null);
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
    toast.success('Rol eliminado');
    fetchData();
  };

  const assignEvent = async () => {
    if (!assignUserId || !assignEventId) return;
    const { error } = await supabase.from('event_assignments').insert({ user_id: assignUserId, event_id: assignEventId });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ya asignado' : error.message);
    } else {
      toast.success('Evento asignado');
      fetchData();
    }
    setAssignUserId('');
    setAssignEventId('');
  };

  const removeAssignment = async (id: string) => {
    await supabase.from('event_assignments').delete().eq('id', id);
    toast.success('Asignación eliminada');
    fetchData();
  };

  const filteredTickets = attendeeSearch
    ? tickets.filter(t =>
        t.buyer_name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        t.buyer_email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        t.qr_code.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
        (t.buyer_dni || '').toLowerCase().includes(attendeeSearch.toLowerCase())
      )
    : tickets;

  const filteredUsers = userSearch
    ? users.filter(u =>
        (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const staffOrOrgUsers = users.filter(u => u.roles.includes('staff') || u.roles.includes('admin'));

  const tabs = [
    { key: 'overview' as const, label: 'Resumen', icon: BarChart3 },
    { key: 'events' as const, label: 'Eventos', icon: Calendar },
    { key: 'attendees' as const, label: 'Asistentes', icon: Ticket },
    { key: 'users' as const, label: 'Usuarios', icon: UserCog },
    { key: 'logs' as const, label: 'Auditoría', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container py-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
            <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Gestiona tus eventos, usuarios y ventas.</p>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="container">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Ingresos" value={`${totalRevenue.toFixed(0)}€`} sub="Total acumulado" />
              <StatCard icon={Ticket} label="Tickets" value={`${tickets.length}`} sub={`${usedTickets} canjeados`} />
              <StatCard icon={Activity} label="Ocupación" value={`${totalSold}/${totalCapacity}`} sub={`${totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0}% vendido`} />
              <StatCard icon={Calendar} label="Eventos" value={`${events.length}`} sub={`${events.filter(e => e.status === 'upcoming').length} activos`} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass-card p-6 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Ventas por evento
                </h3>
                {events.map((event) => {
                  const sold = event.price_tiers.reduce((s, t) => s + t.sold, 0);
                  const pct = event.capacity > 0 ? Math.round((sold / event.capacity) * 100) : 0;
                  const revenue = tickets.filter(t => t.event_id === event.id).reduce((s, t) => s + Number(t.price), 0);
                  return (
                    <div key={event.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate max-w-[60%]">{event.title}</span>
                        <span className="text-muted-foreground">{sold}/{event.capacity} · {revenue}€</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                          className={`h-full rounded-full ${pct >= 85 ? 'bg-warning' : 'bg-primary'}`} />
                      </div>
                    </div>
                  );
                })}
                {events.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos aún.</p>}
              </div>

              <div className="glass-card p-6 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Últimas ventas
                </h3>
                {tickets.slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.buyer_name}</p>
                      <p className="text-xs text-muted-foreground">{t.tier_name} · {format(new Date(t.purchased_at), "d MMM HH:mm", { locale: es })}</p>
                    </div>
                    <span className="font-display font-semibold text-primary shrink-0">{t.price}€</span>
                  </div>
                ))}
                {tickets.length === 0 && <p className="text-sm text-muted-foreground">Sin ventas aún.</p>}
              </div>
            </div>
          </div>
        )}

        {/* EVENTS */}
        {tab === 'events' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{events.length} eventos</p>
              <Button onClick={() => { resetEventForm(); setShowCreateEvent(true); }} className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Nuevo Evento
              </Button>
            </div>

            {showCreateEvent && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-lg">{editingEventId ? 'Editar Evento' : 'Crear Evento'}</h3>
                  <Button variant="ghost" size="sm" onClick={resetEventForm}><X className="w-4 h-4" /></Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Título *</Label><Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Categoría</Label><Input value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Fecha *</Label><Input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Hora *</Label><Input value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} placeholder="23:00" /></div>
                  <div className="space-y-2"><Label>Venue *</Label><Input value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Ciudad *</Label><Input value={eventForm.city} onChange={e => setEventForm({ ...eventForm, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Capacidad</Label><Input type="number" value={eventForm.capacity} onChange={e => setEventForm({ ...eventForm, capacity: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Edad mínima</Label><Input type="number" value={eventForm.min_age} onChange={e => setEventForm({ ...eventForm, min_age: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={eventForm.status} onValueChange={v => setEventForm({ ...eventForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upcoming">Próximo</SelectItem>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="ended">Terminado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> URL Imagen portada</Label>
                    <Input value={eventForm.image_url} onChange={e => setEventForm({ ...eventForm, image_url: e.target.value })} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> URL Video (embed)</Label>
                    <Input value={eventForm.video_url} onChange={e => setEventForm({ ...eventForm, video_url: e.target.value })} placeholder="https://youtube.com/embed/..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="min-h-[80px]" />
                </div>
                <div className="space-y-2">
                  <Label>Lineup (uno por línea)</Label>
                  <Textarea value={eventForm.lineup} onChange={e => setEventForm({ ...eventForm, lineup: e.target.value })} className="min-h-[60px]" placeholder="DJ Alpha&#10;MC Beta" />
                </div>
                <div className="space-y-2">
                  <Label>URLs de galería (una por línea)</Label>
                  <Textarea value={eventForm.gallery_urls} onChange={e => setEventForm({ ...eventForm, gallery_urls: e.target.value })} className="min-h-[60px]" placeholder="https://img1.jpg&#10;https://img2.jpg" />
                </div>

                {/* Price tiers */}
                <div className="space-y-3">
                  <h4 className="font-display font-medium text-sm">Tramos de precio</h4>
                  {eventForm.tiers.map((tier, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end p-3 rounded-xl bg-muted">
                      <div><Label className="text-xs">Nombre</Label><Input value={tier.name} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], name: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                      <div><Label className="text-xs">Precio (€)</Label><Input type="number" value={tier.price} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], price: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                      <div><Label className="text-xs">Cantidad</Label><Input type="number" value={tier.maxQuantity} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], maxQuantity: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                      <div><Label className="text-xs">Expira</Label><Input type="datetime-local" value={tier.expiresAt} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], expiresAt: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                      <Button variant="ghost" size="sm" onClick={() => tier.id ? deleteTier(tier.id) : setEventForm({ ...eventForm, tiers: eventForm.tiers.filter((_, j) => j !== i) })} className="text-destructive self-end"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEventForm({ ...eventForm, tiers: [...eventForm.tiers, { id: '', name: '', price: '0', maxQuantity: '50', expiresAt: '' }] })}>
                    + Añadir tramo
                  </Button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={saveEvent} className="rounded-xl gap-2"><Save className="w-4 h-4" />{editingEventId ? 'Guardar Cambios' : 'Crear Evento'}</Button>
                  <Button variant="outline" onClick={resetEventForm} className="rounded-xl">Cancelar</Button>
                </div>
              </motion.div>
            )}

            {/* Event list */}
            <div className="space-y-3">
              {events.map(event => {
                const sold = event.price_tiers.reduce((s, t) => s + t.sold, 0);
                const revenue = tickets.filter(t => t.event_id === event.id).reduce((s, t) => s + Number(t.price), 0);
                const isExpanded = expandedEvent === event.id;

                return (
                  <div key={event.id} className="glass-card overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-display font-semibold truncate">{event.title}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              event.status === 'upcoming' ? 'bg-primary/10 text-primary' :
                              event.status === 'active' ? 'bg-success/10 text-success' :
                              event.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                              'bg-muted text-muted-foreground'
                            }`}>{event.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.city} · {event.venue}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(event.date), "d MMM yyyy", { locale: es })}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}h</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sold}/{event.capacity}</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{revenue}€</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <RouterLink to={`/event/${event.id}`}>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                          </RouterLink>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditEvent(event)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteEvent(event.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setExpandedEvent(isExpanded ? null : event.id)}>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {event.price_tiers.map(t => (
                            <div key={t.id} className="p-3 rounded-xl bg-muted space-y-1">
                              <p className="text-sm font-medium">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.sold}/{t.max_quantity} vendidos · {t.price}€</p>
                              <div className="h-1.5 rounded-full bg-background overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((t.sold / t.max_quantity) * 100, 100)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ATTENDEES */}
        {tab === 'attendees' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{filteredTickets.length} tickets</p>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar nombre, email, DNI, código..." value={attendeeSearch} onChange={e => setAttendeeSearch(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border bg-muted/50">
                      <th className="p-3 font-medium">Nombre</th>
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Teléfono</th>
                      <th className="p-3 font-medium">DNI</th>
                      <th className="p-3 font-medium">Evento</th>
                      <th className="p-3 font-medium">Tipo</th>
                      <th className="p-3 font-medium text-right">Precio</th>
                      <th className="p-3 font-medium">Estado</th>
                      <th className="p-3 font-medium">Código</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTickets.map(t => {
                      const ev = events.find(e => e.id === t.event_id);
                      return (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">{t.buyer_name}</td>
                          <td className="p-3 text-muted-foreground">{t.buyer_email}</td>
                          <td className="p-3 text-muted-foreground">{t.buyer_phone || '—'}</td>
                          <td className="p-3 text-muted-foreground">{t.buyer_dni || '—'}</td>
                          <td className="p-3 text-muted-foreground truncate max-w-[120px]">{ev?.title || '—'}</td>
                          <td className="p-3 text-muted-foreground">{t.tier_name}</td>
                          <td className="p-3 text-right font-display font-semibold text-primary">{t.price}€</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              t.status === 'valid' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                            }`}>{t.status === 'valid' ? 'Válido' : 'Usado'}</span>
                          </td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">{t.qr_code.slice(0, 16)}...</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredTickets.length === 0 && <p className="text-center text-muted-foreground py-12">Sin resultados</p>}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{users.length} usuarios</p>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar usuarios..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border bg-muted/50">
                      <th className="p-3 font-medium">Usuario</th>
                      <th className="p-3 font-medium">Email</th>
                      <th className="p-3 font-medium">Registrado</th>
                      <th className="p-3 font-medium">Roles</th>
                      <th className="p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map(u => (
                      <tr key={u.user_id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-xs">
                              {(u.display_name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{u.display_name || '—'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{u.email || '—'}</td>
                        <td className="p-3 text-muted-foreground text-xs">{format(new Date(u.created_at), "d MMM yyyy", { locale: es })}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map(r => (
                              <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-primary/10 text-primary">
                                {r}
                                <button onClick={() => removeRole(u.user_id, r)} className="hover:text-destructive ml-0.5"><X className="w-2.5 h-2.5" /></button>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          {editingUserId === u.user_id ? (
                            <div className="flex items-center gap-2">
                              <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="client">Client</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" onClick={() => addRole(u.user_id, newRole)} className="h-8 rounded-lg"><Save className="w-3 h-3" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingUserId(null)} className="h-8"><X className="w-3 h-3" /></Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => { setEditingUserId(u.user_id); setNewRole('client'); }} className="h-8 gap-1 rounded-lg">
                              <Shield className="w-3 h-3" /> Rol
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Event assignments */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Asignación de eventos
              </h3>
              <p className="text-sm text-muted-foreground">Asigna staff u organizadores a eventos específicos para limitar su acceso.</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Usuario (Staff/Admin)</Label>
                  <Select value={assignUserId} onValueChange={setAssignUserId}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {staffOrOrgUsers.map(u => (
                        <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Evento</Label>
                  <Select value={assignEventId} onValueChange={setAssignEventId}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {events.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignEvent} disabled={!assignUserId || !assignEventId} className="rounded-xl">Asignar</Button>
              </div>

              {assignments.length > 0 && (
                <div className="space-y-2 mt-4">
                  {assignments.map((a: any) => {
                    const u = users.find(u => u.user_id === a.user_id);
                    const ev = events.find(e => e.id === a.event_id);
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-muted">
                        <span className="text-sm"><span className="font-medium">{u?.display_name || u?.email || 'Desconocido'}</span> → <span className="text-primary font-medium">{ev?.title || 'Evento'}</span></span>
                        <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => removeAssignment(a.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOGS */}
        {tab === 'logs' && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2 bg-muted/50">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h3 className="font-display font-semibold text-sm">Logs de Escaneo</h3>
              <span className="text-xs text-muted-foreground ml-auto">{scanLogs.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-left border-b border-border">
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium">Asistente</th>
                    <th className="p-3 font-medium">Evento</th>
                    <th className="p-3 font-medium">Resultado</th>
                    <th className="p-3 font-medium">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scanLogs.map(log => {
                    const ev = events.find(e => e.id === log.event_id);
                    const staff = users.find(u => u.user_id === log.staff_id);
                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs">{format(new Date(log.scanned_at), "d MMM HH:mm:ss", { locale: es })}</td>
                        <td className="p-3 font-medium">{log.attendee_name || '—'}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-[120px]">{ev?.title || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            log.result === 'valid' ? 'bg-success/10 text-success'
                            : log.result === 'already_used' ? 'bg-warning/10 text-warning'
                            : 'bg-destructive/10 text-destructive'
                          }`}>{log.result}</span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{staff?.display_name || staff?.email || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {scanLogs.length === 0 && <p className="text-center text-muted-foreground py-12">Sin logs de escaneo</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
