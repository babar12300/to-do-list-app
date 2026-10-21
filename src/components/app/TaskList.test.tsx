import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskList } from './TaskList';
import { AppProvider } from '@/context/AppContext';
import { mockLocalStorage } from '@/test/helpers';

function renderTaskList(stateOverrides = {}) {
  return render(
    <AppProvider>
      <TaskList />
    </AppProvider>
  );
}

describe('TaskList', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders the header with Inbox title', () => {
    renderTaskList();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  it('renders sample tasks', () => {
    renderTaskList();
    expect(screen.getByText(/Welcome to Taskly/)).toBeInTheDocument();
    expect(screen.getByText(/Try starring/)).toBeInTheDocument();
  });

  it('renders filter pills', () => {
    renderTaskList();
    // "Today" appears as both a filter pill and potentially a group header
    expect(screen.getAllByText('Today').length).toBeGreaterThanOrEqual(1);
    // "No Date" appears as both filter pill and group header
    expect(screen.getAllByText('No Date').length).toBeGreaterThanOrEqual(1);
  });

  it('renders quick add input', () => {
    renderTaskList();
    expect(screen.getByPlaceholderText('Add a task...')).toBeInTheDocument();
  });

  it('shows empty state when no tasks exist', () => {
    mockLocalStorage({ tasks: [], lists: [], activeListId: 'inbox' });
    renderTaskList();
    expect(screen.getByText(/Inbox zero/)).toBeInTheDocument();
  });

  it('shows empty state for Today view', () => {
    mockLocalStorage({ tasks: [], lists: [], activeListId: 'today' });
    renderTaskList();
    expect(screen.getByText(/Nothing due today/)).toBeInTheDocument();
  });

  it('shows empty state for Starred view', () => {
    mockLocalStorage({ tasks: [], lists: [], activeListId: 'starred' });
    renderTaskList();
    expect(screen.getByText(/No starred tasks/)).toBeInTheDocument();
  });

  it('shows completed section when completed tasks exist', () => {
    mockLocalStorage({
      tasks: [
        { id: 'a1', title: 'Active', starred: false, completed: false, listId: 'inbox', createdAt: new Date().toISOString() },
        { id: 'c1', title: 'Done', starred: false, completed: true, completedAt: new Date().toISOString(), listId: 'inbox', createdAt: new Date().toISOString() },
      ],
      lists: [],
      activeListId: 'inbox',
    });
    renderTaskList();
    expect(screen.getByText(/Completed \(1\)/)).toBeInTheDocument();
  });

  it('expands completed section on click', async () => {
    const user = userEvent.setup();
    mockLocalStorage({
      tasks: [
        { id: 'c1', title: 'Done task', starred: false, completed: true, completedAt: new Date().toISOString(), listId: 'inbox', createdAt: new Date().toISOString() },
      ],
      lists: [],
      activeListId: 'inbox',
    });
    renderTaskList();
    // Done task should not be visible initially (collapsed)
    expect(screen.queryByText('Done task')).not.toBeInTheDocument();
    await user.click(screen.getByText(/Completed/));
    expect(screen.getByText('Done task')).toBeInTheDocument();
  });

  // empty-state rule 10: the data exists, a filter is hiding it, and saying
  // "Inbox zero!" over tasks sitting right there is false and alarming.
  it('names the filter when a filter miss empties the view', () => {
    mockLocalStorage({
      tasks: [
        { id: 'a1', title: 'Undated task', starred: false, completed: false, listId: 'inbox', createdAt: new Date().toISOString() },
      ],
      lists: [],
      activeListId: 'inbox',
      dateFilter: 'later',
    });
    renderTaskList();
    expect(screen.getByText('No tasks in "Later"')).toBeInTheDocument();
    expect(screen.queryByText(/Inbox zero/)).not.toBeInTheDocument();
  });

  it('offers a way back out of the filter', async () => {
    const user = userEvent.setup();
    mockLocalStorage({
      tasks: [
        { id: 'a1', title: 'Undated task', starred: false, completed: false, listId: 'inbox', createdAt: new Date().toISOString() },
      ],
      lists: [],
      activeListId: 'inbox',
      dateFilter: 'later',
    });
    renderTaskList();
    await user.click(screen.getByText('Clear filter'));
    expect(screen.getByText('Undated task')).toBeInTheDocument();
    expect(screen.queryByText('No tasks in "Later"')).not.toBeInTheDocument();
  });

  // The inverse half of rule 10: an account with no data must never be told a
  // filter is hiding things.
  it('still says the collection is empty when a filter is set but nothing exists', () => {
    mockLocalStorage({ tasks: [], lists: [], activeListId: 'inbox', dateFilter: 'later' });
    renderTaskList();
    expect(screen.getByText(/Inbox zero/)).toBeInTheDocument();
    expect(screen.queryByText(/No tasks in/)).not.toBeInTheDocument();
    expect(screen.queryByText('Clear filter')).not.toBeInTheDocument();
  });

  it('groups active tasks under No Date when no due date', () => {
    renderTaskList();
    // Default sample tasks have no due date - appears as both pill and group header
    expect(screen.getAllByText('No Date').length).toBeGreaterThanOrEqual(1);
  });
});
