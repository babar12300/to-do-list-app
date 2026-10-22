import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { EmailComposer } from './EmailComposer';
import { mockLocalStorage } from '@/test/helpers';

const { openMailtoMock } = vi.hoisted(() => ({ openMailtoMock: vi.fn() }));
vi.mock('@/lib/email', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/email')>();
  return { ...actual, openMailto: openMailtoMock };
});

function OpenButton({ payload }: { payload?: { subject?: string; body?: string } }) {
  const { dispatch } = useApp();
  return <button onClick={() => dispatch({ type: 'OPEN_COMPOSER', payload })}>open</button>;
}

function renderComposer(payload?: { subject?: string; body?: string }) {
  return render(
    <AppProvider>
      <OpenButton payload={payload} />
      <EmailComposer />
    </AppProvider>,
  );
}

describe('EmailComposer', () => {
  beforeEach(() => {
    mockLocalStorage();
    openMailtoMock.mockClear();
  });

  it('stays closed until opened', () => {
    renderComposer();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('seeds the fields from the prefill when opened', async () => {
    renderComposer({ subject: 'Hello task', body: 'Body text' });
    await act(async () => { screen.getByText('open').click(); });
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByLabelText('Subject')).toHaveValue('Hello task');
    expect(screen.getByLabelText('Message')).toHaveValue('Body text');
  });

  it('keeps Send disabled until there is a recipient', async () => {
    renderComposer({ subject: 'Hello task' });
    await act(async () => { screen.getByText('open').click(); });
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('hands the draft to the mail client and closes on send', async () => {
    const user = userEvent.setup();
    renderComposer({ subject: 'Hello task', body: 'Body text' });
    await act(async () => { screen.getByText('open').click(); });
    await user.type(screen.getByLabelText('To'), 'a@b.com');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(openMailtoMock).toHaveBeenCalledTimes(1);
    const url = openMailtoMock.mock.calls[0][0] as string;
    expect(url.startsWith('mailto:a%40b.com')).toBe(true);
    expect(url).toContain('subject=Hello%20task');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
