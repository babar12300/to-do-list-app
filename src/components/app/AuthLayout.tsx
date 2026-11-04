import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6">
      <img src="/wallpapers/george-tsapakis-sSuxFPPBLUk.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <main className="w-full max-w-md rounded-lg border border-border bg-card/95 p-6 text-card-foreground shadow-xl backdrop-blur-xl sm:p-8">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-lg font-bold" aria-label="Task planner home">
          <CheckCheck className="h-6 w-6" aria-hidden="true" /> Task planner
        </Link>
        {children}
      </main>
    </div>
  );
}