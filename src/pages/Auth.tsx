import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/app/AuthLayout';
import { getGuestPlan, selectGuestTasks, stageGuestTransfer, clearGuestTransfer } from '@/lib/guest-transfer';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const mode: Mode = pathname === '/sign-up' ? 'signup' : pathname === '/forgot-password' ? 'forgot' : 'signin';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guestPlan] = useState(() => sessionStorage.getItem('taskly-guest') === '1' ? getGuestPlan() : null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  function stageSelection(email: string | null) {
    if (mode === 'signup' && guestPlan) {
      return stageGuestTransfer(localStorage, selectGuestTasks(guestPlan, selectedTasks), email);
    }
  }

  useEffect(() => { setError(''); setNotice(''); setPassword(''); setShowPassword(false); }, [mode]);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      revision++;
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password', { replace: true });
      else if (session) navigate('/', { replace: true });
    });
    const initialRevision = revision;
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (active && initialRevision === revision && user && !error) navigate('/', { replace: true });
    }).catch(() => {});
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
      } else if (mode === 'signup') {
        stageSelection(email);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
        });
        if (error) { clearGuestTransfer(localStorage); setError(error.message); }
        else if (!data.session) setNotice('Check your email and tap the link to confirm your account.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) setError(error.message);
        else setNotice('If that email has an account, a reset link is on its way.');
      }
    } catch { if (mode === 'signup') clearGuestTransfer(localStorage); setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }

  async function oauth(provider: 'google' | 'lovable') {
    setBusy(true); setError(''); setNotice('');
    try {
      const token = stageSelection(null);
      const redirect = token ? `${window.location.origin}/?guestImport=${encodeURIComponent(token)}` : window.location.origin;
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirect });
      if (result.error) { if (mode === 'signup') clearGuestTransfer(localStorage); setError('Could not sign in. Please try again.'); }
      if (result.redirected) return;
    } catch { if (mode === 'signup') clearGuestTransfer(localStorage); setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }

  const title = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password';

  return (
    <AuthLayout>
        <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>

        {mode === 'signup' && guestPlan && guestPlan.tasks.length > 0 && (
          <fieldset disabled={busy} className="mb-6 min-w-0">
            <legend className="font-semibold text-foreground mb-2">Tasks to keep · {selectedTasks.length} selected</legend>
            <div className="flex gap-2 mb-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTasks(guestPlan.tasks.map(task => task.id))}>Select all</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTasks([])}>Clear selection</Button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-border border-y border-border">
              {guestPlan.tasks.map(task => (
                <label key={task.id} className="flex min-h-12 cursor-pointer items-center gap-3 py-3 pr-2 text-sm text-foreground">
                  <input type="checkbox" className="h-4 w-4 shrink-0 accent-primary" checked={selectedTasks.includes(task.id)}
                    onChange={e => setSelectedTasks(ids => e.target.checked ? [...ids, task.id] : ids.filter(id => id !== task.id))} />
                  <span className="min-w-0 break-words">{task.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {mode !== 'forgot' && (
          <>
            <div className="grid gap-2 mb-4">
              <Button type="button" variant="outline" className="h-12" disabled={busy} onClick={() => oauth('google')}>Continue with Google</Button>
              <Button type="button" variant="outline" className="h-12" disabled={busy} onClick={() => oauth('lovable')}>Continue with Lovable</Button>
            </div>
            <div className="flex items-center gap-3 mb-4"><div className="h-px flex-1 bg-tint-12" /><span className="type-body-sm">or</span><div className="h-px flex-1 bg-tint-12" /></div>
          </>
        )}

        <form onSubmit={submit} className="grid gap-3">
          {mode === 'signup' && (
            <div className="grid gap-1.5"><Label htmlFor="name">Name</Label>
              <Input id="name" required maxLength={100} disabled={busy} value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="h-12 text-base" /></div>
          )}
          <div className="grid gap-1.5"><Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required disabled={busy} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="h-12 text-base" /></div>
          {mode !== 'forgot' && (
            <div className="grid gap-1.5">
              <div className="flex justify-between items-center"><Label htmlFor="password">Password</Label>
                {mode === 'signin' && <Button asChild variant="link" className="h-auto px-0 text-xs"><Link to="/forgot-password">Forgot password?</Link></Button>}
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} required minLength={mode === 'signup' ? 6 : undefined} disabled={busy} value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="h-12 pr-12 text-base" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" aria-label={showPassword ? 'Hide password' : 'Show password'} title={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="text-sm text-foreground">{notice}</p>}
          <Button type="submit" className="mt-2 h-12" disabled={busy}>
            {busy && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
            {!busy && <ArrowRight aria-hidden="true" />}
          </Button>
        </form>

        <p className="text-sm text-center mt-5">
          {mode === 'signin' ? <>New here? <Button asChild variant="link" className="h-auto px-1"><Link to="/sign-up">Create an account</Link></Button></>
            : <>Already have an account? <Button asChild variant="link" className="h-auto px-1"><Link to="/sign-in">Sign in</Link></Button></>}
        </p>
        <div className="text-center mt-2"><Button asChild variant="ghost" className="text-sm"><Link to="/?guest=1">Try it as a guest with sample tasks</Link></Button></div>
    </AuthLayout>
  );
}
