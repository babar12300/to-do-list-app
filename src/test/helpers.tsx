import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AppProvider, AppState, Task } from '@/context/AppContext';

// Wrapper that provides AppProvider context
export function renderWithProvider(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => <AppProvider>{children}</AppProvider>,
    ...options,
  });
}

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id || 'test-' + Math.random().toString(36).slice(2),
    title: 'Test Task',
    starred: false,
    completed: false,
    listId: 'inbox',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Mock localStorage
export function mockLocalStorage(state?: Partial<AppState>) {
  const store: Record<string, string> = {};
  if (state) {
    store['taskly-state'] = JSON.stringify(state);
  }
  const mock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
  Object.defineProperty(window, 'localStorage', { value: mock, writable: true });
  return mock;
}
