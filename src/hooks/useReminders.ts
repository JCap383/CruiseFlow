import { useMemo } from 'react';
import type { CruiseEvent } from '@/types';
import { suggestReminderMinutes } from '@/utils/reminders';
import { timeToMinutes, minutesToTime } from '@/utils/time';

export interface ReminderSuggestion {
  event: CruiseEvent;
  leaveByTime: string;
  travelMinutes: number;
}

export function useReminders(
  events: CruiseEvent[],
): ReminderSuggestion[] {
  return useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );

    const suggestions: ReminderSuggestion[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;

      // Only suggest if they have overlapping members
      const sharedMembers = prev.memberIds.filter((id) =>
        curr.memberIds.includes(id),
      );
      if (sharedMembers.length === 0) continue;

      const travelMinutes = suggestReminderMinutes(prev.deck, curr.deck);
      const leaveByMinutes = timeToMinutes(curr.startTime) - travelMinutes;

      if (leaveByMinutes > timeToMinutes(prev.startTime)) {
        suggestions.push({
          event: curr,
          leaveByTime: minutesToTime(Math.max(0, leaveByMinutes)),
          travelMinutes,
        });
      }
    }

    return suggestions;
  }, [events]);
}
