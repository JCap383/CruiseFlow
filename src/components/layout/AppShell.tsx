import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

/**
 * App shell wrapping the primary tab navigation.
 *
 * BottomNav is `position: fixed` at the bottom of the viewport (see
 * BottomNav.tsx). We reserve its height in the main scroll area via
 * `paddingBottom` so the last item in the list isn't hidden behind it.
 *
 * 64px = approximate nav content height (52px min + borders + slack).
 */
export function AppShell() {
  return (
    <div
      className="flex flex-col flex-1 min-h-0 max-w-lg w-full mx-auto"
      style={{ backgroundColor: 'var(--bg-default)' }}
    >
      <main
        className="flex-1 overflow-y-auto min-h-0"
        style={{
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
