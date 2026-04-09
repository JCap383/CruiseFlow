import { useEffect, useState, useCallback } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { seedVenues } from '@/db/seed';
import { useCruises } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import { platform } from '@/platform';
import { MigrationScreen } from '@/components/MigrationScreen';

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

  // Seed venues on first load
  useEffect(() => {
    seedVenues();
  }, []);

  // Auto-select cruise or redirect to onboarding
  useEffect(() => {
    if (!migrationDone) return;
    // Still loading from DB — do nothing yet
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

  // Show migration screen on native if needed
  if (!migrationDone) {
    return <MigrationScreen onComplete={handleMigrationComplete} />;
  }

  return <RouterProvider router={router} />;
}
