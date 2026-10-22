import type { Task } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { format, parseISO } from 'date-fns';

// The composer hands the finished message to the user's own mail client via a
// mailto: URL — there is no in-app send path (no sender domain is connected).
export interface EmailDraft {
  to?: string;
  subject: string;
  body: string;
}

export function buildMailtoUrl({ to, subject, body }: { to: string; subject: string; body: string }): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${encodeURIComponent(to)}${params.length ? `?${params.join('&')}` : ''}`;
}

// Opening the mail client: an anchor click, so the browser keeps the page and
// hands the draft to the registered handler instead of navigating.
export function openMailto(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// A task becomes an email draft: title as subject, everything the task holds
// as the body. The recipient is always blank — who it goes to is the user's
// decision at compose time, never baked in from the task.
export function taskEmailPrefill(task: Task, listName: string | undefined, language: string): EmailDraft {
  const lines: string[] = [task.title, ''];
  if (task.dueDate) lines.push(`${t(language, 'dueDate')}: ${format(parseISO(task.dueDate), 'PPP')}`);
  if (listName) lines.push(`${t(language, 'lists')}: ${listName}`);
  if (task.notes) lines.push('', task.notes);
  if (task.links?.length) lines.push('', `${t(language, 'links')}:`, ...task.links.map(l => `- ${l}`));
  return { subject: task.title, body: `${lines.join('\n').trim()}\n` };
}
