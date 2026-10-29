import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyPlanner, openTasksSummary } from './DailyPlanner';
import { createTask, mockLocalStorage, renderWithProvider } from '@/test/helpers';

const mocks = vi.hoisted(() => ({ session: vi.fn(), invoke: vi.fn(), signIn: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: mocks.session }, functions: { invoke: mocks.invoke },
} }));
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: mocks.signIn } } }));

describe('DailyPlanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage({ tasks: [], lists: [] });
    mocks.session.mockResolvedValue({ data: { session: { user: { id: 'signed-in' } } }, error: null });
    mocks.invoke.mockResolvedValue({ data: { plan: '1. Finish report by 15:00\n09:00–10:30 Report' }, error: null });
  });

  async function open() {
    const user = userEvent.setup();
    renderWithProvider(<DailyPlanner />);
    await user.click(screen.getByRole('button', { name: 'Plan my day' }));
    return user;
  }

  it('includes unfinished tasks, due dates and importance, excluding completed tasks', () => {
    expect(openTasksSummary([
      createTask({ title: 'Report', dueDate: '2026-10-29', starred: true }),
      createTask({ title: 'Done', completed: true }),
    ])).toBe('- Report (due 2026-10-29) [starred]');
  });

  it('submits the user deadlines and open tasks and displays the returned plan', async () => {
    mockLocalStorage({ tasks: [createTask({ title: 'Call bank', dueDate: '2026-10-29' })], lists: [] });
    const user = await open();
    await user.type(screen.getByLabelText('Describe your tasks and deadlines'), 'Finish report by 3pm');
    await user.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(mocks.invoke).toHaveBeenCalledWith('daily-plan', { body: {
      description: 'Finish report by 3pm', tasks: '- Call bank (due 2026-10-29)', today: expect.any(String),
    } });
    expect(await screen.findByRole('region', { name: 'Your daily plan' })).toHaveTextContent('Finish report by 15:00');
  });

  it('requires sign-in before sending task details to AI', async () => {
    mocks.session.mockResolvedValue({ data: { session: null } });
    const user = await open();
    await user.type(screen.getByLabelText('Describe your tasks and deadlines'), 'Call bank');
    await user.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(await screen.findByRole('button', { name: 'Sign in to use the AI planner' })).toBeEnabled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('preserves input and shows the safe gateway error without retrying', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402 }) } });
    const user = await open();
    await user.type(screen.getByLabelText('Describe your tasks and deadlines'), 'Call bank');
    await user.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('AI credits exhausted.');
    expect(screen.getByLabelText('Describe your tasks and deadlines')).toHaveValue('Call bank');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Create plan' })).toBeEnabled();
  });

  it('clears loading after a connection failure', async () => {
    mocks.session.mockRejectedValue(new Error('offline'));
    const user = await open();
    await user.type(screen.getByLabelText('Describe your tasks and deadlines'), 'Call bank');
    await user.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not connect');
    expect(screen.getByRole('button', { name: 'Create plan' })).toBeEnabled();
  });
});