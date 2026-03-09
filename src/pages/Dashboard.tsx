import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, Ticket, Calendar, Plus, Search, Loader2,
  Edit2, Save, X, ClipboardList, UserCog, Trash2, Shield, Link2, Eye,
  DollarSign, Activity, ChevronDown, ChevronUp, MapPin, Clock, Image,
  Filter, TrendingUp, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, QrCode, Upload
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
  const [overviewSearch, setOverviewSearch] = useState('');

  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', date: '', time: '', venue: '', city: 'Logroño',
    category: 'Bar/Restaurante', capacity: '500', status: 'active',
    image_url: '', maps_url: '', lineup: '', min_age: '0',
    gallery_urls: '',
    tiers: [{ id: '', name: 'Pincho individual', price: '3', maxQuantity: '200', expiresAt: '', description: '' }],
  });
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeEventFilter, setAttendeeEventFilter] = useState<string>('all');
  const [barSearch, setBarSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState({ display_name: '', email: '' });
  const [newRole, setNewRole] = useState<string>('client');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignEventId, setAssignEventId] = useState('');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  const fetchData = async () => {
    if (isAdmin) {
      const [eventsRes, logsRes, ticketsRes, profilesRes, rolesRes, assignRes] = await Promise.all([
        supabase.from('events').select('*, price_tiers(*)').order('title'),
        supabase.from('scan_logs').select('*').order('scanned_at', { ascending: false }).limit(200),
        supabase.from('tickets').select('*').order('purchased_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('event_assignments').select('*'),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data as EventWithTiers[]);
      if (logsRes.data) setScanLogs(logsRes.data);
      if (ticketsRes.data) setTickets(ticketsRes.data);
      if (assignRes.data) setAssignments(assignRes.data);

      if (profilesRes.data && rolesRes.data) {
        const roleMap: Record<string, string[]> = {};
        rolesRes.data.forEach((r: any) => {
          if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
          roleMap[r.user_id].push(r.role);
        });
        setUsers(profilesRes.data.map((p: any) => ({
          user_id: p.user_id, display_name: p.display_name, email: p.email,
          avatar_url: p.avatar_url, created_at: p.created_at,
          roles: roleMap[p.user_id] || [],
        })));
      }
    } else if (isStaff) {
      // Staff: fetch assignments first, then only data for assigned events
      const { data: assignData } = await supabase.from('event_assignments').select('*').eq('user_id', user!.id);
      if (assignData) {
        setAssignments(assignData);
        const assignedEventIds = assignData.map((a: any) => a.event_id);

        if (assignedEventIds.length > 0) {
          const [eventsRes, staffTickets, staffLogs] = await Promise.all([
            supabase.from('events').select('*, price_tiers(*)').in('id', assignedEventIds).order('title'),
            supabase.from('tickets').select('*').in('event_id', assignedEventIds).order('purchased_at', { ascending: false }),
            supabase.from('scan_logs').select('*').in('event_id', assignedEventIds).order('scanned_at', { ascending: false }).limit(200),
          ]);
          if (eventsRes.data) setEvents(eventsRes.data as EventWithTiers[]);
          if (staffTickets.data) setTickets(staffTickets.data);
          if (staffLogs.data) setScanLogs(staffLogs.data);
        } else {
          setEvents([]);
          setTickets([]);
          setScanLogs([]);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { if (user && (isAdmin || isStaff)) fetchData(); }, [user]);

  if (authLoading) return null;
  if (!user || (!isAdmin && !isStaff)) return <Navigate to="/" replace />;
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  // For staff, events are already filtered by assignment in fetchData
  const visibleEvents = events;

  const filteredTicketsForOverview = selectedEventFilter === 'all'
    ? tickets : tickets.filter(t => t.event_id === selectedEventFilter);

  const totalRevenue = filteredTicketsForOverview.reduce((s, t) => s + Number(t.price), 0);
  const usedTickets = filteredTicketsForOverview.filter((t) => t.status === 'used').length;
  const overviewEvents = selectedEventFilter === 'all' ? visibleEvents : visibleEvents.filter(e => e.id === selectedEventFilter);

  const eventForm_status_default = 'cerrado';
  const resetEventForm = () => {
    setEventForm({
      title: '', description: '', date: '', time: '', venue: '', city: 'Logroño',
      category: 'Bar/Restaurante', capacity: '500', status: eventForm_status_default,
      image_url: '', maps_url: '', lineup: '', min_age: '0', gallery_urls: '',
      tiers: [{ id: '', name: 'Pincho individual', price: '3', maxQuantity: '200', expiresAt: '', description: '' }],
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
      maps_url: (ev as any).maps_url || '',
      lineup: ev.lineup || '',
      min_age: String(ev.min_age || 0),
      gallery_urls: (ev.gallery_urls || []).join('\n'),
      tiers: ev.price_tiers.map(t => ({
        id: t.id, name: t.name, price: String(t.price),
        maxQuantity: String(t.max_quantity),
        expiresAt: t.expires_at ? t.expires_at.slice(0, 16) : '',
        description: (t as any).description || '',
      })),
    });
    setTab('events');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEvent = async () => {
    try {
      const galleryArray = eventForm.gallery_urls.split('\n').map(u => u.trim()).filter(Boolean);
      const eventData: any = {
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
        maps_url: eventForm.maps_url || null,
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
          event_id: eventId!, name: tier.name, price: parseFloat(tier.price),
          max_quantity: parseInt(tier.maxQuantity), expires_at: tier.expiresAt || null,
          description: tier.description || null,
        } as any;
        if (tier.id) {
          await supabase.from('price_tiers').update(tierData).eq('id', tier.id);
        } else {
          await supabase.from('price_tiers').insert(tierData);
        }
      }

      toast.success(editingEventId ? 'Bar actualizado' : 'Bar creado');
      resetEventForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('¿Eliminar este bar y todos sus datos?')) return;
    await supabase.from('price_tiers').delete().eq('event_id', id);
    await supabase.from('events').delete().eq('id', id);
    toast.success('Bar eliminado');
    fetchData();
  };

  const deleteTier = async (tierId: string) => {
    const newTiers = eventForm.tiers.filter(t => t.id !== tierId);
    if (tierId) await supabase.from('price_tiers').delete().eq('id', tierId);
    setEventForm({ ...eventForm, tiers: newTiers });
  };

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
    if (error) { toast.error(error.message.includes('duplicate') ? 'Ya tiene ese rol' : error.message); }
    else { toast.success('Rol añadido'); fetchData(); }
  };

  const removeRole = async (userId: string, role: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as any);
    toast.success('Rol eliminado');
    fetchData();
  };

  const updateUserProfile = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from('profiles').update({
      display_name: editUserForm.display_name, email: editUserForm.email,
    }).eq('user_id', editingUser.user_id);
    if (error) { toast.error(error.message); }
    else { toast.success('Usuario actualizado'); setEditingUser(null); fetchData(); }
  };

  const assignEvent = async () => {
    if (!assignUserId || !assignEventId) return;
    const { error } = await supabase.from('event_assignments').insert({ user_id: assignUserId, event_id: assignEventId });
    if (error) { toast.error(error.message.includes('duplicate') ? 'Ya asignado' : error.message); }
    else { toast.success('Bar asignado'); fetchData(); }
    setAssignUserId(''); setAssignEventId('');
  };

  const removeAssignment = async (id: string) => {
    await supabase.from('event_assignments').delete().eq('id', id);
    toast.success('Asignación eliminada'); fetchData();
  };

  // Attendees filters
  const filteredTickets = tickets
    .filter(t => attendeeEventFilter === 'all' || t.event_id === attendeeEventFilter)
    .filter(t => {
      if (!attendeeSearch) return true;
      const q = attendeeSearch.toLowerCase();
      return t.buyer_name.toLowerCase().includes(q) || t.buyer_email.toLowerCase().includes(q) ||
        t.qr_code.toLowerCase().includes(q) || (t.buyer_dni || '').toLowerCase().includes(q) ||
        (t.buyer_phone || '').toLowerCase().includes(q);
    });

  const filteredUsers = userSearch
    ? users.filter(u => (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase()))
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
    { key: 'attendees' as const, label: 'Canjes', icon: Ticket },
    { key: 'logs' as const, label: 'Auditoría', icon: ClipboardList },
  ];
  const tabs = isAdmin ? adminTabs : staffTabs;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="container py-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {isAdmin ? 'Panel de Administración' : 'Panel de Staff'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {profile?.display_name || user.email}
                  <span className="ml-2 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">
                    {isAdmin ? 'ADMIN' : 'STAFF'}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="container">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedEventFilter} onValueChange={setSelectedEventFilter}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="Todos los bares" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los bares</SelectItem>
                    {visibleEvents.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar bares..." value={overviewSearch} onChange={e => setOverviewSearch(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Ingresos" value={`${totalRevenue.toFixed(0)}€`} sub="Total acumulado" trend="up" />
              <StatCard icon={Ticket} label="Tickets" value={`${filteredTicketsForOverview.length}`} sub={`${usedTickets} canjeados`} />
              <StatCard icon={Activity} label="Tasa canje" value={`${filteredTicketsForOverview.length > 0 ? Math.round((usedTickets / filteredTicketsForOverview.length) * 100) : 0}%`} sub="Canjeados vs vendidos" />
              <StatCard icon={Calendar} label="Bares" value={`${overviewEvents.length}`} sub={`${overviewEvents.filter(e => e.status === 'active').length} activos`} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Ventas por bar</h3>
                {overviewEvents.map((event) => {
                  const sold = event.price_tiers.reduce((s, t) => s + t.sold, 0);
                  const revenue = tickets.filter(t => t.event_id === event.id).reduce((s, t) => s + Number(t.price), 0);
                  const maxPacks = event.price_tiers.reduce((s, t) => s + t.max_quantity, 0);
                  const pct = maxPacks > 0 ? Math.round((sold / maxPacks) * 100) : 0;
                  return (
                    <div key={event.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate max-w-[60%]">{event.title}</span>
                        <span className="text-muted-foreground">{sold} vendidos · {revenue}€</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'}`} />
                      </div>
                    </div>
                  );
                })}
                {overviewEvents.length === 0 && <p className="text-sm text-muted-foreground">No hay bares.</p>}
              </div>

              <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
                <h3 className="font-display font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Últimas ventas</h3>
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
                        }`}>{t.status === 'valid' ? 'Válido' : 'Canjeado'}</span>
                        <span className="font-display font-semibold text-primary">{t.price}€</span>
                      </div>
                    </div>
                  );
                })}
                {filteredTicketsForOverview.length === 0 && <p className="text-sm text-muted-foreground">Sin ventas aún.</p>}
              </div>
            </div>

            <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Resumen de escaneos</h3>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar bares..." value={barSearch} onChange={e => setBarSearch(e.target.value)} className="pl-10" />
              </div>
              <Button onClick={() => { resetEventForm(); setShowCreateEvent(true); }} className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Nuevo Bar
              </Button>
            </div>

            {showCreateEvent && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-background rounded-2xl border border-border p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-lg">{editingEventId ? 'Editar Bar' : 'Crear Bar'}</h3>
                  <Button variant="ghost" size="sm" onClick={resetEventForm}><X className="w-4 h-4" /></Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Nombre del bar *</Label><Input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Categoría</Label><Input value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Fecha de alta</Label><Input type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Horario</Label><Input value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })} placeholder="12:00 - 00:00" /></div>
                  <div className="space-y-2"><Label>Dirección *</Label><Input value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} placeholder="Calle San Juan, 15" /></div>
                  <div className="space-y-2"><Label>Ciudad *</Label><Input value={eventForm.city} onChange={e => setEventForm({ ...eventForm, city: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={eventForm.status} onValueChange={v => setEventForm({ ...eventForm, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="upcoming">Próximamente</SelectItem>
                        <SelectItem value="ended">Cerrado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Image className="w-3.5 h-3.5" /> Imagen del bar</Label>
                    <Input value={eventForm.image_url} onChange={e => setEventForm({ ...eventForm, image_url: e.target.value })} placeholder="https://... o sube una imagen" />
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const ext = file.name.split('.').pop();
                        const path = `bars/${Date.now()}.${ext}`;
                        const { error } = await supabase.storage.from('bar-images').upload(path, file);
                        if (error) { toast.error('Error subiendo imagen'); return; }
                        const { data: { publicUrl } } = supabase.storage.from('bar-images').getPublicUrl(path);
                        setEventForm(prev => ({ ...prev, image_url: publicUrl }));
                        toast.success('Imagen subida');
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => imageInputRef.current?.click()}>
                      <Upload className="w-3.5 h-3.5" /> Subir imagen
                    </Button>
                    {eventForm.image_url && (
                      <div className="mt-2 h-24 rounded-lg overflow-hidden border border-border">
                        <img src={eventForm.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> URL Google Maps</Label>
                    <Input value={eventForm.maps_url} onChange={e => setEventForm({ ...eventForm, maps_url: e.target.value })} placeholder="https://www.google.com/maps/..." />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="min-h-[80px]" placeholder="Especialidades, ambiente, historia del bar..." />
                </div>
                <div className="space-y-2">
                  <Label>URLs de galería (una por línea)</Label>
                  <Textarea value={eventForm.gallery_urls} onChange={e => setEventForm({ ...eventForm, gallery_urls: e.target.value })} className="min-h-[60px]" placeholder="https://img1.jpg&#10;https://img2.jpg" />
                </div>

                {/* Price tiers / Packs */}
                <div className="space-y-3">
                  <h4 className="font-display font-medium text-sm">Packs de pinchos / vinos</h4>
                  {eventForm.tiers.map((tier, i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                        <div><Label className="text-xs">Nombre</Label><Input value={tier.name} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], name: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                        <div><Label className="text-xs">Precio (€)</Label><Input type="number" value={tier.price} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], price: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                        <div><Label className="text-xs">Cantidad</Label><Input type="number" value={tier.maxQuantity} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], maxQuantity: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                        <div><Label className="text-xs">Expira</Label><Input type="datetime-local" value={tier.expiresAt} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], expiresAt: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} /></div>
                        <Button variant="ghost" size="sm" onClick={() => tier.id ? deleteTier(tier.id) : setEventForm({ ...eventForm, tiers: eventForm.tiers.filter((_, j) => j !== i) })} className="text-destructive self-end"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                      <div><Label className="text-xs">Descripción del pack</Label><Input value={tier.description} onChange={e => { const t = [...eventForm.tiers]; t[i] = { ...t[i], description: e.target.value }; setEventForm({ ...eventForm, tiers: t }); }} placeholder="Ej: Incluye pincho + caña" /></div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEventForm({ ...eventForm, tiers: [...eventForm.tiers, { id: '', name: '', price: '0', maxQuantity: '50', expiresAt: '', description: '' }] })}>
                    + Añadir pack
                  </Button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={saveEvent} className="rounded-xl gap-2"><Save className="w-4 h-4" />{editingEventId ? 'Guardar Cambios' : 'Crear Bar'}</Button>
                  <Button variant="outline" onClick={resetEventForm} className="rounded-xl">Cancelar</Button>
                </div>
              </motion.div>
            )}

            {/* Event list */}
            <div className="space-y-3">
              {events.filter(e => !barSearch || e.title.toLowerCase().includes(barSearch.toLowerCase()) || e.venue.toLowerCase().includes(barSearch.toLowerCase())).map(event => {
                const sold = event.price_tiers.reduce((s, t) => s + t.sold, 0);
                const revenue = tickets.filter(t => t.event_id === event.id).reduce((s, t) => s + Number(t.price), 0);
                const isExpanded = expandedEvent === event.id;
                const eventAssignments = assignments.filter(a => a.event_id === event.id);
                const assignedUsers = eventAssignments.map(a => users.find(u => u.user_id === a.user_id)).filter(Boolean);

                return (
                  <div key={event.id} className="bg-background rounded-2xl border border-border overflow-hidden hover:shadow-sm transition-shadow">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 flex-1 min-w-0">
                          {event.image_url && (
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                              <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-display font-semibold truncate">{event.title}</h3>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                event.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                event.status === 'upcoming' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-muted text-muted-foreground'
                              }`}>{event.status}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}</span>
                              {event.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-medium">{sold} vendidos</span>
                              <span className="text-sm font-display font-semibold text-primary">{revenue}€</span>
                            </div>
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
                            </div>
                          ))}
                        </div>
                        {assignedUsers.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Staff asignado:</p>
                            <div className="flex flex-wrap gap-1">
                              {assignedUsers.map((u: any) => (
                                <span key={u.user_id} className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-medium">{u.display_name || u.email}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(event as any).maps_url && (
                          <a href={(event as any).maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <MapPin className="w-3 h-3" /> Ver en Google Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CANJES (Tickets) */}
        {tab === 'attendees' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{filteredTickets.length} tickets</p>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={attendeeEventFilter} onValueChange={setAttendeeEventFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Todos los bares" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los bares</SelectItem>
                    {visibleEvents.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar nombre, email, DNI, código..." value={attendeeSearch} onChange={e => setAttendeeSearch(e.target.value)} className="pl-10" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {filteredTickets.map(t => {
                const ev = events.find(e => e.id === t.event_id);
                const isOpen = expandedTicket === t.id;
                return (
                  <div key={t.id} className="bg-background rounded-2xl border border-border overflow-hidden hover:shadow-sm transition-shadow">
                    <button
                      onClick={() => setExpandedTicket(isOpen ? null : t.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.status === 'valid' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.buyer_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{ev?.title} · {t.tier_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          t.status === 'valid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'
                        }`}>{t.status === 'valid' ? 'Válido' : 'Canjeado'}</span>
                        {(t as any).quantity > 1 && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">x{(t as any).quantity}</span>}
                        <span className="font-display font-semibold text-primary">{t.price}€</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-border pt-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div><span className="text-muted-foreground text-xs">Nombre</span><p className="font-medium">{t.buyer_name}</p></div>
                            <div><span className="text-muted-foreground text-xs">Email</span><p>{t.buyer_email}</p></div>
                            <div><span className="text-muted-foreground text-xs">Teléfono</span><p>{t.buyer_phone || '—'}</p></div>
                            <div><span className="text-muted-foreground text-xs">DNI</span><p>{t.buyer_dni || '—'}</p></div>
                            <div><span className="text-muted-foreground text-xs">Fecha nacimiento</span><p>{t.buyer_dob || '—'}</p></div>
                          </div>
                          <div className="space-y-2">
                            <div><span className="text-muted-foreground text-xs">Bar</span><p className="font-medium">{ev?.title || '—'}</p></div>
                            <div><span className="text-muted-foreground text-xs">Pack</span><p>{t.tier_name}</p></div>
                            <div><span className="text-muted-foreground text-xs">Precio</span><p className="font-display font-bold text-primary">{t.price}€</p></div>
                            <div><span className="text-muted-foreground text-xs">Comprado</span><p>{format(new Date(t.purchased_at), "d MMM yyyy HH:mm", { locale: es })}</p></div>
                            {t.used_at && <div><span className="text-muted-foreground text-xs">Canjeado</span><p>{format(new Date(t.used_at), "d MMM yyyy HH:mm", { locale: es })}</p></div>}
                          </div>
                        </div>
                        <div className="mt-4 p-3 rounded-xl bg-muted space-y-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><QrCode className="w-3.5 h-3.5" /> Código QR completo</div>
                          <p className="font-mono text-xs break-all select-all">{t.qr_code}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">Firma</div>
                          <p className="font-mono text-[10px] break-all select-all text-muted-foreground">{t.qr_signature}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {filteredTickets.length === 0 && <p className="text-center text-muted-foreground py-12">Sin resultados</p>}
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
                      }}><Edit2 className="w-3.5 h-3.5" /></Button>
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
                            <button className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors">+ Rol</button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xs">
                            <DialogHeader><DialogTitle className="text-base">Añadir rol a {u.display_name || u.email}</DialogTitle></DialogHeader>
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
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Bares asignados</p>
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

            {editingUser && (
              <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Nombre</Label><Input value={editUserForm.display_name} onChange={e => setEditUserForm({ ...editUserForm, display_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} /></div>
                    <div className="flex gap-2">
                      <Button onClick={updateUserProfile} className="rounded-xl gap-2"><Save className="w-4 h-4" />Guardar</Button>
                      <Button variant="outline" onClick={() => setEditingUser(null)} className="rounded-xl">Cancelar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Bar assignments */}
            <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-2"><Link2 className="w-5 h-5 text-primary" /> Asignación de bares/restaurantes</h3>
              <p className="text-sm text-muted-foreground">Asigna staff a bares para limitar su visibilidad en el dashboard y scanner.</p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Usuario (Staff/Admin)</Label>
                  <Select value={assignUserId} onValueChange={setAssignUserId}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {staffOrOrgUsers.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bar / Restaurante</Label>
                  <Select value={assignEventId} onValueChange={setAssignEventId}>
                    <SelectTrigger className="w-52"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
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
                        <span className="text-sm"><span className="font-medium">{u?.display_name || u?.email || '?'}</span> → <span className="text-primary font-medium">{ev?.title || 'Bar'}</span></span>
                        <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => removeAssignment(a.id)}><Trash2 className="w-3 h-3" /></Button>
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
                    <th className="p-3 font-medium">Cliente</th>
                    <th className="p-3 font-medium">Bar</th>
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
            {scanLogs.length === 0 && <p className="text-center text-muted-foreground py-12">Sin logs de escaneo.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
