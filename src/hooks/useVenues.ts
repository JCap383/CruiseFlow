import { platform } from '@/platform';
import { usePlatformQuery } from '@/platform/usePlatformQuery';
import type { Venue } from '@/types';

/**
 * Load all venues seeded for a given ship (by canonical or alias name).
 *
 * Returns `undefined` while loading and `Venue[]` once resolved. Pass `null`
 * or an empty string to get back `[]` immediately — used when no active cruise
 * is selected yet.
 */
export function useVenuesForShip(shipName: string | null | undefined) {
  return usePlatformQuery<Venue[] | undefined>(
    () =>
      shipName
        ? platform.db.getVenuesForShip(shipName)
        : Promise.resolve([] as Venue[]),
    [shipName ?? ''],
    undefined,
  );
}
