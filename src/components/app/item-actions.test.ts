import { describe, it, expect } from 'vitest';
import { taskActions, listActions } from './item-actions';
import type { Task } from '@/context/AppContext';

/* item-component rules 4, 6 and 7 are mechanically decidable off these two pure
   functions, so they are checked here rather than by reading a rendered menu. */

const task: Task = {
  id: 't1', title: 'Buy milk', starred: false, completed: false,
  listId: 'inbox', createdAt: new Date().toISOString(),
};

describe('taskActions', () => {
  it('offers every operation UPDATE_TASK supports (rule 6)', () => {
    const ids = taskActions(task).map(a => a.id);
    // title, dueDate and listId are all writable through UPDATE_TASK, so each
    // needs a door on the item itself — not only inside the detail panel.
    expect(ids).toContain('rename');
    expect(ids).toContain('dueDate');
    expect(ids).toContain('move');
    expect(ids).toContain('open');
    expect(ids).toContain('complete');
    expect(ids).toContain('star');
    expect(ids).toContain('email');
    expect(ids).toContain('delete');
  });

  it('offers Email as a non-destructive share action', () => {
    const email = taskActions(task).find(a => a.id === 'email');
    expect(email).toBeDefined();
    expect(email?.destructive).toBeUndefined();
  });

  it('puts the destructive action last, alone in its band (rule 4)', () => {
    const actions = taskActions(task);
    const last = actions[actions.length - 1];
    expect(last.id).toBe('delete');
    expect(last.destructive).toBe(true);
    expect(actions.filter(a => a.band === last.band)).toHaveLength(1);
    expect(actions.filter(a => a.destructive)).toHaveLength(1);
  });

  it('never lets a band number go backwards (rule 7)', () => {
    const bands = taskActions(task).map(a => a.band);
    expect(bands).toEqual([...bands].sort((a, b) => a - b));
  });

  it('flips the complete and star labels with the task state', () => {
    const done = taskActions({ ...task, completed: true, starred: true });
    expect(done.find(a => a.id === 'complete')?.labelKey).toBe('markIncomplete');
    expect(done.find(a => a.id === 'star')?.labelKey).toBe('unstarTask');
  });
});

describe('listActions', () => {
  it('offers a door to both fields UPDATE_LIST writes (rule 6)', () => {
    const ids = listActions().map(a => a.id);
    // { name, emoji } — the emoji had no door at all before.
    expect(ids).toContain('rename');
    expect(ids).toContain('emoji');
  });

  it('puts delete last, alone in its band (rule 4)', () => {
    const actions = listActions();
    const last = actions[actions.length - 1];
    expect(last.id).toBe('delete');
    expect(last.destructive).toBe(true);
    expect(actions.filter(a => a.band === last.band)).toHaveLength(1);
  });
});
