import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { defaultWallpaper } from '@/data/wallpapers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cloudTasks } from '@/lib/cloud-tasks';
import { TaskSync, type Plan, type SyncStatus } from '@/lib/task-sync';
import { rememberGuestPlan, readGuestTransfer, clearGuestTransfer } from '@/lib/guest-transfer';

export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  starred: boolean;
  completed: boolean;
  completedAt?: string;
  listId: string;
  notes?: string;
  links?: string[];
  images?: string[];
  createdAt: string;
}

export interface TaskList {
  id: string;
  name: string;
  emoji?: string;
  createdAt: string;
}

export interface AppState {
  lists: TaskList[];
  tasks: Task[];
  activeListId: string;
  activeTaskId: string | null;
  searchQuery: string;
  dateFilter: string | null;
  wallpaper: string;
  customWallpapers: string[];
  language: string;
  sidebarOpen: boolean;
  // Ephemeral: never written to localStorage (see persistable()).
  composerOpen: boolean;
  composerPrefill: { to?: string; subject?: string; body?: string } | null;
}

type Action =
  | { type: 'REPLACE_PLAN'; payload: Plan }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_COMPLETE'; payload: string }
  | { type: 'TOGGLE_STAR'; payload: string }
  | { type: 'REORDER_TASKS'; payload: { activeId: string; overId: string } }
  | { type: 'ADD_LIST'; payload: TaskList }
  | { type: 'UPDATE_LIST'; payload: { id: string; updates: Partial<TaskList> } }
  | { type: 'DELETE_LIST'; payload: string }
  | { type: 'SET_ACTIVE_LIST'; payload: string }
  | { type: 'SET_ACTIVE_TASK'; payload: string | null }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_DATE_FILTER'; payload: string | null }
  | { type: 'SET_WALLPAPER'; payload: string }
  | { type: 'ADD_DEVICE_WALLPAPER'; payload: string }
  | { type: 'SET_LANGUAGE'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'OPEN_COMPOSER'; payload?: { to?: string; subject?: string; body?: string } }
  | { type: 'CLOSE_COMPOSER' };

const now = new Date().toISOString();

const defaultState: AppState = {
  lists: [],
  tasks: [
    { id: '1', title: 'Welcome to Taskly! Click me for details', starred: false, completed: false, listId: 'inbox', notes: 'This is your new task manager! You can add notes, links, images, and more to any task. Try clicking on different fields to edit them.\n\nEnjoy organizing your life! ✨', createdAt: now },
    { id: '2', title: 'Try starring this task ⭐', starred: true, completed: false, listId: 'inbox', createdAt: now },
    { id: '3', title: 'Set a due date on this task', starred: false, completed: false, listId: 'inbox', createdAt: now },
  ],
  activeListId: 'inbox',
  activeTaskId: null,
  searchQuery: '',
  dateFilter: null,
  wallpaper: defaultWallpaper,
  customWallpapers: [],
  language: 'en',
  sidebarOpen: true,
  composerOpen: false,
  composerPrefill: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'REPLACE_PLAN':
      return { ...state, ...action.payload, activeTaskId: null,
        activeListId: ['inbox', 'today', 'upcoming', 'starred', ...action.payload.lists.map(l => l.id)].includes(state.activeListId) ? state.activeListId : 'inbox' };
    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? { ...t, ...action.payload.updates } : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload), activeTaskId: state.activeTaskId === action.payload ? null : state.activeTaskId };
    case 'TOGGLE_COMPLETE': {
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t) };
    }
    case 'TOGGLE_STAR':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload ? { ...t, starred: !t.starred } : t) };
    case 'REORDER_TASKS': {
      const { activeId, overId } = action.payload;
      const oldIndex = state.tasks.findIndex(t => t.id === activeId);
      const newIndex = state.tasks.findIndex(t => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      const newTasks = [...state.tasks];
      const [moved] = newTasks.splice(oldIndex, 1);
      newTasks.splice(newIndex, 0, moved);
      return { ...state, tasks: newTasks };
    }
    case 'ADD_LIST':
      return { ...state, lists: [...state.lists, action.payload] };
    case 'UPDATE_LIST':
      return { ...state, lists: state.lists.map(l => l.id === action.payload.id ? { ...l, ...action.payload.updates } : l) };
    case 'DELETE_LIST':
      return {
        ...state,
        lists: state.lists.filter(l => l.id !== action.payload),
        tasks: state.tasks.map(t => t.listId === action.payload ? { ...t, listId: 'inbox' } : t),
        activeListId: state.activeListId === action.payload ? 'inbox' : state.activeListId,
      };
    case 'SET_ACTIVE_LIST':
      return { ...state, activeListId: action.payload, dateFilter: null };
    case 'SET_ACTIVE_TASK':
      return { ...state, activeTaskId: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_DATE_FILTER':
      return { ...state, dateFilter: state.dateFilter === action.payload ? null : action.payload };
    case 'SET_WALLPAPER':
      return { ...state, wallpaper: action.payload };
    case 'ADD_DEVICE_WALLPAPER':
      return { ...state, wallpaper: action.payload, customWallpapers: [...new Set([action.payload, ...state.customWallpapers])] };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'OPEN_COMPOSER':
      return { ...state, composerOpen: true, composerPrefill: action.payload ?? null };
    case 'CLOSE_COMPOSER':
      return { ...state, composerOpen: false, composerPrefill: null };
    default:
      return state;
  }
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem('taskly-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultState, ...parsed };
    }
  } catch {}
  return defaultState;
}

