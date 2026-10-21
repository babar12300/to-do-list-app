import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsDialog } from './SettingsDialog';
import { AppProvider } from '@/context/AppContext';
import { mockLocalStorage } from '@/test/helpers';

describe('SettingsDialog', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders dialog when open', () => {
    render(
      <AppProvider>
        <SettingsDialog open={true} onOpenChange={() => {}} />
      </AppProvider>
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('does not render content when closed', () => {
    render(
      <AppProvider>
        <SettingsDialog open={false} onOpenChange={() => {}} />
      </AppProvider>
    );
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('calls onOpenChange when close is triggered', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AppProvider>
        <SettingsDialog open={true} onOpenChange={onOpenChange} />
      </AppProvider>
    );
    const closeButton = screen.getByRole('button', { name: 'Close' });
    await user.click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
