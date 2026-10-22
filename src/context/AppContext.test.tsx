import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider, useApp, generateId } from './AppContext';
import React from 'react';
import { mockLocalStorage } from '@/test/helpers';

// Test component that exposes state and dispatch
function TestConsumer({ onRender }: { onRender: (ctx: ReturnType<typeof useApp>) => void }) {
  const ctx = useApp();
  onRender(ctx);
  return <div data-testid="state">{JSON.stringify(ctx.state)}</div>;
}

function DispatchButton({ action, label }: { action: any; label: string }) {
  const { dispatch } = useApp();
  return <button onClick={() => dispatch(action)}>{label}</button>;
}

describe('AppContext', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it('provides default state', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
      </AppProvider>
    );
    expect(capturedState.activeListId).toBe('inbox');
    expect(capturedState.tasks).toHaveLength(3); // default sample tasks
    expect(capturedState.language).toBe('en');
  });

  it('loads state from localStorage', () => {
    mockLocalStorage({ language: 'es' });
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
      </AppProvider>
    );
    expect(capturedState.language).toBe('es');
  });

  it('ADD_TASK adds a task to the front', () => {
    let capturedState: any;
    const task = { id: 'new1', title: 'New', starred: false, completed: false, listId: 'inbox', createdAt: new Date().toISOString() };
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'ADD_TASK', payload: task }} label="add" />
      </AppProvider>
    );
    act(() => { screen.getByText('add').click(); });
    expect(capturedState.tasks[0].id).toBe('new1');
  });

  it('TOGGLE_COMPLETE toggles completed and sets completedAt', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'TOGGLE_COMPLETE', payload: '1' }} label="toggle" />
      </AppProvider>
    );
    expect(capturedState.tasks.find((t: any) => t.id === '1').completed).toBe(false);
    act(() => { screen.getByText('toggle').click(); });
    const t = capturedState.tasks.find((t: any) => t.id === '1');
    expect(t.completed).toBe(true);
    expect(t.completedAt).toBeDefined();
  });

  it('TOGGLE_COMPLETE uncompleting removes completedAt', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'TOGGLE_COMPLETE', payload: '1' }} label="toggle" />
      </AppProvider>
    );
    act(() => { screen.getByText('toggle').click(); }); // complete
    act(() => { screen.getByText('toggle').click(); }); // uncomplete
    expect(capturedState.tasks.find((t: any) => t.id === '1').completedAt).toBeUndefined();
  });

  it('TOGGLE_STAR toggles starred', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'TOGGLE_STAR', payload: '1' }} label="star" />
      </AppProvider>
    );
    act(() => { screen.getByText('star').click(); });
    expect(capturedState.tasks.find((t: any) => t.id === '1').starred).toBe(true);
  });

  it('DELETE_TASK removes a task and clears activeTaskId if matching', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'SET_ACTIVE_TASK', payload: '1' }} label="select" />
        <DispatchButton action={{ type: 'DELETE_TASK', payload: '1' }} label="delete" />
      </AppProvider>
    );
    act(() => { screen.getByText('select').click(); });
    expect(capturedState.activeTaskId).toBe('1');
    act(() => { screen.getByText('delete').click(); });
    expect(capturedState.tasks.find((t: any) => t.id === '1')).toBeUndefined();
    expect(capturedState.activeTaskId).toBeNull();
  });

  it('UPDATE_TASK updates specific fields', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'UPDATE_TASK', payload: { id: '1', updates: { title: 'Updated', notes: 'hello' } } }} label="update" />
      </AppProvider>
    );
    act(() => { screen.getByText('update').click(); });
    const t = capturedState.tasks.find((t: any) => t.id === '1');
    expect(t.title).toBe('Updated');
    expect(t.notes).toBe('hello');
  });

  it('ADD_LIST and DELETE_LIST manage lists', () => {
    let capturedState: any;
    const list = { id: 'list1', name: 'Work', createdAt: new Date().toISOString() };
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'ADD_LIST', payload: list }} label="addList" />
        <DispatchButton action={{ type: 'DELETE_LIST', payload: 'list1' }} label="deleteList" />
      </AppProvider>
    );
    act(() => { screen.getByText('addList').click(); });
    expect(capturedState.lists).toHaveLength(1);
    act(() => { screen.getByText('deleteList').click(); });
    expect(capturedState.lists).toHaveLength(0);
  });

  it('DELETE_LIST moves tasks to inbox', () => {
    let capturedState: any;
    const list = { id: 'list1', name: 'Work', createdAt: new Date().toISOString() };
    const task = { id: 'tl1', title: 'Work task', starred: false, completed: false, listId: 'list1', createdAt: new Date().toISOString() };
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'ADD_LIST', payload: list }} label="addList" />
        <DispatchButton action={{ type: 'ADD_TASK', payload: task }} label="addTask" />
        <DispatchButton action={{ type: 'DELETE_LIST', payload: 'list1' }} label="deleteList" />
      </AppProvider>
    );
    act(() => { screen.getByText('addList').click(); });
    act(() => { screen.getByText('addTask').click(); });
    act(() => { screen.getByText('deleteList').click(); });
    expect(capturedState.tasks.find((t: any) => t.id === 'tl1').listId).toBe('inbox');
  });

  it('SET_ACTIVE_LIST changes list and clears dateFilter', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'SET_DATE_FILTER', payload: 'today' }} label="filter" />
        <DispatchButton action={{ type: 'SET_ACTIVE_LIST', payload: 'starred' }} label="setList" />
      </AppProvider>
    );
    act(() => { screen.getByText('filter').click(); });
    expect(capturedState.dateFilter).toBe('today');
    act(() => { screen.getByText('setList').click(); });
    expect(capturedState.activeListId).toBe('starred');
    expect(capturedState.dateFilter).toBeNull();
  });

  it('SET_DATE_FILTER toggles off when same value', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'SET_DATE_FILTER', payload: 'today' }} label="filter" />
      </AppProvider>
    );
    act(() => { screen.getByText('filter').click(); });
    expect(capturedState.dateFilter).toBe('today');
    act(() => { screen.getByText('filter').click(); });
    expect(capturedState.dateFilter).toBeNull();
  });

  it('SET_LANGUAGE updates language', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'SET_LANGUAGE', payload: 'fr' }} label="lang" />
      </AppProvider>
    );
    act(() => { screen.getByText('lang').click(); });
    expect(capturedState.language).toBe('fr');
  });

  it('TOGGLE_SIDEBAR toggles sidebarOpen', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'TOGGLE_SIDEBAR' }} label="sidebar" />
      </AppProvider>
    );
    expect(capturedState.sidebarOpen).toBe(true);
    act(() => { screen.getByText('sidebar').click(); });
    expect(capturedState.sidebarOpen).toBe(false);
  });

  it('SET_WALLPAPER changes wallpaper', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'SET_WALLPAPER', payload: 'https://example.com/img.jpg' }} label="wp" />
      </AppProvider>
    );
    act(() => { screen.getByText('wp').click(); });
    expect(capturedState.wallpaper).toBe('https://example.com/img.jpg');
  });

  it('UPDATE_LIST updates list fields', () => {
    let capturedState: any;
    const list = { id: 'l1', name: 'Old', createdAt: new Date().toISOString() };
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'ADD_LIST', payload: list }} label="add" />
        <DispatchButton action={{ type: 'UPDATE_LIST', payload: { id: 'l1', updates: { name: 'New', emoji: '🚀' } } }} label="update" />
      </AppProvider>
    );
    act(() => { screen.getByText('add').click(); });
    act(() => { screen.getByText('update').click(); });
    expect(capturedState.lists[0].name).toBe('New');
    expect(capturedState.lists[0].emoji).toBe('🚀');
  });

  it('OPEN_COMPOSER opens the composer with a prefill; CLOSE resets both', () => {
    let capturedState: any;
    render(
      <AppProvider>
        <TestConsumer onRender={ctx => { capturedState = ctx.state; }} />
        <DispatchButton action={{ type: 'OPEN_COMPOSER', payload: { subject: 'Hi' } }} label="open" />
        <DispatchButton action={{ type: 'CLOSE_COMPOSER' }} label="close" />
      </AppProvider>
    );
    expect(capturedState.composerOpen).toBe(false);
    expect(capturedState.composerPrefill).toBeNull();
    act(() => { screen.getByText('open').click(); });
    expect(capturedState.composerOpen).toBe(true);
    expect(capturedState.composerPrefill).toEqual({ subject: 'Hi' });
    act(() => { screen.getByText('close').click(); });
    expect(capturedState.composerOpen).toBe(false);
    expect(capturedState.composerPrefill).toBeNull();
  });

  it('composer state is never written to localStorage', () => {
    const mock = mockLocalStorage();
    vi.useFakeTimers();
    try {
      render(
        <AppProvider>
          <TestConsumer onRender={() => {}} />
          <DispatchButton action={{ type: 'OPEN_COMPOSER', payload: { subject: 'Hi' } }} label="open" />
        </AppProvider>
      );
      act(() => { screen.getByText('open').click(); });
      act(() => { vi.advanceTimersByTime(400); });
      const saved = JSON.parse(mock.setItem.mock.calls[0][1]);
      expect(saved.composerOpen).toBe(false);
      expect(saved.composerPrefill).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('useApp throws outside provider', () => {
    const Comp = () => { useApp(); return null; };
    expect(() => render(<Comp />)).toThrow('useApp must be used within AppProvider');
  });
});

describe('generateId', () => {
  it('returns unique strings', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });
});
