import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Renders children only for signed-in users; everyone else is sent to sign-in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setStatus(session ? 'in' : 'out');
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
  if (status === 'out') return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}
