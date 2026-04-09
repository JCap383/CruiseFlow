import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { db } from '@/db/database';
import type { Cruise } from '@/types';

export function useCruises() {
  // Default is undefined while loading, [] once resolved with no data
  return useLiveQuery(() => db.cruises.toArray(), []);
}

export function useCruise(id: string | null) {
  return useLiveQuery(
    () => (id ? db.cruises.get(id) : undefined),
    [id],
    undefined,
  );
}

export async function createCruise(
  cruise: Omit<Cruise, 'id' | 'createdAt'>,
): Promise<string> {
  const id = nanoid();
  await db.cruises.add({ ...cruise, id, coverPhotos: {}, createdAt: Date.now() });
  return id;
}

export async function updateCruise(
  id: string,
  changes: Partial<Omit<Cruise, 'id' | 'createdAt'>>,
) {
  return db.cruises.update(id, changes);
}

export async function deleteCruise(id: string) {
  await db.events.where('cruiseId').equals(id).delete();
  await db.members.where('cruiseId').equals(id).delete();
  return db.cruises.delete(id);
}
