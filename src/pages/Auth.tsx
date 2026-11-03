import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { defaultWallpaper } from '@/data/wallpapers';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate('/', { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate('/', { replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name.trim() } },
        });
        if (error) setError(error.message);
        else if (!data.session) setNotice('Check your email and tap the link to confirm your account.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) setError(error.message);
        else setNotice('If that email has an account, a reset link is on its way.');
      }
    } finally { setBusy(false); }
  }

  async function oauth(provider: 'google' | 'lovable') {
    setError('');
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) setError('Could not sign in. Please try again.');
  }

  const title = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password';

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: `url(${defaultWallpaper})` }}>
      <main className="w-full max-w-[380px] rounded-panel bg-background/95 backdrop-blur-md border-[0.5px] border-tint-12 shadow-[0_8px_20px_rgba(0,0,0,0.12)] p-6">
        <h1 className="text-2xl font-semibold text-foreground mb-1">{title}</h1>
        <p className="type-body-sm mb-5">
          {mode === 'forgot' ? 'We will email you a link to choose a new password.' : 'Sync your wallpapers and plan your day with AI.'}
        </p>

        {mode !== 'forgot' && (
          <>
            <div className="grid gap-2 mb-4">
              <Button type="button" variant="outline" className="h-11" onClick={() => oauth('google')}>Continue with Google</Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => oauth('lovable')}>Continue with Lovable</Button>
            </div>
            <div className="flex items-center gap-3 mb-4"><div className="h-px flex-1 bg-tint-12" /><span className="type-body-sm">or</span><div className="h-px flex-1 bg-tint-12" /></div>
          </>
        )}

        <form onSubmit={submit} className="grid gap-3">
          {mode === 'signup' && (
            <div className="grid gap-1.5"><Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="h-11" /></div>
          )}
          <div className="grid gap-1.5"><Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="h-11" /></div>
          {mode !== 'forgot' && (
            <div className="grid gap-1.5">
              <div className="flex justify-between items-center"><Label htmlFor="password">Password</Label>
                {mode === 'signin' && <button type="button" onClick={() => setMode('forgot')} className="type-body-sm underline">Forgot password?</button>}
              </div>
              <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="h-11" />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="text-sm text-foreground">{notice}</p>}
          <Button type="submit" className="h-11" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </Button>
        </form>

        <p className="type-body-sm text-center mt-5">
          {mode === 'signin' ? <>New here? <button className="underline text-foreground" onClick={() => setMode('signup')}>Create an account</button></>
            : <>Already have an account? <button className="underline text-foreground" onClick={() => setMode('signin')}>Sign in</button></>}
        </p>
        <p className="text-center mt-2"><button className="type-body-sm underline" onClick={() => navigate('/')}>Continue without an account</button></p>
      </main>
    </div>
  );
}
