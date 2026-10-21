import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Index from './Index';
import { mockLocalStorage } from '@/test/helpers';

describe('Index page', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('renders sidebar and task list', () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getAllByText('Inbox').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('Add a task...')).toBeInTheDocument();
  });

  it('renders sample tasks on first load', () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByText(/Welcome to Taskly/)).toBeInTheDocument();
  });
});
