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
    setBusy(true); setError(''); setNeedsSignIn(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setNeedsSignIn(true); setBusy(false); return; }
    const { data, error } = await supabase.functions.invoke('daily-plan', {
      body: { description, tasks: openTasksSummary(state.tasks), today: new Date().toDateString() },
    });
    setBusy(false);
    if (error) {
      let msg = 'Could not create a plan. Please try again.';
      try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* keep */ }
      setError(msg);
      return;
    }
    setPlan(data.plan);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={className} aria-label="Plan my day">
        <Sparkles className="w-4 h-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan my day</DialogTitle>
            <DialogDescription>Describe what you need to get done and any deadlines. AI will turn it, plus your open tasks, into a prioritized plan.</DialogDescription>
          </DialogHeader>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} maxLength={4000}
            aria-label="Describe your tasks and deadlines"
            placeholder="e.g. Finish report by 3pm, call the bank, gym in the evening, groceries…"
            className="w-full rounded-md border bg-background p-2 type-body-sm resize-y" />
          {needsSignIn ? (
            <Button onClick={() => void lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })}>
              Sign in to use the AI planner
            </Button>
          ) : (
            <Button onClick={generate} disabled={busy || (!description.trim() && !state.tasks.some(t => !t.completed))}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} {busy ? 'Planning…' : 'Create plan'}
            </Button>
          )}
          {error && <p role="alert" className="type-body-sm text-destructive">{error}</p>}
          {plan && <div className="whitespace-pre-wrap type-body-sm rounded-md border p-3 bg-muted/40">{plan}</div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
