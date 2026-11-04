import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthLayout } from '@/components/app/AuthLayout';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLink] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function validate() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (active) setReady(Boolean(data.user && !error));
      } catch { if (active) setReady(false); }
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') void validate();
      if (event === 'SIGNED_OUT') setReady(false);
    });
    if (recoveryLink) void validate();
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [recoveryLink]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message); else navigate('/', { replace: true });
    } catch { setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }

  return (
    <AuthLayout>
        <h1 className="text-2xl font-semibold text-foreground mb-4">Choose a new password</h1>
        {!ready && <p role="status" className="text-sm mb-4">Open a valid link from your password reset email to continue.</p>}
        <form onSubmit={submit} className="grid gap-3">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" required minLength={6} disabled={!ready || busy} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="h-12 text-base" />
          <Label htmlFor="confirm-pw">Confirm new password</Label>
          <Input id="confirm-pw" type="password" required minLength={6} disabled={!ready || busy} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className="h-12 text-base" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12" disabled={!ready || busy}>{busy ? 'Please wait…' : 'Save password'}</Button>
        </form>
        <Button asChild variant="link" className="mt-4 w-full"><Link to="/sign-in">Back to sign in</Link></Button>
    </AuthLayout>
  );
}
