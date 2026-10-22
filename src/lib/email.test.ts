import { describe, it, expect } from 'vitest';
import { buildMailtoUrl, taskEmailPrefill } from './email';
import { createTask } from '@/test/helpers';

describe('buildMailtoUrl', () => {
  it('encodes recipient, subject and body', () => {
    const url = buildMailtoUrl({ to: 'a@b.com', subject: 'Hi there', body: 'line1\nline2' });
    expect(url).toBe('mailto:a%40b.com?subject=Hi%20there&body=line1%0Aline2');
  });

  it('omits empty subject and body params', () => {
    expect(buildMailtoUrl({ to: 'a@b.com', subject: '', body: '' })).toBe('mailto:a%40b.com');
  });
});

describe('taskEmailPrefill', () => {
  it('uses the task title as the subject', () => {
    const draft = taskEmailPrefill(createTask({ title: 'Buy milk' }), undefined, 'en');
    expect(draft.subject).toBe('Buy milk');
  });

  it('includes due date, list, notes and links in the body', () => {
    const draft = taskEmailPrefill(
      createTask({ title: 'Trip', dueDate: '2026-10-21', notes: 'Pack light', links: ['https://example.com'] }),
      'Errands',
      'en',
    );
    expect(draft.body).toContain('Trip');
    expect(draft.body).toContain('Due date:');
    expect(draft.body).toContain('Lists: Errands');
    expect(draft.body).toContain('Pack light');
    expect(draft.body).toContain('- https://example.com');
  });

  it('labels follow the active language', () => {
    const draft = taskEmailPrefill(createTask({ dueDate: '2026-10-21' }), undefined, 'es');
    expect(draft.body).toContain('Fecha límite:');
  });

  it('never fills in a recipient — that is the user's choice at send time', () => {
    expect(taskEmailPrefill(createTask(), 'Inbox', 'en').to).toBeUndefined();
  });
});
