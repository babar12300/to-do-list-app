import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';

export function openTasksSummary(tasks: { title: string; completed: boolean; dueDate?: string; starred: boolean }[]) {
  return tasks.filter(t => !t.completed).slice(0, 50)
    .map(t => `- ${t.title}${t.dueDate ? ` (due ${t.dueDate.slice(0, 10)})` : ''}${t.starred ? ' [starred]' : ''}`).join('\n');
}

export function DailyPlanner({ className }: { className?: string }) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function generate() {
    setBusy(true); setError(''); setPlan(''); setNeedsSignIn(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) { setNeedsSignIn(true); return; }
      const { data, error: requestError } = await supabase.functions.invoke('daily-plan', {
        body: { description, tasks: openTasksSummary(state.tasks), today: new Date().toString() },
      });
      if (requestError) {
        let msg = 'Could not create a plan. Please try again later.';
        try {
          const response = await (requestError as { context?: Response }).context?.json();
          if (typeof response?.error === 'string') msg = response.error;
          else if (typeof response?.message === 'string') msg = response.message;
        } catch { /* keep the safe fallback */ }
        setError(msg);
        return;
      }
      if (typeof data?.plan !== 'string' || !data.plan.trim()) {
        setError('The AI could not make a plan for this request.');
        return;
      }
      setPlan(data.plan);
    } catch {
      setError('Could not connect to the planner. Please try again later.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className={className} aria-label="Plan my day" title="Plan my day">
        <Sparkles className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan my day</DialogTitle>
            <DialogDescription>Today’s priorities and schedule</DialogDescription>
          </DialogHeader>
          <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={busy} rows={5} maxLength={4000}
            aria-label="Describe your tasks and deadlines"
            placeholder="e.g. Finish report by 3pm, call the bank, gym in the evening, groceries…"
            className="w-full rounded-md border bg-background p-2 type-body-sm resize-y" />
          {needsSignIn ? (
            <Button className="h-auto whitespace-normal" onClick={async () => {
              try {
                const { error: signInError } = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
                if (signInError) setError('Could not sign in. Please try again later.');
              } catch { setError('Could not sign in. Please try again later.'); }
            }}>
              Sign in to use the AI planner
            </Button>
          ) : (
            <Button onClick={generate} disabled={busy || (!description.trim() && !state.tasks.some(t => !t.completed))}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? 'Planning…' : 'Create plan'}
            </Button>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {plan && <section aria-label="Your daily plan" aria-live="polite" className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground border-t pt-3">{plan}</section>}
        </DialogContent>
      </Dialog>
    </>
  );
}
