import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { useApp, generateId } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { format, addDays } from 'date-fns';
import { Search, Inbox, CalendarDays, Star, CalendarClock, Plus, Settings, Menu, MoreHorizontal, PanelLeftClose } from 'lucide-react';
import { WallpaperPicker } from './WallpaperPicker';
import { SettingsDialog } from './SettingsDialog';
import { EmojiPickerDialog } from './EmojiPickerDialog';
import { defaultListEmoji } from '@/data/emoji';
import { listActions } from './item-actions';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const smartLists = [
  { id: 'inbox', icon: Inbox, key: 'inbox', chip: 'bg-smart-inbox' },
  { id: 'today', icon: CalendarDays, key: 'today', chip: 'bg-smart-today' },
  { id: 'upcoming', icon: CalendarClock, key: 'upcoming', chip: 'bg-smart-upcoming' },
  { id: 'starred', icon: Star, key: 'starred', chip: 'bg-smart-starred' },
];

/* dot icon-button: round, hover tint, press tint + shrink */
const iconBtn =
  'flex items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]';

export function Sidebar() {
  const { state, dispatch } = useApp();
  const { language, activeListId, tasks, lists, searchQuery, sidebarOpen } = state;
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpenListId, setMenuOpenListId] = useState<string | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [emojiListId, setEmojiListId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingListId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingListId]);

  const getSmartCount = (id: string) => {
    const now = new Date();
    // Local-date strings — same rule as TaskList: never toISOString for calendar days.
    const todayStr = format(now, 'yyyy-MM-dd');
    const next7Str = format(addDays(now, 7), 'yyyy-MM-dd');

    const active = tasks.filter(t => !t.completed);
    switch (id) {
      case 'inbox': return active.filter(t => t.listId === 'inbox').length;
      case 'today': return active.filter(t => t.dueDate === todayStr).length;
      case 'upcoming': return active.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= next7Str).length;
      case 'starred': return active.filter(t => t.starred).length;
      default: return 0;
    }
  };

  const getListCount = (listId: string) => tasks.filter(t => !t.completed && t.listId === listId).length;

  const addList = useCallback(() => {
    const id = generateId();
    dispatch({ type: 'ADD_LIST', payload: { id, name: '', createdAt: new Date().toISOString() } });
    setEditingListId(id);
    setEditingName('');
  }, [dispatch]);

  const finishEditing = useCallback(() => {
    if (editingListId) {
      const name = editingName.trim();
      if (name) {
        dispatch({ type: 'UPDATE_LIST', payload: { id: editingListId, updates: { name } } });
      } else {
        dispatch({ type: 'DELETE_LIST', payload: editingListId });
      }
      setEditingListId(null);
    }
  }, [dispatch, editingListId, editingName]);

  const runListAction = useCallback((listId: string, listName: string, actionId: string) => {
    if (actionId === 'rename') {
      setEditingListId(listId);
      setEditingName(listName);
    }
    // choosing-a-value rule 1: the emoji action opens the grid, never a text box.
    if (actionId === 'emoji') setEmojiListId(listId);
    if (actionId === 'delete') setDeletingListId(listId);
  }, []);

  const setListEmoji = useCallback((emoji: string | undefined) => {
    if (emojiListId) {
      dispatch({ type: 'UPDATE_LIST', payload: { id: emojiListId, updates: { emoji } } });
    }
  }, [dispatch, emojiListId]);

  // One action list feeds both menu doors (item-component rule 2).
  const renderListActions = (
    list: { id: string; name: string },
    Item: typeof DropdownMenuItem | typeof ContextMenuItem,
    Separator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator,
  ) => {
    const actions = listActions();
    return actions.map((a, i) => (
      <Fragment key={a.id}>
        {i > 0 && actions[i - 1].band !== a.band && <Separator />}
        <Item
          onSelect={() => runListAction(list.id, list.name, a.id)}
          className={a.destructive ? '!text-destructive' : ''}
        >
          {t(language, a.labelKey)}
        </Item>
      </Fragment>
    ));
  };

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="fixed top-3 left-3 z-50 flex w-8 h-8 items-center justify-center rounded-full bg-white border-[0.5px] border-black/[0.12] shadow-[0_8px_20px_rgba(0,0,0,0.12)] md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        />
      )}

      <aside
        className={cn(
          "fixed md:absolute z-40 md:top-[10px] md:left-[10px] md:bottom-[10px] md:h-auto w-[200px] flex flex-col bg-white rounded-panel border-[0.5px] border-black/[0.12] shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-all duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-[calc(100%+10px)]"
        )}
      >
        {/* Header with collapse button */}
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className={cn(iconBtn, 'w-6 h-6')}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4 pt-2">
          <div className="relative" role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tint-40" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => dispatch({ type: 'SET_SEARCH', payload: e.target.value })}
              placeholder={t(language, 'searchTasks')}
              aria-label={t(language, 'searchTasks')}
              className="w-full h-10 pl-9 pr-3 rounded-row bg-transparent border-[0.5px] border-tint-12 type-body-md text-foreground placeholder:text-black/25 focus:outline-none"
            />
          </div>
        </div>

        {/* Smart Lists */}
        <nav className="px-3 flex-1 overflow-y-auto">
          <p className="px-3 mb-1 type-body-sm">
            {t(language, 'smartLists')}
          </p>
          {smartLists.map(item => {
            const active = activeListId === item.id && !searchQuery;
            const count = getSmartCount(item.id);
            return (
              <button
                key={item.id}
                onClick={() => { dispatch({ type: 'SET_ACTIVE_LIST', payload: item.id }); dispatch({ type: 'SET_SEARCH', payload: '' }); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-row type-body-md transition-colors",
                  active ? "bg-tint-4" : "hover:bg-tint-4"
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className={cn('flex w-6 h-6 flex-shrink-0 items-center justify-center rounded-full', item.chip)}>
                  <item.icon className="w-3.5 h-3.5 text-white" fill={item.id === 'starred' ? 'currentColor' : 'none'} />
                </span>
                <span className="flex-1 text-left text-foreground">{t(language, item.key)}</span>
                {count > 0 && (
                  <span className="type-body-sm">{count}</span>
                )}
              </button>
            );
          })}

          {/* Custom Lists */}
          <div className="h-[0.5px] mx-3 my-2 bg-tint-12" />
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="type-body-sm">
              {t(language, 'lists')}
            </p>
            <button
              onClick={addList}
              className={cn(iconBtn, 'w-6 h-6')}
              aria-label={t(language, 'newList')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* empty-state rule 2: the screen says it is empty. With no lists this
              section drew its header and its + and then nothing at all, which
              reads as broken rather than empty. Only the rows are replaced —
              the header and the + stay put, so this is the same section with
              zero items rather than a second mode (rule 1). */}
          {lists.length === 0 && (
            <p className="px-3 py-2 type-body-sm">{t(language, 'emptyLists')}</p>
          )}
          {lists.map(list => {
            const active = activeListId === list.id && !searchQuery;
            const count = getListCount(list.id);
            return (
              <div key={list.id} className="group relative">
                {editingListId === list.id ? (
                  <input
                    ref={inputRef}
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={e => { if (e.key === 'Enter') finishEditing(); if (e.key === 'Escape') { setEditingListId(null); if (!editingName.trim()) dispatch({ type: 'DELETE_LIST', payload: list.id }); } }}
                    placeholder={t(language, 'newList')}
                    className="w-full h-10 px-3 rounded-row bg-transparent border-[0.5px] border-tint-12 type-body-md text-foreground focus:outline-none"
                  />
                ) : (
                  <ContextMenu onOpenChange={open => setMenuOpenListId(open ? list.id : null)}>
                    <ContextMenuTrigger asChild>
                      <div
                        onClick={() => { dispatch({ type: 'SET_ACTIVE_LIST', payload: list.id }); dispatch({ type: 'SET_SEARCH', payload: '' }); }}
                        onDoubleClick={() => { setEditingListId(list.id); setEditingName(list.name); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') { dispatch({ type: 'SET_ACTIVE_LIST', payload: list.id }); dispatch({ type: 'SET_SEARCH', payload: '' }); } }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-row type-body-md transition-colors cursor-pointer",
                          active || menuOpenListId === list.id ? "bg-tint-4" : "hover:bg-tint-4"
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="flex-shrink-0">{list.emoji || defaultListEmoji}</span>
                        <span className="flex-1 text-left truncate text-foreground">{list.name || t(language, 'newList')}</span>
                        {count > 0 && (
                          <span className="type-body-sm">{count}</span>
                        )}
                        <DropdownMenu onOpenChange={open => setMenuOpenListId(open ? list.id : null)}>
                          <DropdownMenuTrigger asChild>
                            {/* item-component rule 3: the ⋯ button is the door a phone
                                has, because a phone has no right-click. `hidden` took it
                                out of the layout entirely, so with no hover there was no
                                button to tap at all — a list could not be deleted on a
                                touchscreen. It now always occupies its slot: quiet on a
                                pointer (opacity-0 until hover, focus or the menu opening)
                                and fully visible where hover does not exist. */}
                            <button
                              onClick={e => e.stopPropagation()}
                              className={cn(iconBtn, 'flex w-6 h-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100 data-[state=open]:bg-tint-12 text-tint-40')}
                              aria-label={t(language, 'listActions')}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            {renderListActions(list, DropdownMenuItem, DropdownMenuSeparator)}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      {renderListActions(list, ContextMenuItem, ContextMenuSeparator)}
                    </ContextMenuContent>
                  </ContextMenu>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t-[0.5px] border-tint-12 flex items-center gap-1">
          <WallpaperPicker />
          <button
            onClick={() => setShowSettings(true)}
            className={cn(iconBtn, 'w-8 h-8')}
            aria-label={t(language, 'settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

      <EmojiPickerDialog
        open={!!emojiListId}
        onOpenChange={open => { if (!open) setEmojiListId(null); }}
        value={lists.find(l => l.id === emojiListId)?.emoji}
        onSelect={setListEmoji}
      />

      <AlertDialog open={!!deletingListId} onOpenChange={open => { if (!open) setDeletingListId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(language, 'delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t(language, 'deleteListConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(language, 'cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingListId) dispatch({ type: 'DELETE_LIST', payload: deletingListId }); setDeletingListId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t(language, 'delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
