export type BroadcastType =
  | 'general_update'
  | 'event_reminder'
  | 'emergency_alert'
  | 'agenda_shift'
  | 'event_rescheduled'
  | 'event_cancellation';

export type BroadcastScope = 'global' | 'city' | 'event' | 'category';

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  type: BroadcastType;
  scope: BroadcastScope;
  target_city?: string | null;
  target_event_id?: string | null;
  target_category?: string | null;
  event_title?: string | null;
  sender_email: string;
  sender_role: 'admin' | 'organizer';
  recipient_count: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface UserNotification {
  id: string;
  broadcast_id?: string | null;
  user_email: string;
  title: string;
  message: string;
  type: BroadcastType;
  is_read: boolean;
  link?: string | null;
  target_city?: string | null;
  target_category?: string | null;
  target_event_id?: string | null;
  scope?: BroadcastScope | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface BroadcastTypeConfig {
  label: string;
  description: string;
  icon: string; // emoji or identifier
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentGlow?: string;
  cardBg: string;
}

export const BROADCAST_TYPE_CONFIGS: Record<BroadcastType, BroadcastTypeConfig> = {
  general_update: {
    label: 'General Update',
    description: 'Community notices, new features, and general announcements',
    icon: '📢',
    badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-200',
    badgeText: 'text-blue-600',
    borderColor: 'border-blue-500/20',
    cardBg: 'bg-blue-50/50',
  },
  event_reminder: {
    label: 'Event Reminder',
    description: 'Upcoming event countdowns, preparation tips, and timings',
    icon: '⏰',
    badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-200',
    badgeText: 'text-amber-600',
    borderColor: 'border-amber-500/20',
    cardBg: 'bg-amber-50/50',
  },
  emergency_alert: {
    label: 'Emergency / Safety Alert',
    description: 'Urgent weather, venue changes, safety notices, and crisis alerts',
    icon: '🚨',
    badgeBg: 'bg-red-500/15 text-red-600 border-red-300 font-black animate-pulse',
    badgeText: 'text-red-600',
    borderColor: 'border-red-500/40 ring-1 ring-red-500/20',
    accentGlow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    cardBg: 'bg-red-50/60',
  },
  agenda_shift: {
    label: 'Agenda Shift',
    description: 'Live performance lineup changes, set time modifications, and delays',
    icon: '⏳',
    badgeBg: 'bg-orange-500/10 text-orange-600 border-orange-200',
    badgeText: 'text-orange-600',
    borderColor: 'border-orange-500/20',
    cardBg: 'bg-orange-50/50',
  },
  event_rescheduled: {
    label: 'Official Rescheduling',
    description: 'New dates, revised venue locations, or rescheduled time slots',
    icon: '📅',
    badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    badgeText: 'text-emerald-600',
    borderColor: 'border-emerald-500/20',
    cardBg: 'bg-emerald-50/50',
  },
  event_cancellation: {
    label: 'Cancellation of Event',
    description: 'Event cancellation, refund processing info, and official notice',
    icon: '❌',
    badgeBg: 'bg-rose-500/15 text-rose-700 border-rose-300 font-black',
    badgeText: 'text-rose-700',
    borderColor: 'border-rose-500/30',
    cardBg: 'bg-rose-50/60',
  },
};