// Guest edits are never saved (sampleRef is written instead), so a reload
// restores the sample tasks. The composer's open/prefill state is a draft in progress, not app data: a
// reload should never reopen a half-written email, so it is stripped on save.
export function persistable(s: AppState) {
  return { ...s, composerOpen: false, composerPrefill: null };
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  syncStatus: SyncStatus;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, loadState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const timerRef = useRef<number>();
  const stateRef = useRef(state);
  stateRef.current = state;
  const sampleRef = useRef<Plan>({ tasks: defaultState.tasks, lists: defaultState.lists });
  const guestRef = useRef<Plan>(sampleRef.current);
  const syncRef = useRef<TaskSync>();
  if (!syncRef.current) {
    syncRef.current = new TaskSync(cloudTasks, localStorage, plan => {
      stateRef.current = reducer(stateRef.current, { type: 'REPLACE_PLAN', payload: plan });
      rawDispatch({ type: 'REPLACE_PLAN', payload: plan });
    }, setSyncStatus);
  }
  const dispatch = useCallback((action: Action) => {
    const previous = stateRef.current;
    const next = reducer(previous, action);
    stateRef.current = next;
    rawDispatch(action);
    if (next.tasks !== previous.tasks || next.lists !== previous.lists) {
      const plan = { tasks: next.tasks, lists: next.lists };
      if (syncRef.current?.owner) {
        try { syncRef.current.update(plan); } catch { setSyncStatus('error'); toast.error('Device storage is full. Your latest changes have not been saved.'); }
      } else { guestRef.current = plan; rememberGuestPlan(plan); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    let authEventSeen = false;
    const applySession = (userId: string | null, email?: string) => {
      if (!active || syncRef.current?.owner === userId) return;
      try {
        // Only an explicitly selected signup draft can enter an account.
        const transfer = userId ? readGuestTransfer(localStorage, email, new URLSearchParams(window.location.search).get('guestImport')) : null;
        guestRef.current = sampleRef.current;
        syncRef.current?.switchAccount(userId, transfer ?? (userId ? { tasks: [], lists: [] } : guestRef.current));
        if (userId) {
          // switchAccount persisted the imported plan in its account-owned retry cache.
          if (transfer) clearGuestTransfer(localStorage);
          rememberGuestPlan(null);
          localStorage.setItem('taskly-state', JSON.stringify(persistable({ ...stateRef.current, ...sampleRef.current })));
        } else rememberGuestPlan(guestRef.current);
      } catch { setSyncStatus('error'); }
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      // Defer database calls until the auth callback has released its lock.
      queueMicrotask(() => applySession(session?.user.id ?? null, session?.user.email));
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authEventSeen) applySession(session?.user.id ?? null, session?.user.email);
    }).catch(() => setSyncStatus('error'));
    const refresh = () => { void syncRef.current?.sync(); };
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      data.subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    if (!syncRef.current?.owner) rememberGuestPlan(guestRef.current);
  }, []);

  const saveState = useCallback((s: AppState) => {
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem('taskly-state', JSON.stringify(persistable({ ...s, ...sampleRef.current })));
      } catch {
        toast.error('Storage is full. Please delete some completed tasks.');
      }
    }, 300);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state, saveState]);

  // The debounced save loses the last 300ms of changes if the page unloads;
  // flush synchronously on pagehide so a reload right after a mutation keeps it.
  useEffect(() => {
    const flush = () => {
      clearTimeout(timerRef.current);
      try {
        localStorage.setItem('taskly-state', JSON.stringify(persistable({ ...stateRef.current, ...sampleRef.current })));
      } catch {}
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, syncStatus }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
