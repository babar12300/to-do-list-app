import { useState, useEffect, useRef, useCallback } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/app/Sidebar';
import { TaskList } from '@/components/app/TaskList';
import { TaskDetailPanel } from '@/components/app/TaskDetailPanel';
import { EmailComposer } from '@/components/app/EmailComposer';

function AppLayout() {
  const { state } = useApp();
  const { wallpaper, activeTaskId, sidebarOpen } = state;
  const [shown, setShown] = useState(wallpaper);
  const [incoming, setIncoming] = useState<string | null>(null);
  const [incomingVisible, setIncomingVisible] = useState(false);
  const rafRef = useRef<number | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishFade = useCallback(() => {
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = null;
    if (incoming) setShown(incoming);
    setIncoming(null);
    setIncomingVisible(false);
  }, [incoming]);

  useEffect(() => {
    if (wallpaper === shown || wallpaper === incoming) return;
    let cancelled = false;
    const img = new Image();
    img.src = wallpaper;
    // Fade in only once the picture is decoded, or the layer fades in empty and then pops.
    img.decode().catch(() => undefined).then(() => {
      if (cancelled) return;
      if (incoming) setShown(incoming);
      setIncoming(wallpaper);
      setIncomingVisible(false);
    });
    return () => {
      cancelled = true;
    };
  }, [wallpaper, shown, incoming]);

  useEffect(() => {
    if (!incoming) return;
    // Two frames so the layer is painted at opacity 0 before the transition starts.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setIncomingVisible(true));
    });
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [incoming]);

  useEffect(() => {
    if (!incomingVisible) return;
    // transitionend does not fire in a hidden tab, so the swap cannot depend on it alone.
    fallbackRef.current = setTimeout(finishFade, 700);
    return () => {
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, [incomingVisible, finishFade]);

  return (
    <div className="h-full w-full overflow-hidden relative transition-colors duration-300">
      {/* Wallpaper layers */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${shown})` }}
      />
      {incoming && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{ backgroundImage: `url(${incoming})`, opacity: incomingVisible ? 1 : 0 }}
          onTransitionEnd={finishFade}
        />
      )}

      {/* App shell */}
      <div className="relative z-10 h-full flex overflow-y-auto">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className={cn("flex-1 flex justify-center min-w-0 px-4 pt-16 pb-6 md:p-6 lg:p-8 transition-all duration-300", sidebarOpen ? "md:ml-[240px]" : "md:ml-0")}>
          <div className="w-full max-w-[600px]">
            <TaskList />
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {activeTaskId && <TaskDetailPanel />}

      {/* Shared email composer */}
      <EmailComposer />
    </div>
  );
}

const Index = () => (
  <AppProvider>
    <AppLayout />
  </AppProvider>
);

export default Index;
