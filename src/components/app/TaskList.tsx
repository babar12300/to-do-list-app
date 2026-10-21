import { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { SortableTaskItem } from './SortableTaskItem';
import { TaskItem } from './TaskItem';
import { QuickAddTask } from './QuickAddTask';
import { FilterPills } from './FilterPills';
import { dateFilters } from '@/data/date-filters';
import { ChevronDown, ChevronRight, Inbox, CalendarDays, CalendarClock, Star, Menu } from 'lucide-react';
import { isToday, isTomorrow, addDays, parseISO, isAfter, isBefore, startOfDay, format } from 'date-fns';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import type { Task } from '@/context/AppContext';

// One bucket definition shared by the group headers AND the date-filter pills,
// so the two can never disagree. Bucket ids match the ids in data/date-filters.
export function dateBucket(task: Task): 'today' | 'tomorrow' | 'next7' | 'later' | 'nodate' {
  if (!task.dueDate) return 'nodate';
  const d = parseISO(task.dueDate);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  if (isAfter(d, tomorrow) && isBefore(d, weekEnd)) return 'next7';
  return 'later';
}

const bucketLabelKeys = { today: 'today', tomorrow: 'tomorrow', next7: 'thisWeek', later: 'later', nodate: 'noDate' } as const;
const bucketOrder = ['today', 'tomorrow', 'next7', 'later', 'nodate'] as const;

function groupTasksByDate(tasks: Task[], language: string) {
  const groups: Record<string, Task[]> = {};
  bucketOrder.forEach(b => groups[t(language, bucketLabelKeys[b])] = []);
  tasks.forEach(task => {
    groups[t(language, bucketLabelKeys[dateBucket(task)])].push(task);
  });
  return Object.entries(groups).filter(([, tasks]) => tasks.length > 0);
}

const smartListIcons: Record<string, typeof Inbox> = {
  inbox: Inbox, today: CalendarDays, upcoming: CalendarClock, starred: Star,
};

const smartListChips: Record<string, string> = {
  inbox: 'bg-smart-inbox', today: 'bg-smart-today', upcoming: 'bg-smart-upcoming', starred: 'bg-smart-starred',
};

const emptyMessages: Record<string, string> = {
  inbox: 'emptyInbox', today: 'emptyToday', upcoming: 'emptyUpcoming', starred: 'emptyStarred',
};

/* Text sitting directly on the wallpaper: white with a soft dark shadow so it
   reads on bright and dark photos alike. */
const onWallpaper = '!text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(0,0,0,0.3)]';

export function TaskList() {
  const { state, dispatch } = useApp();
  const { language, activeListId, tasks, lists, searchQuery, dateFilter, sidebarOpen } = state;
  const [showCompleted, setShowCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      dispatch({ type: 'REORDER_TASKS', payload: { activeId: String(active.id), overId: String(over.id) } });
    }
  }, [dispatch]);

  const listTitle = useMemo(() => {
    if (searchQuery) return `"${searchQuery}"`;
    if (['inbox', 'today', 'upcoming', 'starred'].includes(activeListId)) return t(language, activeListId);
    return lists.find(l => l.id === activeListId)?.name || t(language, 'inbox');
  }, [activeListId, language, lists, searchQuery]);

  // What this view holds BEFORE the date-filter pills narrow it. Kept separate
  // so the empty state can tell "there is nothing here" apart from "a filter is
  // hiding what is here" (empty-state rule 10).
  const tasksInScope = useMemo(() => {
    // Local-date strings: toISOString() is UTC and lands on the wrong calendar
    // day for any timezone east of UTC (dueDate is stored as a LOCAL yyyy-MM-dd).
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const next7Str = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return tasks.filter(t => t.title.toLowerCase().includes(q));
    }

    switch (activeListId) {
      case 'inbox':
        return tasks.filter(t => t.listId === 'inbox');
      case 'today':
        return tasks.filter(t => t.dueDate === todayStr);
      case 'upcoming':
        return tasks.filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= next7Str);
      case 'starred':
        return tasks.filter(t => t.starred);
      default:
        return tasks.filter(t => t.listId === activeListId);
    }
  }, [tasks, activeListId, searchQuery]);

  // The pills are hidden while searching, so the date filter never narrows a
  // search result — same as before this split.
  const filteredTasks = useMemo(() => {
    if (searchQuery || !dateFilter) return tasksInScope;
    return tasksInScope.filter(t => dateBucket(t) === dateFilter);
  }, [tasksInScope, searchQuery, dateFilter]);

  const activeTasks = filteredTasks.filter(t => !t.completed);
  const completedTasks = filteredTasks.filter(t => t.completed);
  const groups = groupTasksByDate(activeTasks, language);

  // A filter miss only exists when the filter is what emptied the view. With
  // nothing in scope either way this is a genuine no-data state, and rule 10 is
  // explicit that such an account must never be told a filter is hiding things.
  const isFilterMiss = !searchQuery && !!dateFilter && filteredTasks.length === 0 && tasksInScope.length > 0;
  const filterLabel = t(language, dateFilters.find(f => f.id === dateFilter)?.key ?? '');

  const clearFilter = useCallback(() => {
    if (dateFilter) dispatch({ type: 'SET_DATE_FILTER', payload: dateFilter });
  }, [dateFilter, dispatch]);

  const IconComp = smartListIcons[activeListId];

  return (
    <div>
      {/* Header; pl-10 clears the fixed mobile menu button */}
      <div className="flex items-center gap-3 mb-4 pl-10 md:pl-0">
        {!sidebarOpen && (
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-full bg-white/[0.75] backdrop-blur-[16px] border-[0.5px] border-black/[0.12] text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-white/80 active:scale-[0.85]"
            aria-label="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 flex-1">
          {IconComp && (
            <span className={`flex w-7 h-7 items-center justify-center rounded-full ${smartListChips[activeListId]}`}>
              <IconComp className="w-4 h-4 text-white" fill={activeListId === 'starred' ? 'currentColor' : 'none'} />
            </span>
          )}
          <h1 className={`type-heading-md ${onWallpaper}`}>{listTitle}</h1>
        </div>
      </div>

      {/* Quick add */}
      {!searchQuery && <QuickAddTask />}

      {/* Date filter pills */}
      {!searchQuery && <FilterPills />}

      {/* Task groups */}
      <div className="mt-4">
        {/* Empty state per house rule: same screen, plain sentence in the row
            area, nothing floating. The quick-add above stays as the create door.

            Three different things can empty this area and rule 10 says they must
            not be told as one story. A search miss and a filter miss both mean
            the data exists and something is hiding it, so they name what — and
            the filter miss carries the way back, because a pill you have to
            realise is a toggle is not a clear affordance. Only the third branch
            may say the collection is empty. Before this, filtering an Inbox to
            "Later" claimed "Inbox zero!" over tasks that were sitting right
            there. */}
        {activeTasks.length === 0 && completedTasks.length === 0 && (
          <div className="animate-fade-in">
            <p className={`px-3 py-4 type-body-md ${onWallpaper}`}>
              {searchQuery
                ? `${t(language, 'emptySearch')} "${searchQuery}"`
                : isFilterMiss
                  ? `${t(language, 'emptyFilter')} "${filterLabel}"`
                  : t(language, emptyMessages[activeListId] || 'emptyList')}
            </p>
            {isFilterMiss && (
              <button
                onClick={clearFilter}
                className={`mx-3 rounded-full bg-white/[0.65] backdrop-blur-[8px] px-3 py-1 type-body-sm !text-foreground transition-colors hover:bg-white/80`}
              >
                {t(language, 'clearFilter')}
              </button>
            )}
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {groups.map(([groupName, groupTasks]) => (
            <div key={groupName} className="animate-fade-in-up">
              <p className={`type-body-sm mt-6 mb-2 px-3 ${onWallpaper}`}>
                {groupName}
              </p>
              <SortableContext items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {groupTasks.map(task => (
                    <SortableTaskItem key={task.id} taskId={task.id} />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </DndContext>

        {/* Completed section */}
        {completedTasks.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`flex items-center gap-1 type-body-sm mb-2 px-3 transition-opacity hover:opacity-80 ${onWallpaper}`}
            >
              {showCompleted ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {t(language, 'completed')} ({completedTasks.length})
            </button>
            {showCompleted && (
              <div className="space-y-1.5 animate-fade-in">
                {completedTasks.map(task => (
                  <TaskItem key={task.id} taskId={task.id} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
