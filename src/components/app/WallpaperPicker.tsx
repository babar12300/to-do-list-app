import { useEffect, useRef, useState } from 'react';
import { persistable, useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { wallpapers, wallpaperThumb } from '@/data/wallpapers';
import { Image, Upload, Loader2, Cloud, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareDeviceWallpaper } from '@/lib/device-wallpaper';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useWallpaperAccount } from '@/hooks/use-wallpaper-account';
import { downloadWallpaper, uploadPersonalImage } from '@/lib/cloud-wallpapers';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';

export function WallpaperPicker() {
  const { state, dispatch } = useApp();
  const { language, wallpaper, customWallpapers } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const account = useWallpaperAccount();
  const { user, photos, refresh } = account;
  // Cloud paths of photos already stored on this device (so they aren't shown twice).
  const [localPaths, setLocalPaths] = useState<Record<string, string>>({});
  const [nameDraft, setNameDraft] = useState('');
  useEffect(() => { setNameDraft(account.name); }, [account.name]);

  // Back up every photo on this device to the signed-in account.
  useEffect(() => {
    if (!user) { setLocalPaths({}); return; }
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      let uploaded = false;
      for (const url of customWallpapers) {
        try {
          const path = await uploadPersonalImage(user.id, url);
          next[path] = url;
          uploaded = true;
        } catch { /* retry on next change */ }
      }
      if (cancelled) return;
      setLocalPaths(next);
      if (uploaded) void refresh();
    })();
    return () => { cancelled = true; };
  }, [user, customWallpapers, refresh]);

  function keepOnDevice(url: string) {
    const custom = [...new Set([url, ...customWallpapers])];
    try {
      // Confirm it fits before changing the visible wallpaper or saved selection.
      localStorage.setItem('taskly-state', JSON.stringify(persistable({ ...state, wallpaper: url, customWallpapers: custom })));
    } catch {
      toast.error(t(language, 'wallpaperStorageFull'));
      return false;
    }
    dispatch({ type: 'ADD_DEVICE_WALLPAPER', payload: url });
    return true;
  }

  async function addFromDevice(file: File) {
    if (!user) return;
    setAdding(true);
    try {
      const url = await prepareDeviceWallpaper(file);
      keepOnDevice(url);
    } catch {
      toast.error(t(language, 'wallpaperImageError'));
    } finally {
      setAdding(false);
    }
  }

  async function useCloudPhoto(path: string) {
    setOpening(path);
    try {
      keepOnDevice(await downloadWallpaper(path));
    } catch {
      toast.error('Could not open this photo. Please try again.');
    } finally { setOpening(null); }
  }

  async function signIn() {
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
    if (result.error) toast.error('Sign-in failed. Please try again.');
  }

  async function saveName() {
    if (!user || nameDraft.trim() === account.name) return;
    const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: nameDraft.trim().slice(0, 100) });
    if (error) toast.error('Could not save your name.'); else void refresh();
  }

  async function changeAvatar(file: File) {
    if (!user) return;
    try {
      const bitmap = await prepareDeviceWallpaper(file);
      const path = await uploadPersonalImage(user.id, bitmap, 'avatar');
      const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: account.name, avatar_path: path });
      if (error) throw error;
      void refresh();
    } catch { toast.error('Could not update your photo.'); }
  }

  const cloudOnly = photos.filter(p => !localPaths[p.path]);
  let index = 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon"
          className="flex w-8 h-8 items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]"
          aria-label={t(language, 'wallpaper')}
        >
          <Image className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start" side="top">
        <p className="type-body-sm mb-2 px-1">
          {t(language, 'wallpaper')}
        </p>
        {account.ready && (user ? (
          <div className="flex items-center gap-2 mb-3">
            <button type="button" aria-label="Change profile photo" onClick={() => avatarRef.current?.click()}
              className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-muted border">
              {account.avatar && <img src={account.avatar} alt="" className="w-full h-full object-cover" />}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void changeAvatar(f); }} />
            <input aria-label="Your name" placeholder="Your name" value={nameDraft} className="h-8 flex-1 min-w-0 rounded-md border bg-background px-2 type-body-sm"
              onChange={e => setNameDraft(e.target.value)} onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Sign out"
              onClick={() => void supabase.auth.signOut()}><LogOut /></Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" className="w-full mb-2" onClick={signIn}>
            <Cloud /> Sign in to use your photos on all devices
          </Button>
        ))}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" aria-label={t(language, 'addWallpaperFromDevice')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void addFromDevice(file);
          }} />
        {user && <Button variant="outline" size="sm" className="w-full mb-3" disabled={adding} onClick={() => inputRef.current?.click()}>
          {adding ? <Loader2 className="animate-spin" /> : <Upload />}
          {t(language, 'addWallpaperFromDevice')}
        </Button>}
        <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
          {customWallpapers.map(url => renderTile(url, wallpaperThumb(url), wallpaper === url, () => dispatch({ type: 'SET_WALLPAPER', payload: url })))}
          {cloudOnly.map(p => renderTile(p.path, p.url, false, () => void useCloudPhoto(p.path), opening === p.path))}
          {wallpapers.map(url => renderTile(url, wallpaperThumb(url), wallpaper === url, () => dispatch({ type: 'SET_WALLPAPER', payload: url })))}
        </div>
      </PopoverContent>
    </Popover>
  );

  function renderTile(key: string, src: string, selected: boolean, onClick: () => void, busy = false) {
    index += 1;
    return (
      <Button variant="ghost" key={key}
        aria-label={`${t(language, 'wallpaper')} ${index}`}
        aria-pressed={selected}
        disabled={busy}
        onClick={onClick}
        className={cn(
          "relative h-auto p-0 aspect-[4/3] rounded-row overflow-hidden border transition-all hover:scale-105",
          selected ? "border-foreground" : "border-transparent opacity-80 hover:opacity-100"
        )}
      >
        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
        {busy && <Loader2 className="absolute animate-spin" />}
      </Button>
    );
  }
}
