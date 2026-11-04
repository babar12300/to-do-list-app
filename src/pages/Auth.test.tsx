import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Auth from './Auth';
import ResetPassword from './ResetPassword';

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), change: vi.fn(), signIn: vi.fn(), signUp: vi.fn(), reset: vi.fn(), update: vi.fn(), oauth: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getUser: mocks.getUser, onAuthStateChange: mocks.change, signInWithPassword: mocks.signIn,
  signUp: mocks.signUp, resetPasswordForEmail: mocks.reset, updateUser: mocks.update,
} } }));
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: mocks.oauth } } }));

function open(path = '/sign-in') {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/" element={<h1>My tasks</h1>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="*" element={<Auth />} />
  </Routes></MemoryRouter>);
  return userEvent.setup();
}

describe('account pages', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.location.hash = '';
    mocks.change.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.signIn.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    mocks.reset.mockResolvedValue({ error: null });
    mocks.update.mockResolvedValue({ error: null });
  });

  it('submits email/password and responds to an authenticated session', async () => {
    const user = open();
    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    expect(mocks.signIn).toHaveBeenCalledWith({ email: 'person@example.com', password: 'secret123' });
    mocks.change.mock.calls[0][0]('SIGNED_IN', { user: { id: 'account' } });
    expect(await screen.findByRole('heading', { name: 'My tasks' })).toBeInTheDocument();
  });

  it('registers a name and waits for email confirmation rather than signing in', async () => {
    const user = open('/sign-up');
    await user.type(screen.getByLabelText('Name'), 'Alex');
    await user.type(screen.getByLabelText('Email'), 'alex@example.com');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign up', exact: true }));
    expect(mocks.signUp).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'secret123', options: {
      emailRedirectTo: window.location.origin, data: { display_name: 'Alex' },
    } });
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My tasks' })).not.toBeInTheDocument();
  });

  it('sends recovery emails to the public password reset page', async () => {
    const user = open('/forgot-password');
    await user.type(screen.getByLabelText('Email'), 'alex@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(mocks.reset).toHaveBeenCalledWith('alex@example.com', { redirectTo: `${window.location.origin}/reset-password` });
  });

  it('recovers from network errors without losing form input', async () => {
    mocks.signIn.mockRejectedValue(new Error('offline'));
    const user = open();
    await user.type(screen.getByLabelText('Email'), 'alex@example.com');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    expect(screen.getByLabelText('Email')).toHaveValue('alex@example.com');
  });

  it.each(['Google', 'Lovable'])('uses a public callback for %s sign-in', async (provider) => {
    mocks.oauth.mockResolvedValue({ redirected: true });
    const user = open();
    await user.click(screen.getByRole('button', { name: `Continue with ${provider}` }));
    expect(mocks.oauth).toHaveBeenCalledWith(provider.toLowerCase(), { redirect_uri: window.location.origin });
  });

  it('blocks password updates without a recovery link even for signed-in users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'account' } }, error: null });
    open('/reset-password');
    expect(screen.getByRole('button', { name: 'Save password' })).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('updates a verified recovery session without requiring the current password', async () => {
    window.location.hash = '#type=recovery';
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'account' } }, error: null });
    const user = open('/reset-password');
    await waitFor(() => expect(screen.getByLabelText('New password')).toBeEnabled());
    await user.type(screen.getByLabelText('New password'), 'newsecret123');
    await user.type(screen.getByLabelText('Confirm new password'), 'newsecret123');
    await user.click(screen.getByRole('button', { name: 'Save password' }));
    expect(mocks.update).toHaveBeenCalledWith({ password: 'newsecret123' });
    expect(await screen.findByRole('heading', { name: 'My tasks' })).toBeInTheDocument();
  });
});