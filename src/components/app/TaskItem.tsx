import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { Star, Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { taskActions } from './item-actions';
import { defaultListEmoji } from '@/data/emoji';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface TaskItemProps {
  taskId: string;
}

export function TaskItem({ taskId }: TaskItemProps) {
  const { state, dispatch } = useApp();
  const { language, lists, activeTaskId } = state;
  const task = state.tasks.find(t => t.id === taskId);
  const [animating, setAnimating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // One piece of state per chooser the ⋯ menu opens (item-component rule 6).
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [pickingDate, setPickingDate] = useState(false);
  const [movingList, setMovingList] = useState(false);
  // The complete animation's timer, held so unmounting mid-animation cannot
  // dispatch into a dead component.
  const completeTimerRef = useRef<number>();

  useEffect(() => () => clearTimeout(completeTimerRef.current), []);

  const toggleComplete = useCallback(() => {
    if (!task) return;
    if (task.completed) {
      dispatch({ type: 'TOGGLE_COMPLETE', payload: task.id });
      return;
    }
    setAnimating(true);
    clearTimeout(completeTimerRef.current);
    completeTimerRef.current = window.setTimeout(() => {
      dispatch({ type: 'TOGGLE_COMPLETE', payload: task.id });
      setAnimating(false);
    }, 500);
  }, [dispatch, task]);

  const handleComplete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleComplete();
  }, [toggleComplete]);

  const handleClick = useCallback(() => {
    if (task) dispatch({ type: 'SET_ACTIVE_TASK', payload: task.id });
  }, [dispatch, task]);

  const runAction = useCallback((id: string) => {
    if (!task) return;
    if (id === 'open') dispatch({ type: 'SET_ACTIVE_TASK', payload: task.id });
    if (id === 'complete') toggleComplete();
    if (id === 'star') dispatch({ type: 'TOGGLE_STAR', payload: task.id });
    // The three actions UPDATE_TASK already supports but the menu did not offer.
    // Each opens its own chooser, so one action list still serves both menu
    // doors (rule 2) — no submenu that only the dropdown could render.
    if (id === 'rename') { setRenameValue(task.title); setRenaming(true); }
    if (id === 'dueDate') setPickingDate(true);
    if (id === 'move') setMovingList(true);
    if (id === 'delete') setConfirmingDelete(true);
  }, [dispatch, task, toggleComplete]);

  const commitRename = useCallback(() => {
    if (!task) return;
    const title = renameValue.trim();
    // choosing-a-value rule 4: an empty title is not a member of the domain, so
    // it is rejected rather than stored — the old title stands.
    if (title) dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, updates: { title } } });
    setRenaming(false);
  }, [dispatch, renameValue, task]);

  const setDueDate = useCallback((date: Date | undefined) => {
    if (!task) return;
    dispatch({
      type: 'UPDATE_TASK',
      payload: { id: task.id, updates: { dueDate: date ? format(date, 'yyyy-MM-dd') : undefined } },
    });
    setPickingDate(false);
  }, [dispatch, task]);

  const moveToList = useCallback((listId: string) => {
    if (!task) return;
    dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, updates: { listId } } });
    setMovingList(false);
  }, [dispatch, task]);

  if (!task) return null;

  const isSelected = activeTaskId === task.id;

  // One action list feeds both menu doors (item-component rule 2).
  const actions = taskActions(task);
  const renderActions = (
    Item: typeof DropdownMenuItem | typeof ContextMenuItem,
    Separator: typeof DropdownMenuSeparator | typeof ContextMenuSeparator,
  ) =>
    actions.map((a, i) => (
      <Fragment key={a.id}>
        {i > 0 && actions[i - 1].band !== a.band && <Separator />}
        <Item
          onSelect={() => runAction(a.id)}
          className={a.destructive ? '!text-destructive' : ''}
        >
          {t(language, a.labelKey)}
        </Item>
      </Fragment>
    ));

  const listName = lists.find(l => l.id === task.listId)?.name;
  const dueDateStr = task.dueDate ? format(parseISO(task.dueDate), 'MMM d') : null;
  const meta = [dueDateStr, listName].filter(Boolean).join(' · ');

  return (
    <>
      <ContextMenu onOpenChange={setMenuOpen}>
        <ContextMenuTrigger asChild>
          <div
            onClick={handleClick}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2 cursor-pointer transition-colors group rounded-bubble',
              // item-component rule 1: while an item's menu is open, that item
              // looks different — and the completed rows render through this
              // same component. Testing `completed` first made `menuOpen`
              // unreachable for a done task, so its mark could never draw and
              // Delete on a row of completed tasks was a guess. The mark is
              // checked first now, and it is a background change set the same
              // way the row already sets its background, so no box-shadow of
              // ours can silently swallow it.
              isSelected || menuOpen
                ? 'bg-[#E6E1E2]'
                : task.completed
                  ? 'bg-white/40'
                  : 'bg-white hover:bg-[#F7F5F5]',
              animating && 'task-fade-completed'
            )}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') handleClick(); }}
          >
            {task.completed ? (
              <button
                onClick={handleComplete}
                className="flex-shrink-0 w-5 h-5 rounded-full bg-foreground/60 flex items-center justify-center transition-all task-complete-check"
                role="checkbox"
                aria-checked={true}
                aria-label="Mark incomplete"
              >
                <Check className="w-3 h-3 text-white/80" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all',
                  animating
                    ? 'bg-foreground border-foreground task-complete-check'
                    : 'border-tint-12 hover:border-tint-40'
                )}
                role="checkbox"
                aria-checked={false}
                aria-label="Mark complete"
              >
                {animating && <Check className="w-3 h-3 text-white" />}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className={cn('type-body-md truncate', task.completed ? 'line-through text-tint-40' : 'text-foreground')}>
                {task.title}
              </p>
              {!task.completed && meta && <p className="type-body-sm truncate mt-0.5">{meta}</p>}
            </div>
            <button
              onClick={e => { e.stopPropagation(); dispatch({ type: 'TOGGLE_STAR', payload: task.id }); }}
              className="flex-shrink-0 flex w-6 h-6 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85] data-[starred=true]:opacity-100"
              data-starred={task.starred}
              aria-label={task.starred ? t(language, 'unstarTask') : t(language, 'starTask')}
            >
              <Star className={cn('w-4 h-4 transition-colors', task.starred ? 'fill-star text-star' : 'text-tint-40')} />
            </button>
            <DropdownMenu onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                {/* item-component rule 3: this was in the layout and clickable but
                    invisible without hover, so on a touchscreen you had to find it
                    by luck. Keyboard focus and a hover-less device now reveal it. */}
                <button
                  onClick={e => e.stopPropagation()}
                  className="flex-shrink-0 flex w-6 h-6 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100 data-[state=open]:bg-tint-12 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85] text-tint-40"
                  aria-label={t(language, 'taskActions')}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                {renderActions(DropdownMenuItem, DropdownMenuSeparator)}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {renderActions(ContextMenuItem, ContextMenuSeparator)}
        </ContextMenuContent>
      </ContextMenu>

      {/* Rename — free text, so a text input is the right control
          (choosing-a-value rule 1: only enumerable domains need a chooser). */}
      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t(language, 'rename')}</DialogTitle>
          </DialogHeader>
          <input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); }}
            placeholder={t(language, 'addTask')}
            aria-label={t(language, 'rename')}
            autoFocus
            className="w-full h-10 px-3 rounded-row bg-transparent border-[0.5px] border-tint-12 type-body-md text-foreground placeholder:text-black/25 focus:outline-none"
          />
          <button
            onClick={commitRename}
            className="w-full rounded-row px-3 py-2 type-body-md bg-tint-4 text-foreground transition-colors hover:bg-tint-12"
          >
            {t(language, 'save')}
          </button>
        </DialogContent>
      </Dialog>

      {/* Due date — a date is an enumerable domain, so the control is a calendar
          you can see, not a box you type yyyy-MM-dd into (choosing-a-value rule 1). */}
      <Dialog open={pickingDate} onOpenChange={setPickingDate}>
        <DialogContent className="max-w-fit rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t(language, 'dueDate')}</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={task.dueDate ? parseISO(task.dueDate) : undefined}
            onSelect={setDueDate}
            className="p-3 pointer-events-auto"
          />
          <button
            onClick={() => setDueDate(undefined)}
            className="w-full rounded-row px-3 py-2 type-body-md text-tint-56 transition-colors hover:bg-tint-4"
          >
            {t(language, 'noDate')}
          </button>
        </DialogContent>
      </Dialog>

      {/* Move to list — the set of lists is the domain, so it is shown in full
          (choosing-a-value rule 1). Inbox is where DELETE_LIST sends orphans, so
          it is always a member. */}
      <Dialog open={movingList} onOpenChange={setMovingList}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t(language, 'moveToList')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1" role="group" aria-label={t(language, 'moveToList')}>
            {[{ id: 'inbox', name: t(language, 'inbox'), emoji: '📥' }, ...lists].map(l => (
              <button
                key={l.id}
                onClick={() => moveToList(l.id)}
                aria-pressed={task.listId === l.id}
                className={cn(
                  'w-full flex items-center gap-2 rounded-row px-3 py-2 type-body-md text-left text-foreground transition-colors hover:bg-tint-4',
                  task.listId === l.id && 'bg-tint-4'
                )}
              >
                <span className="flex-shrink-0">{l.emoji || defaultListEmoji}</span>
                <span className="flex-1 truncate">{l.name || t(language, 'newList')}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(language, 'delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t(language, 'deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(language, 'cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}
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
