import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { defaultWallpaper } from '@/data/wallpapers';
import { toast } from 'sonner';

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
  language: string;
  sidebarOpen: boolean;
  // Ephemeral: never written to localStorage (see persistable()).
  composerOpen: boolean;
  composerPrefill: { to?: string; subject?: string; body?: string } | null;
}

type Action =
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
  language: 'en',
  sidebarOpen: true,
  composerOpen: false,
  composerPrefill: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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

// The composer's open/prefill state is a draft in progress, not app data: a
// reload should never reopen a half-written email, so it is stripped on save.
function persistable(s: AppState) {
  return { ...s, composerOpen: false, composerPrefill: null };
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const timerRef = useRef<number>();
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveState = useCallback((s: AppState) => {
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem('taskly-state', JSON.stringify(persistable(s)));
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
        localStorage.setItem('taskly-state', JSON.stringify(persistable(stateRef.current)));
      } catch {}
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
