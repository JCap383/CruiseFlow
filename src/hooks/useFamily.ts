import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { db } from '@/db/database';
import type { FamilyMember } from '@/types';
import { useAppStore } from '@/stores/appStore';

export function useFamily() {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);

  return useLiveQuery(
    () => {
      if (!activeCruiseId) return [];
      return db.members.where('cruiseId').equals(activeCruiseId).toArray();
    },
    [activeCruiseId],
    [],
  );
}

export function useMember(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.members.get(id) : undefined),
    [id],
    undefined,
  );
}

export async function addMember(
  member: Omit<FamilyMember, 'id'>,
): Promise<string> {
  const id = nanoid();
  await db.members.add({ ...member, id });
  return id;
}

export async function updateMember(
  id: string,
  changes: Partial<Omit<FamilyMember, 'id'>>,
) {
  return db.members.update(id, changes);
}

export async function deleteMember(id: string) {
  // Also remove this member from all events
  const events = await db.events
    .filter((e) => e.memberIds.includes(id))
    .toArray();
  await Promise.all(
    events.map((e) =>
      db.events.update(e.id, {
        memberIds: e.memberIds.filter((m) => m !== id),
      }),
    ),
  );
  return db.members.delete(id);
}
