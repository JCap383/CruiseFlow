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

export function useAllCruiseEvents() {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);

  return usePlatformQuery(
    () => {
      if (!activeCruiseId) return Promise.resolve([]);
      return platform.db.getAllCruiseEvents(activeCruiseId);
    },
    [activeCruiseId],
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
