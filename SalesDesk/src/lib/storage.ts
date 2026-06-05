'use client';

import { createClient } from '@/lib/supabase/client';

// Bucket Supabase Storage — crear en el dashboard con el nombre 'salesdesk'
// Estructura: salesdesk/orders/{id}/photo.{ext}
//             salesdesk/settlements/{id}/proof.{ext}
//             salesdesk/products/{id}/cover.{ext}

const BUCKET = 'salesdesk';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Formato no permitido. Usa JPG, PNG o WEBP.';
  if (file.size > MAX_FILE_SIZE) return 'El archivo supera el límite de 5MB.';
  return null;
}

export async function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const supabase = createClient();

  // Supabase Storage no reporta progreso — simular 50% al iniciar y 100% al terminar
  onProgress?.(50);

  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) throw new Error(error.message);

  onProgress?.(100);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export function generateStoragePath(folder: string, filename: string): string {
  const ts = Date.now();
  const ext = filename.split('.').pop() || 'jpg';
  return `${folder}/${ts}.${ext}`;
}
