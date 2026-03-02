export type UserRole = 'guest' | 'client' | 'staff' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface PriceTier {
  id: string;
  name: string;
  price: number;
  maxQuantity: number;
  sold: number;
  expiresAt?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  imageUrl: string;
  capacity: number;
  ticketsSold: number;
  priceTiers: PriceTier[];
  organizerId: string;
  status: 'upcoming' | 'live' | 'ended';
  category: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  buyerName: string;
  buyerEmail: string;
  tierName: string;
  price: number;
  qrCode: string;
  status: 'valid' | 'used' | 'cancelled';
  purchasedAt: string;
  usedAt?: string;
  scannedBy?: string;
}

export interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid';
  ticket?: Ticket;
  message: string;
}
