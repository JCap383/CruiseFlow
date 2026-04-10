import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div
      className="flex flex-col h-full max-w-lg mx-auto"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
