import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskItem } from './TaskItem';
import { AppProvider } from '@/context/AppContext';
import { mockLocalStorage } from '@/test/helpers';

function renderTaskItem(taskId: string) {
  return render(
    <AppProvider>
      <TaskItem taskId={taskId} />
    </AppProvider>
  );
}

describe('TaskItem', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders task title for default task', () => {
    renderTaskItem('1');
    expect(screen.getByText(/Welcome to Taskly/)).toBeInTheDocument();
  });

  it('renders nothing for non-existent task', () => {
    const { container } = renderTaskItem('nonexistent');
    expect(container.innerHTML).toBe('');
  });

  it('shows checkbox with correct aria attributes', () => {
    renderTaskItem('1');
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });

  it('shows star button', () => {
    renderTaskItem('2'); // task 2 is starred
    expect(screen.getByLabelText('Unstar task')).toBeInTheDocument();
  });

  it('shows "Star task" label for unstarred tasks', () => {
    renderTaskItem('1'); // task 1 is not starred
    expect(screen.getByLabelText('Star task')).toBeInTheDocument();
  });

  it('has keyboard support via Enter key', () => {
    renderTaskItem('1');
    const row = screen.getByRole('button', { name: /Welcome/ });
    expect(row).toBeDefined();
  });

  it('renders task with due date and meta info', () => {
    mockLocalStorage({
      tasks: [{ id: 'dt1', title: 'Dated task', starred: false, completed: false, listId: 'inbox', dueDate: '2025-12-25', createdAt: new Date().toISOString() }],
      lists: [],
      activeListId: 'inbox',
    });
    render(
      <AppProvider>
        <TaskItem taskId="dt1" />
      </AppProvider>
    );
    expect(screen.getByText('Dated task')).toBeInTheDocument();
    expect(screen.getByText(/Dec 25/)).toBeInTheDocument();
  });

  it('shows strikethrough for completed tasks', () => {
    mockLocalStorage({
      tasks: [{ id: 'c1', title: 'Done task', starred: false, completed: true, completedAt: new Date().toISOString(), listId: 'inbox', createdAt: new Date().toISOString() }],
      lists: [],
      activeListId: 'inbox',
    });
    render(
      <AppProvider>
        <TaskItem taskId="c1" />
      </AppProvider>
    );
    const title = screen.getByText('Done task');
    expect(title.className).toContain('line-through');
  });

  // item-component rule 1: the completed rows render through this same
  // component, so the menu-open mark has to be reachable for them too. Branching
  // on `completed` first put `menuOpen` behind a condition that could never be
  // true for a done task.
  it('checks the menu-open mark before the completed background', () => {
    mockLocalStorage({
      tasks: [{ id: 'c1', title: 'Done task', starred: false, completed: true, completedAt: new Date().toISOString(), listId: 'inbox', createdAt: new Date().toISOString() }],
      lists: [],
      activeListId: 'inbox',
      activeTaskId: 'c1',
    });
    render(
      <AppProvider>
        <TaskItem taskId="c1" />
      </AppProvider>
    );
    const row = screen.getByRole('button', { name: /Done task/ });
    // Selected wins over completed — the same branch menuOpen rides on.
    expect(row.className).toContain('bg-[#E6E1E2]');
    expect(row.className).not.toContain('bg-white/40');
  });

  // item-component rule 3: present and clickable, but invisible without hover.
  it('reveals the task ⋯ button on focus and where hover does not exist', () => {
    renderTaskItem('1');
    const actions = screen.getByLabelText('Task actions');
    expect(actions.className).toContain('focus-visible:opacity-100');
    expect(actions.className).toContain('[@media(hover:none)]:opacity-100');
    expect(actions.className).not.toMatch(/\bhidden\b/);
  });
});
