import { addDays, format, parseISO, startOfDay } from 'date-fns';
import type { Task } from '@/context/AppContext';

/** Local yyyy-MM-dd days on which at least one task was completed. */
export function completionDays(tasks: Task[]): Set<string> {
  const days = new Set<string>();
  for (const t of tasks) {
    if (t.completed && t.completedAt) days.add(format(parseISO(t.completedAt), 'yyyy-MM-dd'));
  }
  return days;
}

/** Consecutive days with a completion ending today (or yesterday, so the streak survives until today ends). */
export function currentStreak(tasks: Task[], now = new Date()): number {
  const days = completionDays(tasks);
  let d = startOfDay(now);
  if (!days.has(format(d, 'yyyy-MM-dd'))) d = addDays(d, -1);
  let n = 0;
  while (days.has(format(d, 'yyyy-MM-dd'))) { n++; d = addDays(d, -1); }
  return n;
}

export function bestStreak(tasks: Task[]): number {
  const sorted = [...completionDays(tasks)].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const day of sorted) {
    run = prev && format(addDays(parseISO(prev), 1), 'yyyy-MM-dd') === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Completions for each of the last 7 days, oldest first. */
export function weeklySummary(tasks: Task[], now = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(startOfDay(now), i - 6);
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE'), count: 0 };
  });
  const idx = new Map(days.map((d, i) => [d.date, i]));
  for (const t of tasks) {
    if (!t.completed || !t.completedAt) continue;
    const i = idx.get(format(parseISO(t.completedAt), 'yyyy-MM-dd'));
    if (i !== undefined) days[i].count++;
  }
  const total = days.reduce((s, d) => s + d.count, 0);
  const todayStr = format(now, 'yyyy-MM-dd');
  const overdue = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;
  const open = tasks.filter(t => !t.completed).length;
  return { days, total, open, overdue };
}
