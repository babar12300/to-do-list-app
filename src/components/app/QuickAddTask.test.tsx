import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickAddTask } from './QuickAddTask';
import { AppProvider } from '@/context/AppContext';
import { mockLocalStorage } from '@/test/helpers';

function renderQuickAdd() {
  return render(
    <AppProvider>
      <QuickAddTask />
    </AppProvider>
  );
}

describe('QuickAddTask', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders the input and buttons', () => {
    renderQuickAdd();
    expect(screen.getByPlaceholderText('Add a task...')).toBeInTheDocument();
    expect(screen.getByLabelText('Add task')).toBeInTheDocument();
    expect(screen.getByLabelText('Star task')).toBeInTheDocument();
  });

  it('shows error when submitting empty title', async () => {
    const user = userEvent.setup();
    renderQuickAdd();
    await user.click(screen.getByLabelText('Add task'));
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('clears error when typing', async () => {
    const user = userEvent.setup();
    renderQuickAdd();
    await user.click(screen.getByLabelText('Add task'));
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('Add a task...'), 'a');
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
  });

  it('adds task on Enter key and clears input', async () => {
    const user = userEvent.setup();
    renderQuickAdd();
    const input = screen.getByPlaceholderText('Add a task...');
    await user.type(input, 'New task{Enter}');
    expect(input).toHaveValue('');
  });

  it('adds task on plus button click', async () => {
    const user = userEvent.setup();
    renderQuickAdd();
    await user.type(screen.getByPlaceholderText('Add a task...'), 'Another task');
    await user.click(screen.getByLabelText('Add task'));
    expect(screen.getByPlaceholderText('Add a task...')).toHaveValue('');
  });

  it('toggles star state', async () => {
    const user = userEvent.setup();
    renderQuickAdd();
    const starBtn = screen.getByLabelText('Star task');
    await user.click(starBtn);
    expect(screen.getByLabelText('Unstar task')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Unstar task'));
    expect(screen.getByLabelText('Star task')).toBeInTheDocument();
  });

  it('does not add task with whitespace-only title', async () => {
    const user = userEvent.setup();
    renderQuickAdd();
    await user.type(screen.getByPlaceholderText('Add a task...'), '   ');
    await user.click(screen.getByLabelText('Add task'));
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('resets star after adding task', async () => {
    const user = userEvent.setup();
    renderQuickAdd();
    await user.click(screen.getByLabelText('Star task'));
    await user.type(screen.getByPlaceholderText('Add a task...'), 'Starred task{Enter}');
    // Should reset to unstarred
    expect(screen.getByLabelText('Star task')).toBeInTheDocument();
  });
});
