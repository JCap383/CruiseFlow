import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div
      className="flex flex-col flex-1 min-h-0 max-w-lg w-full mx-auto"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      <main className="flex-1 overflow-y-auto min-h-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
