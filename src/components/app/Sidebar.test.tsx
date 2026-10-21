import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { AppProvider } from '@/context/AppContext';
import { mockLocalStorage } from '@/test/helpers';

function renderSidebar() {
  return render(
    <AppProvider>
      <Sidebar />
    </AppProvider>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders smart lists', () => {
    renderSidebar();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Starred')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderSidebar();
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  it('renders section labels', () => {
    renderSidebar();
    expect(screen.getByText('Smart Lists')).toBeInTheDocument();
    expect(screen.getByText('Lists')).toBeInTheDocument();
  });

  it('highlights active list', () => {
    renderSidebar();
    const inboxBtn = screen.getByText('Inbox').closest('button');
    expect(inboxBtn?.getAttribute('aria-current')).toBe('page');
  });

  it('has no dark mode toggle (dot has a single light theme)', () => {
    renderSidebar();
    expect(screen.queryByLabelText('Dark Mode')).not.toBeInTheDocument();
  });

  it('renders settings button', () => {
    renderSidebar();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('renders new list button', () => {
    renderSidebar();
    expect(screen.getByLabelText('New List')).toBeInTheDocument();
  });

  it('search input updates on typing', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const input = screen.getByPlaceholderText('Search tasks...');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('shows task count for inbox', () => {
    renderSidebar();
    // Default state has 3 tasks in inbox
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('clicking a smart list sets it active', async () => {
    const user = userEvent.setup();
    renderSidebar();
    const starredBtn = screen.getByText('Starred').closest('button');
    await user.click(starredBtn!);
    expect(starredBtn?.getAttribute('aria-current')).toBe('page');
  });

  it('shows custom lists after adding', async () => {
    const user = userEvent.setup();
    mockLocalStorage({
      tasks: [],
      lists: [{ id: 'custom1', name: 'Work', createdAt: new Date().toISOString() }],
      activeListId: 'inbox',
    });
    renderSidebar();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  // empty-state rule 2: an empty section that says nothing looks broken.
  it('says the Lists section is empty when it has no lists', () => {
    mockLocalStorage({ tasks: [], lists: [], activeListId: 'inbox' });
    renderSidebar();
    expect(screen.getByText(/No lists yet/)).toBeInTheDocument();
  });

  // empty-state rule 1: the chrome does not move when the section fills up.
  it('keeps the Lists header and + in both states', () => {
    mockLocalStorage({ tasks: [], lists: [], activeListId: 'inbox' });
    const { unmount } = renderSidebar();
    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(screen.getByLabelText('New List')).toBeInTheDocument();
    unmount();

    mockLocalStorage({
      tasks: [],
      lists: [{ id: 'custom1', name: 'Work', createdAt: new Date().toISOString() }],
      activeListId: 'inbox',
    });
    renderSidebar();
    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(screen.getByLabelText('New List')).toBeInTheDocument();
    expect(screen.queryByText(/No lists yet/)).not.toBeInTheDocument();
  });

  // item-component rule 3: `hidden` is display:none, so with no hover there was
  // no ⋯ button in the layout at all and a list could not be deleted on a phone.
  it('keeps the list ⋯ button in the layout without hover', () => {
    mockLocalStorage({
      tasks: [],
      lists: [{ id: 'custom1', name: 'Work', createdAt: new Date().toISOString() }],
      activeListId: 'inbox',
    });
    renderSidebar();
    const actions = screen.getByLabelText('List actions');
    expect(actions).toBeInTheDocument();
    expect(actions.className).not.toMatch(/\bhidden\b/);
    expect(actions.className).toContain('[@media(hover:none)]:opacity-100');
  });
});
