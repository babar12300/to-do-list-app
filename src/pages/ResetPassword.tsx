import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRecovery = window.location.hash.includes('type=recovery');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message); else navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted">
      <main className="w-full max-w-[380px] rounded-panel bg-background border-[0.5px] border-tint-12 p-6">
        <h1 className="text-2xl font-semibold text-foreground mb-4">Choose a new password</h1>
        {!isRecovery && <p className="type-body-sm mb-3">Open this page from the link in your reset email.</p>}
        <form onSubmit={submit} className="grid gap-3">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="h-11" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11" disabled={busy}>Save password</Button>
        </form>
      </main>
    </div>
  );
}
