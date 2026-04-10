import { useEffect, useState, useCallback } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { seedVenues } from '@/db/seed';
import { useCruises } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import { platform } from '@/platform';
import { MigrationScreen } from '@/components/MigrationScreen';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import { useThemeController } from '@/hooks/useThemeController';
import { useNativeAppPolish } from '@/hooks/useNativeAppPolish';
import { ToastProvider } from '@/components/ui/Toast';

export function App() {
  const cruises = useCruises(); // undefined while loading, Cruise[] once resolved
  const { activeCruiseId, setActiveCruise } = useAppStore();
  const [migrationDone, setMigrationDone] = useState(
    // Web platform has no migration — skip immediately
    platform.migration === null,
  );

  const handleMigrationComplete = useCallback(() => {
    setMigrationDone(true);
  }, []);

  // Apply theme (dark/light/system) to <html data-theme="...">
  useThemeController();

  // Native iOS polish: status bar, keyboard resize, etc.
  useNativeAppPolish();

  // Seed venues on first load
  useEffect(() => {
    seedVenues();
  }, []);

  // Fire browser notifications for upcoming events with reminders set
  useEventNotifications();

  // Auto-select cruise or redirect to onboarding
  useEffect(() => {
    if (!migrationDone) return;
    if (cruises === undefined) return;

    if (cruises.length > 0 && !activeCruiseId) {
      setActiveCruise(cruises[0]!.id);
    } else if (
      cruises.length === 0 &&
      !window.location.pathname.includes('onboarding')
    ) {
      window.location.href = '/onboarding';
    }
  }, [cruises, activeCruiseId, setActiveCruise, migrationDone]);

  if (!migrationDone) {
    return <MigrationScreen onComplete={handleMigrationComplete} />;
  }

  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
