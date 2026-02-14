import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️  Missing Supabase env vars. Copy .env.local.example → .env.local and fill in your keys.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Upload recording to Supabase Storage ───
export async function uploadRecording(
  file: Blob,
  deviceType: 'web' | 'mobile',
  durationSeconds: number,
  onProgress?: (pct: number) => void
) {
  const timestamp = Date.now();
  const ext = file.type.includes('webm') ? 'webm' : 'mp4';
  const fileName = `${deviceType}_${timestamp}.${ext}`;
  const storagePath = `${deviceType}/${fileName}`;

  // Upload file
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'video/webm',
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Simulate progress (Supabase JS v2 doesn't expose upload progress)
  onProgress?.(80);

  // Insert metadata record
  const { data: record, error: dbError } = await supabase
    .from('recordings')
    .insert({
      duration_seconds: durationSeconds,
      file_size_bytes: file.size,
      device_type: deviceType,
      storage_path: storagePath,
      status: 'uploaded',
      metadata: {
        content_type: file.type,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        recorded_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (dbError) {
    console.error('DB insert error:', dbError);
    throw new Error(`Metadata save failed: ${dbError.message}`);
  }

  onProgress?.(100);
  return record;
}

// ─── Fetch all recordings ───
export async function fetchRecordings() {
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── Get public URL for a recording ───
export function getRecordingUrl(storagePath: string): string {
  const { data } = supabase.storage.from('recordings').getPublicUrl(storagePath);
  return data.publicUrl;
}

// ─── Delete a recording ───
export async function deleteRecording(id: string, storagePath: string) {
  // Delete from storage
  await supabase.storage.from('recordings').remove([storagePath]);

  // Update status in DB
  const { error } = await supabase
    .from('recordings')
    .update({ status: 'deleted' })
    .eq('id', id);

  if (error) throw error;
}
