import { platform } from '@/platform';
import { usePlatformQuery } from '@/platform/usePlatformQuery';

export function useCruises() {
  return usePlatformQuery(
    () => platform.db.getCruises(),
    [],
    undefined as Awaited<ReturnType<typeof platform.db.getCruises>> | undefined,
  );
}

export function useCruise(id: string | null) {
  return usePlatformQuery(
    () => (id ? platform.db.getCruise(id) : Promise.resolve(undefined)),
    [id],
    undefined,
  );
}

export async function createCruise(
  cruise: Parameters<typeof platform.db.createCruise>[0],
): Promise<string> {
  return platform.db.createCruise(cruise);
}

export async function updateCruise(
  id: string,
  changes: Parameters<typeof platform.db.updateCruise>[1],
) {
  return platform.db.updateCruise(id, changes);
}

export async function deleteCruise(id: string) {
  return platform.db.deleteCruise(id);
}
