import { useRef, useState } from 'react';
import { persistable, useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { wallpapers, wallpaperThumb } from '@/data/wallpapers';
import { Image, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareDeviceWallpaper } from '@/lib/device-wallpaper';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function WallpaperPicker() {
  const { state, dispatch } = useApp();
  const { language, wallpaper, customWallpapers } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);

  async function addFromDevice(file: File) {
    setAdding(true);
    try {
      const url = await prepareDeviceWallpaper(file);
      const custom = [...new Set([url, ...customWallpapers])];
      try {
        // Confirm it fits before changing the visible wallpaper or saved selection.
        localStorage.setItem('taskly-state', JSON.stringify(persistable({ ...state, wallpaper: url, customWallpapers: custom })));
      } catch {
        toast.error(t(language, 'wallpaperStorageFull'));
        return;
      }
      dispatch({ type: 'ADD_DEVICE_WALLPAPER', payload: url });
    } catch {
      toast.error(t(language, 'wallpaperImageError'));
    } finally {
      setAdding(false);
    }
  }

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
        <input ref={inputRef} type="file" accept="image/*" className="hidden" aria-label={t(language, 'addWallpaperFromDevice')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void addFromDevice(file);
          }} />
        <Button variant="outline" size="sm" className="w-full mb-3" disabled={adding} onClick={() => inputRef.current?.click()}>
          {adding ? <Loader2 className="animate-spin" /> : <Upload />}
          {t(language, 'addWallpaperFromDevice')}
        </Button>
        <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
          {[...customWallpapers, ...wallpapers].map((url, index) => (
            <Button variant="ghost"
              key={url}
              aria-label={`${t(language, 'wallpaper')} ${index + 1}`}
              aria-pressed={wallpaper === url}
              onClick={() => dispatch({ type: 'SET_WALLPAPER', payload: url })}
              className={cn(
                "h-auto p-0 aspect-[4/3] rounded-row overflow-hidden border transition-all hover:scale-105",
                wallpaper === url ? "border-foreground" : "border-transparent opacity-80 hover:opacity-100"
              )}
            >
              <img src={wallpaperThumb(url)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
