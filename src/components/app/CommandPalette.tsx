import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useApp, generateId } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { Search, Plus, Inbox, CalendarDays, CalendarClock, Star, Mail, BarChart3, CheckCircle2, Circle } from 'lucide-react';

type Item = { id: string; group: string; label: string; icon: typeof Inbox; run: () => void };

export function CommandPalette({ open, onOpenChange, onOpenSummary }: {
  open: boolean; onOpenChange: (o: boolean) => void; onOpenSummary: () => void;
}) {
  const { state, dispatch } = useApp();
  const { language: lang, tasks, lists } = state;
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpenChange(!open); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => { if (open) { setQ(''); setSel(0); } }, [open]);

  const items = useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase();
    const go = (id: string) => () => { dispatch({ type: 'SET_SEARCH', payload: '' }); dispatch({ type: 'SET_ACTIVE_LIST', payload: id }); };
    const actions: Item[] = [];
    if (query) actions.push({
      id: 'new', group: 'paletteActions', label: `${t(lang, 'newTask')}: "${q.trim()}"`, icon: Plus,
      run: () => dispatch({ type: 'ADD_TASK', payload: { id: generateId(), title: q.trim(), starred: false, completed: false, listId: 'inbox', createdAt: new Date().toISOString() } }),
    });
    actions.push(
      { id: 'summary', group: 'paletteActions', label: t(lang, 'weeklySummary'), icon: BarChart3, run: onOpenSummary },
      { id: 'mail', group: 'paletteActions', label: t(lang, 'composeEmail'), icon: Mail, run: () => dispatch({ type: 'OPEN_COMPOSER' }) },
    );
    const nav: Item[] = [
      { id: 'inbox', icon: Inbox }, { id: 'today', icon: CalendarDays }, { id: 'upcoming', icon: CalendarClock }, { id: 'starred', icon: Star },
    ].map(n => ({ id: `nav-${n.id}`, group: 'paletteGoTo', label: t(lang, n.id), icon: n.icon, run: go(n.id) }))
      .concat(lists.map(l => ({ id: `nav-${l.id}`, group: 'paletteGoTo', label: `${l.emoji ?? ''} ${l.name}`.trim(), icon: Inbox, run: go(l.id) })));
    const taskItems: Item[] = query ? tasks.filter(x => x.title.toLowerCase().includes(query)).slice(0, 8).map(x => ({
      id: `task-${x.id}`, group: 'paletteTasks', label: x.title, icon: x.completed ? CheckCircle2 : Circle,
      run: () => { go(x.listId)(); dispatch({ type: 'SET_ACTIVE_TASK', payload: x.id }); },
    })) : [];
    const match = (i: Item) => !query || i.id === 'new' || i.label.toLowerCase().includes(query);
    return [...taskItems, ...actions.filter(match), ...nav.filter(match)];
  }, [q, tasks, lists, lang, dispatch, onOpenSummary]);

  const run = (i?: Item) => { if (!i) return; onOpenChange(false); i.run(); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden top-[20%] translate-y-0">
        <DialogTitle className="sr-only">{t(lang, 'commandPalette')}</DialogTitle>
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus value={q} placeholder={t(lang, 'paletteSearch')} aria-label={t(lang, 'paletteSearch')}
            onChange={e => { setQ(e.target.value); setSel(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
              if (e.key === 'Enter') { e.preventDefault(); run(items[sel]); }
            }}
            className="flex-1 h-12 bg-transparent outline-none type-body-md"
          />
        </div>
        <div role="listbox" className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && <p className="px-3 py-6 text-center type-body-sm text-muted-foreground">{t(lang, 'paletteNoResults')}</p>}
          {items.map((i, idx) => {
            const Icon = i.icon;
            return (
              <div key={i.id}>
                {(idx === 0 || items[idx - 1].group !== i.group) && (
                  <p className="px-3 pt-2 pb-1 type-body-sm text-muted-foreground">{t(lang, i.group)}</p>
                )}
                <button
                  role="option" aria-selected={idx === sel}
                  onMouseEnter={() => setSel(idx)} onClick={() => run(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left type-body-md ${idx === sel ? 'bg-accent text-accent-foreground' : ''}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{i.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
