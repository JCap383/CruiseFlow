import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { db } from '@/db/database';
import type { CruiseEvent } from '@/types';
import { useAppStore } from '@/stores/appStore';

export function useEventsForDay(date?: string) {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const d = date ?? selectedDate;

  return useLiveQuery(
    () => {
      if (!activeCruiseId) return [];
      return db.events
        .where('[cruiseId+date]')
        .equals([activeCruiseId, d])
        .sortBy('startTime');
    },
    [activeCruiseId, d],
    [],
  );
}

export function useAllCruiseEvents() {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);

  return useLiveQuery(
    () => {
      if (!activeCruiseId) return [];
      return db.events.where('cruiseId').equals(activeCruiseId).toArray();
    },
    [activeCruiseId],
    [],
  );
}

export function useEvent(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.events.get(id) : undefined),
    [id],
    undefined,
  );
}

export async function addEvent(
  event: Omit<CruiseEvent, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const now = Date.now();
  return db.events.add({
    ...event,
    id: nanoid(),
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateEvent(
  id: string,
  changes: Partial<Omit<CruiseEvent, 'id' | 'createdAt'>>,
) {
  return db.events.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteEvent(id: string) {
  return db.events.delete(id);
}
