import { supabase } from '@/integrations/supabase/client';

export const IMAGE_BUCKET = 'personal-images';
export type CloudWallpaper = { path: string; url: string };

export async function uploadPersonalImage(userId: string, bitmap: string, folder = 'wallpapers') {
  const blob = await (await fetch(bitmap)).blob();
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  const path = `${userId}/${folder}/${hash}.webp`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { contentType: blob.type, upsert: true });
  if (error) throw error;
  return path;
}

export async function listCloudWallpapers(userId: string): Promise<CloudWallpaper[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(`${userId}/wallpapers`, {
      limit: 100, offset, sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) throw error;
    paths.push(...data.filter(item => item.id).map(item => `${userId}/wallpapers/${item.name}`));
    if (data.length < 100) break;
  }
  if (!paths.length) return [];
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  return data.map(item => {
    if (item.error || !item.signedUrl || !item.path) throw new Error('Could not open saved photo');
    return { path: item.path, url: item.signedUrl };
  });
}

export async function downloadWallpaper(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(path);
  if (error) throw error;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image'));
    reader.onerror = () => reject(new Error('Could not open saved photo'));
    reader.readAsDataURL(data);
  });
}