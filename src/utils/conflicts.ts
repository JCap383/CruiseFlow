import type { CruiseEvent } from '@/types';
import { timeToMinutes } from './time';

export interface Conflict {
  eventA: CruiseEvent;
  eventB: CruiseEvent;
  memberIds: string[];
}

function eventsOverlap(a: CruiseEvent, b: CruiseEvent): boolean {
  const aStart = timeToMinutes(a.startTime);
  const aEnd = timeToMinutes(a.endTime);
  const bStart = timeToMinutes(b.startTime);
  const bEnd = timeToMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

export function detectConflicts(events: CruiseEvent[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]!;
      const b = events[j]!;

      if (a.date !== b.date) continue;
      if (!eventsOverlap(a, b)) continue;

      const sharedMembers = a.memberIds.filter((id) =>
        b.memberIds.includes(id),
      );
      if (sharedMembers.length > 0) {
        conflicts.push({ eventA: a, eventB: b, memberIds: sharedMembers });
      }
    }
  }

  return conflicts;
}
