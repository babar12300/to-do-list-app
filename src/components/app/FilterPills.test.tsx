import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPills } from './FilterPills';
import { AppProvider } from '@/context/AppContext';
import { mockLocalStorage } from '@/test/helpers';

function renderPills() {
  return render(
    <AppProvider>
      <FilterPills />
    </AppProvider>
  );
}

describe('FilterPills', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders all 5 filter pills', () => {
    renderPills();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('Next 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Later')).toBeInTheDocument();
    expect(screen.getByText('No Date')).toBeInTheDocument();
  });

  it('applies active style when clicked', async () => {
    const user = userEvent.setup();
    renderPills();
    const todayPill = screen.getByText('Today');
    await user.click(todayPill);
    // Active pill gets the white chip with the hairline border
    expect(todayPill.className).toContain('bg-white');
  });

  it('toggles off when clicking same pill twice', async () => {
    const user = userEvent.setup();
    renderPills();
    const pill = screen.getByText('Tomorrow');
    await user.click(pill);
    expect(pill.className).toContain('bg-white');
    await user.click(pill);
    expect(pill.className).not.toContain('bg-white');
  });
});
