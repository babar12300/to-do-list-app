import { useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { listEmoji, defaultListEmoji } from '@/data/emoji';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /* The emoji currently set, so the grid can say which one is chosen. */
  value?: string;
  onSelect: (emoji: string | undefined) => void;
}

/* The chooser for a list's emoji.

   choosing-a-value rule 1: the value comes from a set, so the control shows the
   set — a grid you can see and tap, not a text field with an emoji for a
   placeholder (rule 3 calls that placeholder a confession). Rule 4 follows for
   free: a grid can only ever hand back a member of the domain, so the word
   "books" can never be stored where an emoji is expected. */
export function EmojiPickerDialog({ open, onOpenChange, value, onSelect }: Props) {
  const { state } = useApp();
  const { language } = state;

  const choose = useCallback((emoji: string | undefined) => {
    onSelect(emoji);
    onOpenChange(false);
  }, [onSelect, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t(language, 'chooseEmoji')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-8 gap-1 pt-2" role="group" aria-label={t(language, 'chooseEmoji')}>
          {listEmoji.map(emoji => (
            <button
              key={emoji}
              onClick={() => choose(emoji)}
              aria-pressed={value === emoji}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-lg transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]',
                value === emoji && 'bg-tint-12'
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
        {/* Clearing is part of the domain: an emoji is optional, and without this
            the only way back to the default would be to pick it out of the grid
            by eye. */}
        <button
          onClick={() => choose(undefined)}
          className="mt-2 w-full rounded-row px-3 py-2 type-body-md text-tint-56 transition-colors hover:bg-tint-4"
        >
          {t(language, 'noEmoji')} ({defaultListEmoji})
        </button>
      </DialogContent>
    </Dialog>
  );
}
