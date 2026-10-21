import type { Task } from '@/context/AppContext';

// One action definition per item kind, consumed by BOTH the ⋯ dropdown and the
// right-click context menu (docs/design/item-component.md rule 2: one
// definition, both doors). `band` groups actions; a divider separates bands
// (rule 7), and the destructive action is always in the last band (rule 4).
export interface ItemAction {
  id: string;
  labelKey: string;
  band: number;
  destructive?: boolean;
}

// Rule 6 ("nothing missing") is parity with the provider, not a fixed list: every
// operation the app supports on this item must be reachable FROM the item. The
// task reducer's UPDATE_TASK writes title, dueDate and listId, so rename, set due
// date and move to list belong here — before this they were reachable only by
// opening the task first, which is not the item's menu.
// Band 0 is "look at it", band 1 is "change it", band 2 is "take it away"
// (rule 7). "Get a copy out" and "let others in" are empty for a task: it has
// nothing to export and nothing to share, so those bands are skipped.
export function taskActions(task: Task): ItemAction[] {
  return [
    { id: 'open', labelKey: 'open', band: 0 },
    { id: 'complete', labelKey: task.completed ? 'markIncomplete' : 'markComplete', band: 1 },
    { id: 'star', labelKey: task.starred ? 'unstarTask' : 'starTask', band: 1 },
    { id: 'rename', labelKey: 'rename', band: 1 },
    { id: 'dueDate', labelKey: 'setDueDate', band: 1 },
    { id: 'move', labelKey: 'moveToListAction', band: 1 },
    { id: 'delete', labelKey: 'delete', band: 2, destructive: true },
  ];
}

// UPDATE_LIST writes { name, emoji }, so rule 6 wants a door to BOTH. The emoji
// had no door at all — it rendered in the sidebar and the detail panel and
// nothing could set it (choosing-a-value rules 1 and 2). "Change emoji…" opens a
// grid of emoji, so the control shows the set instead of asking someone to
// produce a member of it from a keyboard.
// Band numbers mean the same thing here as they do for a task, so the two menus
// read the same way: 1 is "change it", 2 is "take it away". A list has nothing to
// open, export or share, so those bands are simply skipped (rule 7).
export function listActions(): ItemAction[] {
  return [
    { id: 'rename', labelKey: 'rename', band: 1 },
    { id: 'emoji', labelKey: 'changeEmoji', band: 1 },
    { id: 'delete', labelKey: 'delete', band: 2, destructive: true },
  ];
}
