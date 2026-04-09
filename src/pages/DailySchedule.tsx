import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, subDays, format, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useCruise } from '@/hooks/useCruise';
import { useEventsForDay } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useConflicts } from '@/hooks/useConflicts';
import { useReminders } from '@/hooks/useReminders';
import { EventCard } from '@/components/events/EventCard';

export function DailySchedule() {
  const navigate = useNavigate();
  const { activeCruiseId, selectedDate, setSelectedDate } = useAppStore();
  const cruise = useCruise(activeCruiseId);
  const events = useEventsForDay();
  const members = useFamily();
  const conflicts = useConflicts(events);
  const reminders = useReminders(events);

  const conflictEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflicts) {
      ids.add(c.eventA.id);
      ids.add(c.eventB.id);
    }
    return ids;
  }, [conflicts]);

  const dateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
  const dayLabel = format(dateObj, 'EEEE, MMM d');

  const canGoPrev = !cruise?.startDate || selectedDate > cruise.startDate;
  const canGoNext = !cruise?.endDate || selectedDate < cruise.endDate;

  const goDay = (dir: 'prev' | 'next') => {
    const fn = dir === 'prev' ? subDays : addDays;
    setSelectedDate(format(fn(dateObj, 1), 'yyyy-MM-dd'));
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-cruise-bg/95 backdrop-blur-md z-10 px-4 pt-2 pb-2 border-b border-cruise-border">
        <h1 className="text-lg font-bold text-center text-cruise-text">
          {cruise?.name ?? 'CruiseFlow'}
        </h1>
        <div className="flex items-center justify-between mt-1">
          <button
            onClick={() => goDay('prev')}
            disabled={!canGoPrev}
            className="p-2 text-cruise-muted disabled:opacity-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-ocean-300">{dayLabel}</span>
          <button
            onClick={() => goDay('next')}
            disabled={!canGoNext}
            className="p-2 text-cruise-muted disabled:opacity-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <p className="text-sm text-amber-300 font-medium">
            {conflicts.length} schedule conflict{conflicts.length > 1 ? 's' : ''} detected
          </p>
        </div>
      )}

      {/* Events list */}
      <div className="flex flex-col gap-3 p-4">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-cruise-muted text-sm">No events planned</p>
            <p className="text-cruise-muted/60 text-xs mt-1">
              Tap + to add your first event
            </p>
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              members={members}
              hasConflict={conflictEventIds.has(event.id)}
              reminder={reminders.get(event.id)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/event/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-ocean-500 text-white rounded-full shadow-lg shadow-ocean-500/30 flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
