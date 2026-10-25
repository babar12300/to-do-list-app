import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { IMAGE_BUCKET, listCloudWallpapers, type CloudWallpaper } from '@/lib/cloud-wallpapers';
import { toast } from 'sonner';

export function useWallpaperAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [photos, setPhotos] = useState<CloudWallpaper[]>([]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const owner = useRef<string | null>(null);
  const refresh = useCallback(async () => {
    if (!user) return;
    const id = user.id;
    setLoading(true);
    try {
      const gallery = await listCloudWallpapers(id);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      let url: string | null = null;
      if (data?.avatar_path) {
        const signed = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(data.avatar_path, 3600);
        if (signed.error) throw signed.error;
        url = signed.data.signedUrl;
      }
      if (owner.current !== id) return;
      setPhotos(gallery);
      setName(data?.display_name ?? user.user_metadata?.full_name ?? '');
      setAvatar(url);
    } catch {
      if (owner.current === id) toast.error('Could not load account photos. Please try again.');
    } finally { if (owner.current === id) setLoading(false); }
  }, [user]);

  useEffect(() => {
    let active = true;
    const accept = (next: User | null) => {
      if (!active) return;
      if (owner.current !== (next?.id ?? null)) {
        setPhotos([]); setName(''); setAvatar(null);
      }
      owner.current = next?.id ?? null;
      setUser(next); setReady(true);
    };
    let revision = 0;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { revision++; accept(session?.user ?? null); });
    const initial = revision;
    void supabase.auth.getUser().then(({ data }) => { if (initial === revision) accept(data.user); }).catch(() => accept(null));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    void refresh();
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    const timer = window.setInterval(focus, 120000);
    return () => { window.removeEventListener('focus', focus); clearInterval(timer); };
  }, [user, refresh]);
  return { user, ready, photos, name, avatar, loading, refresh };
}