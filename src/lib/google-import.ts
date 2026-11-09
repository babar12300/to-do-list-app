import { unzipSync, strFromU8 } from 'fflate';

export interface ImportedTask {
  title: string;
  notes?: string;
  completed: boolean;
  dueDate?: string;
  source: 'keep' | 'tasks' | 'text';
}

const MAX_TITLE = 500;
const clean = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

/** One Google Keep note (Takeout JSON). Checklists become one task per item. */
export function parseKeepNote(note: any): ImportedTask[] {
  if (!note || typeof note !== 'object' || note.isTrashed) return [];
  const title = clean(note.title);
  if (Array.isArray(note.listContent) && note.listContent.length) {
    return note.listContent
      .map((item: any) => ({ text: clean(item?.text), done: !!item?.isChecked }))
      .filter((i: { text: string }) => i.text)
      .map((i: { text: string; done: boolean }) => ({
        title: i.text.slice(0, MAX_TITLE),
        notes: title || undefined,
        completed: i.done,
        source: 'keep' as const,
      }));
  }
  const body = clean(note.textContent);
  if (!title && !body) return [];
  return [{
    title: (title || body.split('\n')[0]).slice(0, MAX_TITLE),
    notes: title ? body || undefined : body.split('\n').slice(1).join('\n').trim() || undefined,
    completed: false,
    source: 'keep',
  }];
}

/** Google Tasks Takeout export (Tasks.json). */
export function parseGoogleTasks(data: any): ImportedTask[] {
  const lists = Array.isArray(data?.items) ? data.items : [];
  const out: ImportedTask[] = [];
  for (const list of lists) {
    for (const task of Array.isArray(list?.items) ? list.items : []) {
      const title = clean(task?.title);
      if (!title || task?.deleted) continue;
      const due = clean(task?.due);
      out.push({
        title: title.slice(0, MAX_TITLE),
        notes: clean(task?.notes) || undefined,
        completed: task?.status === 'completed',
        dueDate: /^\d{4}-\d{2}-\d{2}/.test(due) ? due.slice(0, 10) : undefined,
        source: 'tasks',
      });
    }
  }
  return out;
}

/** Detects whether parsed JSON is a Keep note or a Google Tasks export. */
export function parseGoogleJson(data: any): ImportedTask[] {
  if (data?.kind === 'tasks#taskLists' || (Array.isArray(data?.items) && data.items[0]?.kind === 'tasks#taskList')) {
    return parseGoogleTasks(data);
  }
  if (data && ('textContent' in data || 'listContent' in data)) return parseKeepNote(data);
  return [];
}

/** Pasted text: one task per line; checklist markers like ☐ ☑ - [ ] - [x] are understood. */
export function parsePastedText(text: string): ImportedTask[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const done = /^(☑|✅|✔|\[x\]|- \[x\]|\* \[x\])/i.test(line);
      const title = line.replace(/^([-*•]\s*)?(\[[ xX]?\]|☐|☑|✅|✔|□)?\s*/, '').trim();
      return { title: title.slice(0, MAX_TITLE), completed: done, source: 'text' as const };
    })
    .filter(t => t.title);
}

/** Reads uploaded .json files or a Google Takeout .zip. */
export async function parseGoogleFiles(files: File[]): Promise<ImportedTask[]> {
  const out: ImportedTask[] = [];
  const handleJson = (name: string, text: string) => {
    if (!name.toLowerCase().endsWith('.json')) return;
    try { out.push(...parseGoogleJson(JSON.parse(text))); } catch { /* skip unreadable file */ }
  };
  for (const file of files) {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (file.name.toLowerCase().endsWith('.zip')) {
      const entries = unzipSync(buf, { filter: f => f.name.toLowerCase().endsWith('.json') });
      for (const [name, data] of Object.entries(entries)) handleJson(name, strFromU8(data));
    } else {
      handleJson(file.name, strFromU8(buf));
    }
  }
  return out;
}
