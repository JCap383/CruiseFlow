import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, BookOpen, Ship, Users, Settings } from 'lucide-react';
import { haptics } from '@/utils/haptics';

const tabs = [
  { to: '/', icon: CalendarDays, label: 'Schedule', end: true },
  { to: '/memories', icon: BookOpen, label: 'Memories', end: false },
  { to: '/ship', icon: Ship, label: 'Ship', end: false },
  { to: '/family', icon: Users, label: 'Family', end: false },
  { to: '/settings', icon: Settings, label: 'Settings', end: false },
];

/**
 * Primary navigation tab bar.
 *
 * Pinned with position: fixed to the bottom of the visible viewport. This is
 * belt-and-suspenders alongside the --app-height variable in src/main.tsx —
 * even if the shell's flex layout computes an incorrect height (e.g. during
 * an iOS PWA relaunch race, or when Safari's URL bar transitions), the nav
 * always visually sticks to the viewport bottom.
 */
export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-40 backdrop-blur-xl"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)',
        borderTop: '1px solid var(--border-default)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="navigation"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around max-w-lg w-full mx-auto">
        {tabs.map(({ to, icon: Icon, label, end }) => {
          const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => {
                if (!isActive) void haptics.tap();
              }}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 px-1 press"
              style={{
                minHeight: 52,
                paddingTop: 6,
                paddingBottom: 6,
                color: isActive ? 'var(--accent)' : 'var(--fg-muted)',
              }}
            >
              {/* Active pill behind the icon */}
              {isActive && (
                <span
                  className="absolute top-1.5 w-12 h-8 rounded-full -z-0"
                  style={{ backgroundColor: 'var(--accent-soft)' }}
                  aria-hidden="true"
                />
              )}
              <Icon
                className="relative z-10"
                style={{ width: 22, height: 22 }}
                aria-hidden="true"
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span
                className="relative z-10 text-caption font-semibold"
                style={{ letterSpacing: 0.1 }}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
