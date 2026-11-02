import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { currentStreak, bestStreak, weeklySummary } from '@/lib/productivity';
import { Flame, Trophy } from 'lucide-react';

export function WeeklySummary({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state } = useApp();
  const lang = state.language;
  const stats = useMemo(() => ({
    streak: currentStreak(state.tasks), best: bestStreak(state.tasks), week: weeklySummary(state.tasks),
  }), [state.tasks]);
  const max = Math.max(1, ...stats.week.days.map(d => d.count));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t(lang, 'weeklySummary')}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted p-3">
            <Flame className="w-5 h-5 text-smart-today" />
            <p className="type-heading-md mt-1">{stats.streak} <span className="type-body-sm">{t(lang, 'days')}</span></p>
            <p className="type-body-sm text-muted-foreground">{t(lang, 'currentStreak')}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <Trophy className="w-5 h-5 text-smart-starred" />
            <p className="type-heading-md mt-1">{stats.best} <span className="type-body-sm">{t(lang, 'days')}</span></p>
            <p className="type-body-sm text-muted-foreground">{t(lang, 'bestStreak')}</p>
          </div>
        </div>
        <div>
          <p className="type-body-sm text-muted-foreground mb-2">{t(lang, 'completedThisWeek')}: <strong className="text-foreground">{stats.week.total}</strong></p>
          <div className="flex items-end gap-2 h-28" aria-label={t(lang, 'completedThisWeek')}>
            {stats.week.days.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="type-body-sm">{d.count || ''}</span>
                <div className="w-full rounded-t bg-primary" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
                <span className="type-body-sm text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-4 type-body-sm text-muted-foreground">
          <span>{t(lang, 'openTasks')}: <strong className="text-foreground">{stats.week.open}</strong></span>
          <span>{t(lang, 'overdue')}: <strong className="text-destructive">{stats.week.overdue}</strong></span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
