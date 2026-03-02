import { create } from 'zustand';
import { User, Ticket, Event, UserRole } from './types';
import { mockUsers, mockEvents, mockTickets } from './mock-data';

interface AppState {
  currentUser: User | null;
  events: Event[];
  tickets: Ticket[];
  setUser: (user: User | null) => void;
  switchRole: (role: UserRole) => void;
  addTicket: (ticket: Ticket) => void;
  markTicketUsed: (ticketId: string, staffId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  events: mockEvents,
  tickets: mockTickets,
  setUser: (user) => set({ currentUser: user }),
  switchRole: (role) => {
    const user = mockUsers.find((u) => u.role === role);
    set({ currentUser: user || null });
  },
  addTicket: (ticket) => set((state) => ({ tickets: [...state.tickets, ticket] })),
  markTicketUsed: (ticketId, staffId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? { ...t, status: 'used' as const, usedAt: new Date().toISOString(), scannedBy: staffId }
          : t
      ),
    })),
}));
