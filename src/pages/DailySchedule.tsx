import { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, subDays, format, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Camera } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useAppStore } from '@/stores/appStore';
import { useCruise } from '@/hooks/useCruise';
import { useEventsForDay, updateEvent } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useConflicts } from '@/hooks/useConflicts';
import { useReminders } from '@/hooks/useReminders';
import { EventCard } from '@/components/events/EventCard';
import { isCurrentlyActive } from '@/utils/time';
import type { EventPhoto } from '@/types';
import { OnThisDay } from '@/components/memories/OnThisDay';

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1200;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = (h / w) * MAX; w = MAX; }
          else { w = (w / h) * MAX; h = MAX; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function DailySchedule() {
  const navigate = useNavigate();
  const { activeCruiseId, selectedDate, setSelectedDate } = useAppStore();
  const cruise = useCruise(activeCruiseId);
  const events = useEventsForDay();
  const members = useFamily();
  const conflicts = useConflicts(events);
  const reminders = useReminders(events);
  const captureRef = useRef<HTMLInputElement>(null);

  const conflictEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflicts) {
      ids.add(c.eventA.id);
      ids.add(c.eventB.id);
    }
    return ids;
  }, [conflicts]);

  // Find currently active event for quick capture
  const activeEvent = useMemo(
    () => events.find((e) => isCurrentlyActive(e.date, e.startTime, e.endTime)),
    [events],
  );

  const handleQuickCapture = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeEvent) return;
    const newPhotos: EventPhoto[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await compressPhoto(file);
      newPhotos.push({ id: nanoid(), dataUrl, caption: '', addedAt: Date.now() });
    }
    await updateEvent(activeEvent.id, {
      photos: [...(activeEvent.photos ?? []), ...newPhotos],
    });
  };

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

      {/* On This Day memories */}
      <OnThisDay />

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

      {/* Quick capture FAB (only when an event is happening now) */}
      {activeEvent && (
        <>
          <button
            onClick={() => captureRef.current?.click()}
            className="fixed bottom-20 left-4 w-12 h-12 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30 flex items-center justify-center active:scale-95 transition-transform z-30"
            title={`Add photo to "${activeEvent.title}"`}
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            ref={captureRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { handleQuickCapture(e.target.files); e.target.value = ''; }}
          />
        </>
      )}

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
