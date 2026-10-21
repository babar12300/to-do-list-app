import { useState } from 'react';
import { useApp, generateId } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { Plus, CalendarDays, Star } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function QuickAddTask() {
  const { state, dispatch } = useApp();
  const { language, activeListId } = state;
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [starred, setStarred] = useState(false);
  const [error, setError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const listId = ['inbox', 'today', 'upcoming', 'starred'].includes(activeListId) ? 'inbox' : activeListId;

  const addTask = () => {
    if (!title.trim()) {
      setError(true);
      return;
    }
    setError(false);

    const task = {
      id: generateId(),
      title: title.trim(),
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
      starred,
      completed: false,
      listId,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_TASK', payload: task });
    setTitle('');
    setDueDate(undefined);
    setStarred(false);
  };

  return (
    <div>
      {/* dot composer: 40px tall, 22px radius, white 44% + 8px blur, inner white ring */}
      <div className="flex items-center gap-1 h-10 px-2 rounded-bubble bg-white/[0.65] backdrop-blur-[8px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)]">
        <button
          onClick={addTask}
          className="flex-shrink-0 flex w-6 h-6 items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]"
          aria-label="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(false); }}
          onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
          placeholder={t(language, 'addTask')}
          className={cn(
            "flex-1 bg-transparent type-body-md text-foreground placeholder:text-black/25 focus:outline-none px-1",
            error && "placeholder:text-destructive/60"
          )}
        />

        {dueDate && (
          <span className="type-body-sm text-foreground bg-tint-4 px-2 py-0.5 rounded-full">
            {format(dueDate, 'MMM d')}
          </span>
        )}

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button className="flex-shrink-0 flex w-6 h-6 items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]" aria-label={t(language, 'dueDate')}>
              <CalendarDays className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={d => { setDueDate(d); setCalendarOpen(false); }}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <button
          onClick={() => setStarred(!starred)}
          className="flex-shrink-0 flex w-6 h-6 items-center justify-center rounded-full transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]"
          aria-label={starred ? t(language, 'unstarTask') : t(language, 'starTask')}
        >
          <Star className={cn("w-4 h-4 transition-colors", starred ? "fill-star text-star" : "text-tint-56")} />
        </button>
      </div>
      {error && <p className="type-body-sm !text-destructive mt-2 ml-9">{t(language, 'titleRequired')}</p>}
    </div>
  );
}
