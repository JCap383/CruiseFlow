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

  // Auto-select cruise or redirect to onboarding.
  //
  // Fallback rules (multi-cruise safe):
  //   1. No cruises at all → send to /onboarding.
  //   2. No activeCruiseId → pick the first cruise.
  //   3. activeCruiseId points to a cruise that no longer exists in the DB
  //      (deleted or restored from a backup without it) → fall back to the
  //      first available cruise instead of leaving the app in limbo.
  //
  // We verify "stale" against `platform.db` rather than the reactive
  // `cruises` list because dexie-react-hooks updates asynchronously after a
  // mutation, so a just-created cruise can briefly be missing from `cruises`
  // even though it's already persisted.
  useEffect(() => {
    if (!migrationDone) return;
    if (cruises === undefined) return;

    if (cruises.length === 0) {
      if (!window.location.pathname.includes('onboarding')) {
        window.location.href = '/onboarding';
      }
      return;
    }

    if (!activeCruiseId) {
      setActiveCruise(cruises[0]!.id);
      return;
    }

    // Check against the reactive list first — if present, we're good.
    if (cruises.some((c) => c.id === activeCruiseId)) return;

    // Not in the reactive list; confirm against the DB before resetting,
    // so we don't clobber a just-created cruise.
    let cancelled = false;
    void (async () => {
      const exists = await platform.db.getCruise(activeCruiseId);
      if (cancelled) return;
      if (!exists) {
        setActiveCruise(cruises[0]!.id);
      }
    })();
    return () => {
      cancelled = true;
    };
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
