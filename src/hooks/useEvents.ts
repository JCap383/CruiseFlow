import { platform } from '@/platform';
import { usePlatformQuery } from '@/platform/usePlatformQuery';
import type { CruiseEvent } from '@/types';
import { useAppStore } from '@/stores/appStore';

export function useEventsForDay(date?: string) {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const d = date ?? selectedDate;

  return usePlatformQuery(
    () => {
      if (!activeCruiseId) return Promise.resolve([]);
      return platform.db.getEventsForDay(activeCruiseId, d);
    },
    [activeCruiseId, d],
    [] as CruiseEvent[],
  );
}

/**
 * Return all events for a cruise.
 *
 * Defaults to the active cruise (preserving existing call sites), but callers
 * can pass an explicit `cruiseId`:
 *   - a string to scope to a specific cruise
 *   - `'all'` to span every cruise (used by the cross-cruise Memories view)
 *   - `null` to force an empty array (e.g. no active cruise)
 */
export function useAllCruiseEvents(cruiseId?: string | 'all' | null) {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const target = cruiseId === undefined ? activeCruiseId : cruiseId;

  return usePlatformQuery(
    () => {
      if (target === 'all') return platform.db.getAllEvents();
      if (!target) return Promise.resolve([]);
      return platform.db.getAllCruiseEvents(target);
    },
    [target],
    [] as CruiseEvent[],
  );
}

export function useEvent(id: string | undefined) {
  return usePlatformQuery(
    () => (id ? platform.db.getEvent(id) : Promise.resolve(undefined)),
    [id],
    undefined,
  );
}

export async function addEvent(
  event: Omit<CruiseEvent, 'id' | 'createdAt' | 'updatedAt'>,
) {
  return platform.db.addEvent(event);
}

export async function updateEvent(
  id: string,
  changes: Partial<Omit<CruiseEvent, 'id' | 'createdAt'>>,
) {
  return platform.db.updateEvent(id, changes);
}

export async function deleteEvent(id: string) {
  return platform.db.deleteEvent(id);
}
