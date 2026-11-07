import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const GUEST_KEY = 'taskly-guest';

/** Signed-in users get their tasks; guests who chose "try it" get sample tasks; everyone else goes to sign-in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [params] = useSearchParams();
  if (params.get('guest') === '1') sessionStorage.setItem(GUEST_KEY, '1');
  const guest = sessionStorage.getItem(GUEST_KEY) === '1';
  const [status, setStatus] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? 'in' : 'out');
      if (session) sessionStorage.removeItem(GUEST_KEY);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setStatus(session ? 'in' : 'out');
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (status === 'out' && !guest) return <Navigate to="/sign-in" replace />;
  if (status === 'out') {
    return (
      <div className="flex h-screen flex-col">
        <div className="relative min-h-0 flex-1">{children}</div>
        <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary px-3 py-1.5 text-center text-sm text-primary-foreground">
          <span>Guest mode · sample tasks reset when you reload</span>
          <Button asChild size="sm" variant="secondary" className="h-7"><Link to="/sign-up">Sign up to save</Link></Button>
        </div>
      </div>
    );
  }
  return <div className="h-screen">{children}</div>;
}
