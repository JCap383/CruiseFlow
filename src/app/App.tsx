import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { seedVenues } from '@/db/seed';
import { useCruises } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';

export function App() {
  const cruises = useCruises(); // undefined while loading, Cruise[] once resolved
  const { activeCruiseId, setActiveCruise } = useAppStore();

  // Seed venues on first load
  useEffect(() => {
    seedVenues();
  }, []);

  // Auto-select cruise or redirect to onboarding
  useEffect(() => {
    // Still loading from IndexedDB — do nothing yet
    if (cruises === undefined) return;

    if (cruises.length > 0 && !activeCruiseId) {
      setActiveCruise(cruises[0]!.id);
    } else if (
      cruises.length === 0 &&
      !window.location.pathname.includes('onboarding')
    ) {
      window.location.href = '/onboarding';
    }
  }, [cruises, activeCruiseId, setActiveCruise]);

  return <RouterProvider router={router} />;
}
