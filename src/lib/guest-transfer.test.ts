import { beforeEach, describe, expect, it } from 'vitest';
import { createTask, mockLocalStorage } from '@/test/helpers';
import { selectGuestTasks, stageGuestTransfer, readGuestTransfer, clearGuestTransfer } from './guest-transfer';
import { TaskSync } from './task-sync';

const plan = { tasks: [createTask({ id: 'keep', title: 'Keep me', listId: 'work', notes: 'My notes', dueDate: '2026-11-09' }), createTask({ id: 'skip', title: 'Leave me' })],
  lists: [{ id: 'work', name: 'Work', createdAt: '2026-11-08' }, { id: 'unused', name: 'Unused', createdAt: '2026-11-08' }] };

describe('guest signup transfer', () => {
  beforeEach(() => mockLocalStorage());
  it('imports only chosen tasks and the lists they use, preserving task details', () => {
    const selected = selectGuestTasks(plan, ['keep']);
    expect(selected.tasks.map(task => task.title)).toEqual(['Keep me']);
    expect(selected.lists.map(list => list.name)).toEqual(['Work']);
    expect(selected.tasks[0].listId).toBe(selected.lists[0].id);
    expect(selected.tasks[0].notes).toBe('My notes');
    expect(selected.tasks[0].dueDate).toBe('2026-11-09');
    expect(selected.tasks[0].id).not.toBe('keep');
  });
  it('imports nothing when no tasks are chosen', () => {
    stageGuestTransfer(localStorage, selectGuestTasks(plan, []), 'new@example.com');
    expect(readGuestTransfer(localStorage, 'new@example.com')).toBeNull();
  });
  it('retains the selected draft across confirmation sessions but not for a different account', () => {
    const selected = selectGuestTasks(plan, ['keep']);
    stageGuestTransfer(localStorage, selected, 'New@Example.com');
    expect(readGuestTransfer(localStorage, 'other@example.com')).toBeNull();
    expect(readGuestTransfer(localStorage, 'new@example.com')).toEqual(selected);
  });
  it('adds selected tasks without replacing existing account tasks and consumes the draft once', async () => {
    const selected = selectGuestTasks(plan, ['keep']);
    stageGuestTransfer(localStorage, selected, 'new@example.com');
    const existing = createTask({ id: 'existing', title: 'Account task' });
    let remote = { tasks: [existing], lists: [], revision: 1 };
    const transport = { read: async () => remote, save: async (_revision: number, data: typeof selected) => (remote = { ...data, revision: 2 }) };
    const sync = new TaskSync(transport, localStorage, () => {}, () => {});
    sync.switchAccount('new-account', readGuestTransfer(localStorage, 'new@example.com') ?? { tasks: [], lists: [] });
    clearGuestTransfer(localStorage);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(remote.tasks.map(task => task.title).sort()).toEqual(['Account task', 'Keep me']);
    expect(readGuestTransfer(localStorage, 'new@example.com')).toBeNull();
    const reloaded = new TaskSync(transport, localStorage, () => {}, () => {});
    reloaded.switchAccount('new-account', { tasks: [], lists: [] });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(remote.tasks).toHaveLength(2);
  });
});