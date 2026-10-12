export type WaveCategory =
  | "All"
  | "Food & Drink"
  | "Coffee & Tea"
  | "Artisanal & Crafts"
  | "Wellness & Yoga"
  | "Snacks & Sweets"
  | "Fashion & Vintage"
  | "Music & Street Art";

export const VIZAG_LOCALITIES = [
  "All Vizag",
  "Beach Road & RK Beach",
  "Siripuram & Waltair",
  "MVP Colony",
  "Rushikonda & Sagar Nagar",
  "Madhurawada & IT SEZ",
  "Gajuwaka & Steel Plant",
  "Dwaraka Nagar & Asilmetta",
] as const;

export type WaveLocality = (typeof VIZAG_LOCALITIES)[number];

export interface WaveStall {
  id: string;
  organiser_id?: string;
  name: string;
  category: string;
  locality?: string; // Neighborhood in Visakhapatnam
  instagram_handle?: string | null;
  typical_schedule: string;
  typical_location: string;
  description: string;
  banner_url?: string | null;
  next_scheduled_at?: string | null; // ISO timestamp string if scheduled
  next_scheduled_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LiveWaveDrop {
  id: string;
  stall_id: string;
  title: string;
  batch_description?: string | null;
  location_descriptor: string;
  locality?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  started_at: string; // ISO timestamp string
  expires_at: string; // ISO timestamp string
  ended_at?: string | null;
  created_at?: string;
  stall: WaveStall;
}

export interface ScheduledWave {
  stall: WaveStall;
  next_scheduled_at: string; // ISO timestamp string
  next_scheduled_note?: string | null;
}

export interface WavesFeedResponse {
  live_waves: LiveWaveDrop[];
  scheduled_waves: ScheduledWave[];
  offline_directory: WaveStall[];
  updated_at?: string;
}

export interface WaveRegistrationPayload {
  stall_name: string;
  owner_name: string;
  phone_number: string;
  category: string;
  locality?: string;
  typical_schedule: string;
  typical_location: string;
  description: string;
  instagram_handle?: string;
}

export interface WaveRegistrationResult {
  pairing_token: string;
  telegram_link: string;
  stall_id: string;
  expires_at: string;
}
