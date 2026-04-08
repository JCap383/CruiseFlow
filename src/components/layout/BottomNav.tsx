import { NavLink } from 'react-router-dom';
import { CalendarDays, Users, ScanLine, Settings } from 'lucide-react';

const tabs = [
  { to: '/', icon: CalendarDays, label: 'Schedule' },
  { to: '/scanner', icon: ScanLine, label: 'Scanner' },
  { to: '/family', icon: Users, label: 'Family' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-cruise-surface/95 backdrop-blur-md border-t border-cruise-border safe-bottom z-40">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-4 text-xs transition-colors ${
                isActive ? 'text-ocean-400' : 'text-cruise-muted'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
