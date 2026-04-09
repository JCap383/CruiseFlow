import { useMemo } from 'react';
import type { CruiseEvent } from '@/types';
import { suggestReminderMinutes } from '@/utils/reminders';
import { timeToMinutes, minutesToTime, isStartingSoon, minutesUntilStart } from '@/utils/time';

export interface ReminderInfo {
  /** "Leave by" time (HH:mm) to reach this event from the previous one */
  leaveByTime: string | null;
  /** Estimated travel minutes between decks */
  travelMinutes: number | null;
  /** Minutes until the event starts (null if not today / already started) */
  minutesUntil: number | null;
}

/**
 * Returns a map of event-id -> ReminderInfo for events starting within the
 * next 30 minutes. Events that have already started or are further out are
 * excluded so the UI only shows timely, auto-dismissing reminders.
 */
export function useReminders(
  events: CruiseEvent[],
): Map<string, ReminderInfo> {
  return useMemo(() => {
    const map = new Map<string, ReminderInfo>();

    const sorted = [...events].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );

    // Build a lookup of previous event per shared member for travel estimates
    const prevEventFor = new Map<string, CruiseEvent>();
    for (const ev of sorted) {
      if (!isStartingSoon(ev.date, ev.startTime, 30)) {
        // Even if this event isn't starting soon, record it as "previous" for later events
        for (const mid of ev.memberIds) {
          prevEventFor.set(mid, ev);
        }
        continue;
      }

      // Find the most recent prior event that shares at least one member
      let travelMinutes: number | null = null;
      let leaveByTime: string | null = null;

      for (const mid of ev.memberIds) {
        const prev = prevEventFor.get(mid);
        if (prev) {
          const t = suggestReminderMinutes(prev.deck, ev.deck);
          const leaveBy = timeToMinutes(ev.startTime) - t;
          if (travelMinutes === null || t > travelMinutes) {
            travelMinutes = t;
            leaveByTime = minutesToTime(Math.max(0, leaveBy));
          }
        }
      }

      map.set(ev.id, {
        leaveByTime,
        travelMinutes,
        minutesUntil: minutesUntilStart(ev.date, ev.startTime),
      });

      // Record this event as previous for future events
      for (const mid of ev.memberIds) {
        prevEventFor.set(mid, ev);
      }
    }

    return map;
  }, [events]);
}
