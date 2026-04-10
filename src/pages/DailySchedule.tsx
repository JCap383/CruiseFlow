import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, subDays, format, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Camera, Search, X, Calendar, AlertTriangle } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useAppStore } from '@/stores/appStore';
import { useCruise } from '@/hooks/useCruise';
import { useEventsForDay, updateEvent } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useConflicts } from '@/hooks/useConflicts';
import { useReminders } from '@/hooks/useReminders';
import { EventCard } from '@/components/events/EventCard';
import { isCurrentlyActive } from '@/utils/time';
import type { EventPhoto, EventCategory } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { OnThisDay } from '@/components/memories/OnThisDay';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

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
  const [isUploading, setIsUploading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);

  const conflictEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflicts) {
      ids.add(c.eventA.id);
      ids.add(c.eventB.id);
    }
    return ids;
  }, [conflicts]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((e) => e.category === categoryFilter);
    }
    if (memberFilter) {
      filtered = filtered.filter((e) => e.memberIds.includes(memberFilter));
    }
    return filtered;
  }, [events, searchQuery, categoryFilter, memberFilter]);

  const hasActiveFilters = !!searchQuery.trim() || categoryFilter || memberFilter;

  // Find currently active event for quick capture
  const activeEvent = useMemo(
    () => events.find((e) => isCurrentlyActive(e.date, e.startTime, e.endTime)),
    [events],
  );

  const handleQuickCapture = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeEvent) return;
    setIsUploading(true);
    try {
      const newPhotos: EventPhoto[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await compressPhoto(file);
        newPhotos.push({ id: nanoid(), dataUrl, caption: '', addedAt: Date.now() });
      }
      await updateEvent(activeEvent.id, {
        photos: [...(activeEvent.photos ?? []), ...newPhotos],
      });
    } finally {
      setIsUploading(false);
    }
  };

  const dateObj = parse(selectedDate, 'yyyy-MM-dd', new Date());
  const dayLabel = format(dateObj, 'EEEE, MMM d');

  const canGoPrev = !cruise?.startDate || selectedDate > cruise.startDate;
  const canGoNext = !cruise?.endDate || selectedDate < cruise.endDate;

  const goDay = (dir: 'prev' | 'next') => {
    const fn = dir === 'prev' ? subDays : addDays;
    setSelectedDate(format(fn(dateObj, 1), 'yyyy-MM-dd'));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter(null);
    setMemberFilter(null);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-cruise-bg/95 backdrop-blur-md z-10 px-4 pt-2 pb-2 border-b border-cruise-border">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-cruise-text flex-1 truncate">
            {cruise?.name ?? 'CruiseFlow'}
          </h1>
          <button
            onClick={() => setShowSearch((s) => !s)}
            className={`p-2 rounded-lg ${showSearch || hasActiveFilters ? 'text-ocean-400 bg-ocean-400/10' : 'text-cruise-muted'}`}
            aria-label={showSearch ? 'Close search' : 'Open search'}
            aria-expanded={showSearch}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1">
          <button
            onClick={() => goDay('prev')}
            disabled={!canGoPrev}
            className="p-2 text-cruise-muted disabled:opacity-20"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-ocean-300" aria-live="polite">{dayLabel}</span>
          <button
            onClick={() => goDay('next')}
            disabled={!canGoNext}
            className="p-2 text-cruise-muted disabled:opacity-20"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Search & filters */}
        {showSearch && (
          <div className="flex flex-col gap-2 mt-2 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cruise-muted" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, venue, notes..."
                className="w-full bg-cruise-card border border-cruise-border rounded-xl pl-9 pr-9 py-2 text-sm text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none focus:border-ocean-500"
                aria-label="Search events"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cruise-muted"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(active ? null : cat)}
                    className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'text-white border-transparent'
                        : 'border-cruise-border text-cruise-muted bg-cruise-card'
                    }`}
                    style={active ? { backgroundColor: config.color } : undefined}
                    aria-pressed={active}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
            {members.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {members.map((m) => {
                  const active = memberFilter === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMemberFilter(active ? null : m.id)}
                      className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                        active
                          ? 'bg-ocean-500 text-white border-ocean-500'
                          : 'border-cruise-border text-cruise-muted bg-cruise-card'
                      }`}
                      aria-pressed={active}
                    >
                      <span>{m.emoji}</span> {m.name}
                    </button>
                  );
                })}
              </div>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-ocean-400 self-start"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* On This Day memories */}
      <OnThisDay />

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-300 font-medium">
                {conflicts.length} schedule conflict{conflicts.length > 1 ? 's' : ''} detected
              </p>
              <ul className="mt-1 space-y-0.5">
                {conflicts.slice(0, 3).map((c, i) => {
                  const memberNames = members
                    .filter((m) => c.memberIds.includes(m.id))
                    .map((m) => m.name)
                    .join(', ');
                  return (
                    <li key={i} className="text-xs text-amber-200/80">
                      &ldquo;{c.eventA.title}&rdquo; overlaps with &ldquo;{c.eventB.title}&rdquo;
                      {memberNames && ` for ${memberNames}`}
                    </li>
                  );
                })}
                {conflicts.length > 3 && (
                  <li className="text-xs text-amber-200/60">+{conflicts.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="flex flex-col gap-3 p-4">
        {events.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ocean-500/10 mb-4">
              <Calendar className="w-8 h-8 text-ocean-400" aria-hidden="true" />
            </div>
            <p className="text-cruise-text font-semibold">No events planned for {dayLabel}</p>
            <p className="text-cruise-muted text-sm mt-1 max-w-xs mx-auto">
              Add shows, excursions, dinners and more to build your daily schedule.
            </p>
            <button
              onClick={() => navigate('/event/new')}
              className="mt-5 inline-flex items-center gap-1.5 bg-ocean-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" />
              Add your first event
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-cruise-muted text-sm">No events match your filters</p>
            <button
              onClick={clearFilters}
              className="mt-3 text-sm text-ocean-400 underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => (
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

      {isUploading && <LoadingOverlay message="Adding photo..." />}

      {/* Quick capture FAB (only when an event is happening now) */}
      {activeEvent && (
        <>
          <button
            onClick={() => captureRef.current?.click()}
            className="fixed bottom-20 left-4 w-12 h-12 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30 flex items-center justify-center active:scale-95 transition-transform z-30"
            title={`Add photo to "${activeEvent.title}"`}
            aria-label={`Quick photo capture for ${activeEvent.title}`}
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
            aria-label="Capture photo"
          />
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/event/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-ocean-500 text-white rounded-full shadow-lg shadow-ocean-500/30 flex items-center justify-center active:scale-95 transition-transform z-30"
        aria-label="Add new event"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
