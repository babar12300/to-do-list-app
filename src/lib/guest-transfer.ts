import type { Plan } from './task-sync';

const KEY = 'taskly-guest-transfer';
let guestPlan: Plan | null = null;

// Route changes keep the current guest session in memory; reloads discard it.
export function rememberGuestPlan(plan: Plan | null) { guestPlan = plan; }
export function getGuestPlan() { return guestPlan; }

export function selectGuestTasks(plan: Plan, ids: string[]): Plan {
  const selected = new Set(ids);
  const tasks = plan.tasks.filter(task => selected.has(task.id));
  const usedLists = new Set(tasks.map(task => task.listId));
  const lists = plan.lists.filter(list => usedLists.has(list.id));
  const mappedLists = new Map(lists.map(list => [list.id, crypto.randomUUID()]));
  return {
    lists: lists.map(list => ({ ...list, id: mappedLists.get(list.id) ?? list.id })),
    tasks: tasks.map(task => ({ ...task, id: crypto.randomUUID(), listId: mappedLists.get(task.listId) ?? 'inbox' })),
  };
}

// Only the explicitly selected draft survives email confirmation / OAuth redirects.
export function stageGuestTransfer(storage: Storage, plan: Plan, email: string | null) {
  if (!plan.tasks.length) { storage.removeItem(KEY); return; }
  storage.setItem(KEY, JSON.stringify({ plan, email: email?.trim().toLowerCase() ?? null, expires: Date.now() + 7 * 86400000 }));
}

export function readGuestTransfer(storage: Storage, email?: string): Plan | null {
  try {
    const draft = JSON.parse(storage.getItem(KEY) ?? 'null');
    if (!draft) return null;
    if (draft.expires < Date.now()) { clearGuestTransfer(storage); return null; }
    if (draft.email && draft.email !== email?.trim().toLowerCase()) return null;
    if (!Array.isArray(draft.plan?.tasks) || !Array.isArray(draft.plan?.lists)) return null;
    return draft.plan;
  } catch { return null; }
}

export function clearGuestTransfer(storage: Storage) { storage.removeItem(KEY); }