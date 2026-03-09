import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, Ticket, Calendar, Plus, Search, Loader2,
  Edit2, Save, X, ClipboardList, UserCog, Trash2, Shield, Link2, Eye,
  DollarSign, Activity, ChevronDown, ChevronUp, MapPin, Clock, Image, Video,
  UserPlus, Filter, TrendingUp, CheckCircle2, XCircle, AlertTriangle,
  Hash, Phone, Mail, CreditCard
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

const StatCard = ({ icon: Icon, label, value, sub, trend }: { icon: React.ElementType; label: string; value: string; sub?: string; trend?: 'up' | 'down' }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-background rounded-2xl border border-border p-5 space-y-3 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </div>
    <div className="flex items-end gap-2">
      <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
      {trend && <TrendingUp className={`w-4 h-4 mb-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'}`} />}
    </div>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </motion.div>
);

const Dashboard = () => {
  const { user, hasRole, profile, loading: authLoading } = useAuth();
  const isAdmin = hasRole('admin');
  const isStaff = hasRole('staff');

  const [events, setEvents] = useState<EventWithTiers[]>([]);
  const [tickets, setTickets] = useState<Tables<'tickets'>[]>([]);
  const [scanLogs, setScanLogs] = useState<Tables<'scan_logs'>[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'events' | 'attendees' | 'users' | 'logs'>('overview');

  // Event filter for overview
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');

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
  const [attendeeEventFilter, setAttendeeEventFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState({ display_name: '', email: '' });
  const [newRole, setNewRole] = useState<string>('client');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignEventId, setAssignEventId] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', display_name: '', role: 'client' });

  const fetchData = async () => {
    const [eventsRes, logsRes] = await Promise.all([
      supabase.from('events').select('*, price_tiers(*)').order('date'),
      supabase.from('scan_logs').select('*').order('scanned_at', { ascending: false }).limit(200),
    ]);

    if (eventsRes.data) setEvents(eventsRes.data as EventWithTiers[]);
    if (logsRes.data) setScanLogs(logsRes.data);

    if (isAdmin) {
      const [ticketsRes, profilesRes, rolesRes, assignRes] = await Promise.all([
        supabase.from('tickets').select('*').order('purchased_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('event_assignments').select('*'),
      ]);
      if (ticketsRes.data) setTickets(ticketsRes.data);
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
    } else if (isStaff) {
      const { data: assignData } = await supabase
        .from('event_assignments').select('*').eq('user_id', user!.id);
      if (assignData) {
        setAssignments(assignData);
        const assignedEventIds = assignData.map((a: any) => a.event_id);
        if (assignedEventIds.length > 0) {
          const { data: staffTickets } = await supabase
            .from('tickets')
            .select('*')
            .in('event_id', assignedEventIds)
            .order('purchased_at', { ascending: false });
          if (staffTickets) setTickets(staffTickets);
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user && (isAdmin || isStaff)) fetchData();
  }, [user]);

  if (authLoading) return null;
  if (!user || (!isAdmin && !isStaff)) return <Navigate to="/" replace />;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  // For staff, filter events to only assigned ones
  const visibleEvents = isStaff && !isAdmin
    ? events.filter(e => assignments.some(a => a.event_id === e.id))
    : events;

  // Filtered data based on selected event
  const filteredTicketsForOverview = selectedEventFilter === 'all'
    ? tickets
    : tickets.filter(t => t.event_id === selectedEventFilter);

  const totalRevenue = filteredTicketsForOverview.reduce((s, t) => s + Number(t.price), 0);
  const usedTickets = filteredTicketsForOverview.filter((t) => t.status === 'used').length;
  const overviewEvents = selectedEventFilter === 'all' ? visibleEvents : visibleEvents.filter(e => e.id === selectedEventFilter);
  const totalCapacity = overviewEvents.reduce((s, e) => s + e.capacity, 0);
  const totalSold = overviewEvents.reduce((s, e) => s + e.price_tiers.reduce((ss, t) => ss + t.sold, 0), 0);

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
    setTab('events');
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
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
    toast.success('Rol eliminado');
    fetchData();
  };

  const updateUserProfile = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from('profiles').update({
      display_name: editUserForm.display_name,
      email: editUserForm.email,
    }).eq('user_id', editingUser.user_id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Usuario actualizado');
      setEditingUser(null);
      fetchData();
    }
  };

  const assignEvent = async () => {
    if (!assignUserId || !assignEventId) return;
    const { error } = await supabase.from('event_assignments').insert({ user_id: assignUserId, event_id: assignEventId });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ya asignado' : error.message);
    } else {
      toast.success('Bar asignado');
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

  // Attendees tab filters
  const filteredTickets = tickets
    .filter(t => attendeeEventFilter === 'all' || t.event_id === attendeeEventFilter)
    .filter(t => {
      if (!attendeeSearch) return true;
      const q = attendeeSearch.toLowerCase();
      return t.buyer_name.toLowerCase().includes(q) ||
        t.buyer_email.toLowerCase().includes(q) ||
        t.qr_code.toLowerCase().includes(q) ||
        (t.buyer_dni || '').toLowerCase().includes(q) ||
        (t.buyer_phone || '').toLowerCase().includes(q);
    });

  const filteredUsers = userSearch
    ? users.filter(u =>
        (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const staffOrOrgUsers = users.filter(u => u.roles.includes('staff') || u.roles.includes('admin'));

  const adminTabs = [
    { key: 'overview' as const, label: 'Resumen', icon: BarChart3 },
    { key: 'events' as const, label: 'Bares', icon: Calendar },
    { key: 'attendees' as const, label: 'Canjes', icon: Ticket },
    { key: 'users' as const, label: 'Usuarios', icon: UserCog },
    { key: 'logs' as const, label: 'Auditoría', icon: ClipboardList },
  ];

  const staffTabs = [
    { key: 'overview' as const, label: 'Resumen', icon: BarChart3 },
    { key: 'attendees' as const, label: 'Asistentes', icon: Ticket },
    { key: 'logs' as const, label: 'Auditoría', icon: ClipboardList },
  ];

  const tabs = isAdmin ? adminTabs : staffTabs;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Admin Header */}
      <div className="bg-background border-b border-border">
        <div className="container py-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    {isAdmin ? 'Panel de Administración' : 'Panel de Staff'}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Bienvenido, {profile?.display_name || user.email}
                    <span className="ml-2 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      {isAdmin ? 'ADMIN' : 'STAFF'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Users className="w-4 h-4" />
                <span>{users.length} usuarios</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Ticket className="w-4 h-4" />
                <span>{tickets.length} tickets</span>
              </div>
            </div>
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
            {/* Event filter */}
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedEventFilter} onValueChange={setSelectedEventFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Todos los eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los eventos</SelectItem>
                  {visibleEvents.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Ingresos" value={`${totalRevenue.toFixed(0)}€`} sub="Total acumulado" trend="up" />
              <StatCard icon={Ticket} label="Tickets" value={`${filteredTicketsForOverview.length}`} sub={`${usedTickets} canjeados`} />
              <StatCard icon={Activity} label="Ocupación" value={`${totalSold}/${totalCapacity}`} sub={`${totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0}% vendido`} />
              <StatCard icon={Calendar} label="Eventos" value={`${overviewEvents.length}`} sub={`${overviewEvents.filter(e => e.status === 'upcoming').length} activos`} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Ventas por evento
                </h3>
                {overviewEvents.map((event) => {
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
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'}`} />
                      </div>
                    </div>
                  );
                })}
                {overviewEvents.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos.</p>}
              </div>

              <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Últimas ventas
                </h3>
                {filteredTicketsForOverview.slice(0, 10).map(t => {
                  const ev = events.find(e => e.id === t.event_id);
                  return (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.buyer_name}</p>
                        <p className="text-xs text-muted-foreground">{ev?.title} · {t.tier_name} · {format(new Date(t.purchased_at), "d MMM HH:mm", { locale: es })}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          t.status === 'valid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
                        }`}>{t.status === 'valid' ? 'Válido' : 'Usado'}</span>
                        <span className="font-display font-semibold text-primary">{t.price}€</span>
                      </div>
                    </div>
                  );
                })}
                {filteredTicketsForOverview.length === 0 && <p className="text-sm text-muted-foreground">Sin ventas aún.</p>}
              </div>
            </div>

            {/* Quick scan stats */}
            <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Resumen de escaneos
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="font-display text-2xl font-bold text-green-600 dark:text-green-400">{scanLogs.filter(l => l.result === 'valid').length}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Válidos</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="font-display text-2xl font-bold text-yellow-600 dark:text-yellow-400">{scanLogs.filter(l => l.result === 'already_used').length}</p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Ya usados</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="font-display text-2xl font-bold text-red-600 dark:text-red-400">{scanLogs.filter(l => l.result === 'invalid').length}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Inválidos</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS - Admin only */}
        {tab === 'events' && isAdmin && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{events.length} eventos</p>
              <Button onClick={() => { resetEventForm(); setShowCreateEvent(true); }} className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Nuevo Evento
              </Button>
            </div>

            {showCreateEvent && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-background rounded-2xl border border-border p-6 space-y-5">
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
                    <Label className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> URL Video (YouTube embed)</Label>
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
                const pct = event.capacity > 0 ? Math.round((sold / event.capacity) * 100) : 0;
                const isExpanded = expandedEvent === event.id;
                const eventAssignments = assignments.filter(a => a.event_id === event.id);
                const assignedUsers = eventAssignments.map(a => users.find(u => u.user_id === a.user_id)).filter(Boolean);

                return (
                  <div key={event.id} className="bg-background rounded-2xl border border-border overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-display font-semibold truncate">{event.title}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              event.status === 'upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              event.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              event.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-muted text-muted-foreground'
                            }`}>{event.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.city} · {event.venue}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(event.date), "d MMM yyyy", { locale: es })}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}h</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">{sold}/{event.capacity}</span>
                              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                            <span className="text-sm font-display font-semibold text-primary">{revenue}€</span>
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
                      <div className="px-4 pb-4 border-t border-border pt-3 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {event.price_tiers.map(t => (
                            <div key={t.id} className="p-3 rounded-xl bg-muted space-y-1">
                              <p className="text-sm font-medium">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.sold}/{t.max_quantity} vendidos · {t.price}€</p>
                              <div className="h-1.5 rounded-full bg-background overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((t.sold / t.max_quantity) * 100, 100)}%` }} />
                              </div>
                              {t.expires_at && (
                                <p className="text-[10px] text-muted-foreground">Expira: {format(new Date(t.expires_at), "d MMM yyyy HH:mm", { locale: es })}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        {assignedUsers.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Staff asignado:</p>
                            <div className="flex flex-wrap gap-2">
                              {assignedUsers.map((u: any) => (
                                <span key={u.user_id} className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                                  {u.display_name || u.email}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{filteredTickets.length} tickets</p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={attendeeEventFilter} onValueChange={setAttendeeEventFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todos los eventos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los eventos</SelectItem>
                    {visibleEvents.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar nombre, email, DNI..." value={attendeeSearch} onChange={e => setAttendeeSearch(e.target.value)} className="pl-10" />
                </div>
              </div>
            </div>

            <div className="bg-background rounded-2xl border border-border overflow-hidden">
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
                              t.status === 'valid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
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

        {/* USERS - Admin only */}
        {tab === 'users' && isAdmin && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{users.length} usuarios registrados</p>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar usuarios..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-10" />
              </div>
            </div>

            {/* User cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(u => {
                const userAssignments = assignments.filter(a => a.user_id === u.user_id);
                const assignedEvents = userAssignments.map(a => events.find(e => e.id === a.event_id)).filter(Boolean);

                return (
                  <div key={u.user_id} className="bg-background rounded-2xl border border-border p-5 space-y-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-display font-bold text-lg">
                          {(u.display_name || u.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{u.display_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{u.email || '—'}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                        setEditingUser(u);
                        setEditUserForm({ display_name: u.display_name || '', email: u.email || '' });
                      }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Registrado: {format(new Date(u.created_at), "d MMM yyyy", { locale: es })}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map(r => (
                          <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            r === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            r === 'staff' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {r}
                            <button onClick={() => removeRole(u.user_id, r)} className="hover:text-destructive ml-0.5"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                        <Dialog>
                          <DialogTrigger asChild>
                            <button className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
                              + Rol
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xs">
                            <DialogHeader>
                              <DialogTitle className="text-base">Añadir rol a {u.display_name || u.email}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="client">Cliente</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button onClick={() => addRole(u.user_id, newRole)} className="w-full rounded-xl">Añadir</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {assignedEvents.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Eventos asignados</p>
                        <div className="flex flex-wrap gap-1">
                          {assignedEvents.map((ev: any) => (
                            <span key={ev.id} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">{ev.title}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Edit user dialog */}
            {editingUser && (
              <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar usuario</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input value={editUserForm.display_name} onChange={e => setEditUserForm({ ...editUserForm, display_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={updateUserProfile} className="rounded-xl gap-2"><Save className="w-4 h-4" />Guardar</Button>
                      <Button variant="outline" onClick={() => setEditingUser(null)} className="rounded-xl">Cancelar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Event assignments */}
            <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Asignación de eventos
              </h3>
              <p className="text-sm text-muted-foreground">Asigna staff u organizadores a eventos para limitar su visibilidad.</p>
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
          <div className="bg-background rounded-2xl border border-border overflow-hidden">
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
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            log.result === 'valid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : log.result === 'already_used' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {log.result === 'valid' && <CheckCircle2 className="w-3 h-3" />}
                            {log.result === 'already_used' && <AlertTriangle className="w-3 h-3" />}
                            {log.result === 'invalid' && <XCircle className="w-3 h-3" />}
                            {log.result}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{staff?.display_name || staff?.email || log.staff_id.slice(0, 8)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {scanLogs.length === 0 && <p className="text-center text-muted-foreground py-12">Sin logs de escaneo. Los registros aparecerán cuando el staff escanee tickets.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
