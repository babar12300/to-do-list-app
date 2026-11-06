import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';

const mocks = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {
  getSession: mocks.session,
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
} } }));

function renderAt() {
  render(<MemoryRouter initialEntries={['/']}><Routes>
    <Route path="/" element={<RequireAuth><p>My tasks</p></RequireAuth>} />
    <Route path="/sign-in" element={<p>Sign in page</p>} />
  </Routes></MemoryRouter>);
}

describe('RequireAuth', () => {
  it('sends signed-out visitors to sign-in without showing tasks', async () => {
    mocks.session.mockResolvedValue({ data: { session: null } });
    renderAt();
    expect(await screen.findByText('Sign in page')).toBeInTheDocument();
    expect(screen.queryByText('My tasks')).toBeNull();
  });

  it('shows tasks to signed-in users', async () => {
    mocks.session.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    renderAt();
    expect(await screen.findByText('My tasks')).toBeInTheDocument();
  });
});
