-- ═══════════════════════════════════════════════════════════
-- Modi's Mission — Supabase Database Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- 1. Recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  duration_seconds FLOAT NOT NULL DEFAULT 0,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  device_type TEXT NOT NULL CHECK (device_type IN ('web', 'mobile')),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'deleted')),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable Row Level Security
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- 3. Policies — anyone can insert, anyone can read, only authenticated can delete
CREATE POLICY "public_insert_recordings"
  ON recordings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_select_recordings"
  ON recordings FOR SELECT
  USING (true);

CREATE POLICY "public_delete_recordings"
  ON recordings FOR DELETE
  USING (true);

-- 4. Index for fast queries
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);

-- 5. Storage bucket (run this or create via Dashboard → Storage)
-- Note: Bucket creation via SQL may need service_role key.
-- Preferred: Create bucket named 'recordings' in Dashboard → Storage → New Bucket (set Public)

-- 6. Storage policies
-- Go to Storage → recordings bucket → Policies and add:
--   INSERT: Allow for all users (anon)
--   SELECT: Allow for all users
--   DELETE: Allow for all users (or authenticated only)

-- Alternatively run these:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "recordings_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recordings');

CREATE POLICY "recordings_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings');

CREATE POLICY "recordings_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'recordings');
