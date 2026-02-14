// ─── Modi's Mission — Shared Constants ───

export const APP_NAME = "Modi's Mission";
export const MAX_RECORDING_SECONDS = 120; // 2 minutes max
export const MIN_RECORDING_SECONDS = 3;

export const SUPABASE_TABLE = 'recordings';
export const SUPABASE_BUCKET = 'recordings';

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  // In production, use env vars and proper hashing
  password: 'ModiMission@2026',
};

export interface RecordingMetadata {
  id?: string;
  created_at?: string;
  duration_seconds: number;
  file_size_bytes: number;
  device_type: 'web' | 'mobile';
  storage_path: string;
  thumbnail_path?: string;
  status?: 'uploaded' | 'processing' | 'ready' | 'deleted';
  metadata?: Record<string, unknown>;
}

export const COLORS = {
  saffron: '#FF9933',
  saffronDark: '#E8870D',
  saffronLight: '#FFB366',
  white: '#FFFFFF',
  green: '#138808',
  greenDark: '#0D6B06',
  navy: '#000080',
  ashoka: '#000080',
  teal: '#1A6B7A',
  tealDark: '#0E4F5C',
  gold: '#D4A843',
  bg: '#0A0F1C',
  bgCard: '#111827',
  bgPanel: '#1A2236',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  danger: '#EF4444',
  success: '#22C55E',
};
