import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project credentials
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function uploadRecordingMobile(
  fileUri: string,
  durationSeconds: number,
  onProgress?: (pct: number) => void
) {
  const timestamp = Date.now();
  const fileName = `mobile_${timestamp}.mp4`;
  const storagePath = `mobile/${fileName}`;

  onProgress?.(10);

  // Read file as blob
  const response = await fetch(fileUri);
  const blob = await response.blob();

  onProgress?.(30);

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'video/mp4',
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  onProgress?.(70);

  // Insert metadata
  const { data: record, error: dbError } = await supabase
    .from('recordings')
    .insert({
      duration_seconds: durationSeconds,
      file_size_bytes: blob.size,
      device_type: 'mobile',
      storage_path: storagePath,
      status: 'uploaded',
      metadata: {
        content_type: 'video/mp4',
        platform: 'react-native',
        recorded_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (dbError) {
    throw new Error(`Metadata save failed: ${dbError.message}`);
  }

  onProgress?.(100);
  return record;
}
