import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { wallpapers, wallpaperThumb } from '@/data/wallpapers';
import { Image } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function WallpaperPicker() {
  const { state, dispatch } = useApp();
  const { language, wallpaper } = state;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex w-8 h-8 items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]"
          aria-label={t(language, 'wallpaper')}
        >
          <Image className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start" side="top">
        <p className="type-body-sm mb-2 px-1">
          {t(language, 'wallpaper')}
        </p>
        <div className="grid grid-cols-4 gap-2 max-h-[240px] overflow-y-auto">
          {wallpapers.map((url) => (
            <button
              key={url}
              onClick={() => dispatch({ type: 'SET_WALLPAPER', payload: url })}
              className={cn(
                "aspect-[4/3] rounded-row overflow-hidden border transition-all hover:scale-105",
                wallpaper === url ? "border-foreground" : "border-transparent opacity-80 hover:opacity-100"
              )}
            >
              <img src={wallpaperThumb(url)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
