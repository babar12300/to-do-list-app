import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildMailtoUrl, openMailto } from '@/lib/email';

// One compose window serves every email door in the app: the sidebar's
// "New email" (blank draft) and the task actions' "Email…" (prefilled draft).
// Sending hands the draft to the user's own mail client — no account or sender
// setup lives in the app itself.
export function EmailComposer() {
  const { state, dispatch } = useApp();
  const { language, composerOpen, composerPrefill } = state;
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Re-seed the fields from the prefill each time the composer opens, so a
  // prefilled task draft never leaks into a later blank draft.
  useEffect(() => {
    if (composerOpen) {
      setTo(composerPrefill?.to ?? '');
      setSubject(composerPrefill?.subject ?? '');
      setBody(composerPrefill?.body ?? '');
    }
  }, [composerOpen, composerPrefill]);

  const canSend = to.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    openMailto(buildMailtoUrl({ to: to.trim(), subject, body }));
    dispatch({ type: 'CLOSE_COMPOSER' });
  };

  const fieldClass =
    'w-full bg-transparent border-[0.5px] border-tint-12 rounded-row px-3 py-2 type-body-md text-foreground placeholder:text-black/25 focus:outline-none';

  return (
    <Dialog open={composerOpen} onOpenChange={open => { if (!open) dispatch({ type: 'CLOSE_COMPOSER' }); }}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t(language, 'composeEmail')}</DialogTitle>
        </DialogHeader>
        <input
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder="name@example.com"
          aria-label={t(language, 'to')}
          className={fieldClass}
        />
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder={t(language, 'subject')}
          aria-label={t(language, 'subject')}
          className={fieldClass}
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={6}
          placeholder={t(language, 'message')}
          aria-label={t(language, 'message')}
          className={`${fieldClass} resize-none`}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => dispatch({ type: 'CLOSE_COMPOSER' })}
            className="rounded-row px-3 py-2 type-body-md text-tint-56 transition-colors hover:bg-tint-4"
          >
            {t(language, 'cancel')}
          </button>
          <button
            onClick={send}
            disabled={!canSend}
            className="rounded-row px-4 py-2 type-body-md bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
          >
            {t(language, 'send')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
