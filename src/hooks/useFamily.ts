import { platform } from '@/platform';
import { usePlatformQuery } from '@/platform/usePlatformQuery';
import type { FamilyMember } from '@/types';
import { useAppStore } from '@/stores/appStore';

/**
 * Return family members for a cruise.
 *
 * Defaults to the active cruise (preserving existing call sites). Pass an
 * explicit `cruiseId`:
 *   - a string to scope to a specific cruise
 *   - `'all'` to return members across every cruise (used by the
 *     cross-cruise Memories view so chips still render on memories from
 *     other cruises)
 *   - `null` for empty
 */
export function useFamily(cruiseId?: string | 'all' | null) {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const target = cruiseId === undefined ? activeCruiseId : cruiseId;

  return usePlatformQuery(
    async () => {
      if (target === 'all') {
        const cruises = await platform.db.getCruises();
        const all = await Promise.all(
          cruises.map((c) => platform.db.getMembers(c.id)),
        );
        return all.flat();
      }
      if (!target) return [];
      return platform.db.getMembers(target);
    },
    [target],
    [] as FamilyMember[],
  );
}

export function useMember(id: string | undefined) {
  return usePlatformQuery(
    () => (id ? platform.db.getMember(id) : Promise.resolve(undefined)),
    [id],
    undefined,
  );
}

export async function addMember(
  member: Omit<FamilyMember, 'id'>,
): Promise<string> {
  return platform.db.addMember(member);
}

export async function updateMember(
  id: string,
  changes: Partial<Omit<FamilyMember, 'id'>>,
) {
  return platform.db.updateMember(id, changes);
}

export async function deleteMember(id: string) {
  return platform.db.deleteMember(id);
}
