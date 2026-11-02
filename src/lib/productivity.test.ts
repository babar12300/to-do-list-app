import { describe, it, expect } from 'vitest';
import { currentStreak, bestStreak, weeklySummary } from './productivity';
import type { Task } from '@/context/AppContext';

const now = new Date(2026, 10, 2, 15);
const done = (y: number, m: number, d: number): Task => ({
  id: `${m}-${d}-${Math.random()}`, title: 'x', starred: false, completed: true, listId: 'inbox',
  createdAt: '', completedAt: new Date(y, m, d, 12).toISOString(),
});

describe('productivity', () => {
  it('counts consecutive days ending today', () => {
    expect(currentStreak([done(2026, 10, 2), done(2026, 10, 1), done(2026, 9, 31), done(2026, 9, 29)], now)).toBe(3);
  });
  it('keeps the streak alive if the last completion was yesterday', () => {
    expect(currentStreak([done(2026, 10, 1), done(2026, 9, 31)], now)).toBe(2);
  });
  it('resets the streak after a missed day', () => {
    expect(currentStreak([done(2026, 9, 30)], now)).toBe(0);
  });
  it('finds the best streak', () => {
    expect(bestStreak([done(2026, 9, 1), done(2026, 9, 2), done(2026, 9, 3), done(2026, 9, 10)])).toBe(3);
  });
  it('sums completions over the last 7 days only', () => {
    const s = weeklySummary([done(2026, 10, 2), done(2026, 10, 2), done(2026, 9, 27), done(2026, 9, 26)], now);
    expect(s.total).toBe(3);
    expect(s.days[6].count).toBe(2);
  });
});
