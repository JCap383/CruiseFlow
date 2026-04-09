import { platform } from '@/platform';
import { usePlatformQuery } from '@/platform/usePlatformQuery';
import type { FamilyMember } from '@/types';
import { useAppStore } from '@/stores/appStore';

export function useFamily() {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);

  return usePlatformQuery(
    () => {
      if (!activeCruiseId) return Promise.resolve([]);
      return platform.db.getMembers(activeCruiseId);
    },
    [activeCruiseId],
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
