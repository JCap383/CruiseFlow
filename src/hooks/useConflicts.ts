import { useMemo } from 'react';
import type { CruiseEvent } from '@/types';
import { detectConflicts, type Conflict } from '@/utils/conflicts';

export function useConflicts(events: CruiseEvent[]): Conflict[] {
  return useMemo(() => detectConflicts(events), [events]);
}

export function useEventConflicts(
  eventId: string,
  events: CruiseEvent[],
): Conflict[] {
  return useMemo(
    () =>
      detectConflicts(events).filter(
        (c) => c.eventA.id === eventId || c.eventB.id === eventId,
      ),
    [eventId, events],
  );
}
