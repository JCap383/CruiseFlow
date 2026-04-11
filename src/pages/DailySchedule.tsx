import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, subDays, format, parse, isValid } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Camera,
  Search,
  X,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
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
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { haptics } from '@/utils/haptics';
import { useToast } from '@/components/ui/Toast';

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
  const toast = useToast();

  const conflictEventIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflicts) {
      ids.add(c.eventA.id);
      ids.add(c.eventB.id);
    }
    return ids;
  }, [conflicts]);

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
      toast.success(`Added ${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''}`);
      void haptics.success();
    } finally {
      setIsUploading(false);
    }
  };

  // #89: Defensive clamp. If selectedDate sits outside the active cruise
  // window (e.g. the user just switched cruises and the persisted date is
  // from the previous trip), pull it back to the nearest endpoint so the
  // user is never stranded with both prev/next disabled.
  useEffect(() => {
    if (!cruise?.startDate || !cruise?.endDate) return;
    if (selectedDate < cruise.startDate) {
      setSelectedDate(cruise.startDate);
    } else if (selectedDate > cruise.endDate) {
      setSelectedDate(cruise.endDate);
    }
  }, [cruise?.startDate, cruise?.endDate, selectedDate, setSelectedDate]);

  // #68 hardening: be defensive against malformed selectedDate. If parse
  // returns Invalid Date, fall back to today instead of crashing on format().
  const parsed = parse(selectedDate, 'yyyy-MM-dd', new Date());
  const dateObj = isValid(parsed) ? parsed : new Date();
  // #78: include the year so users can tell which trip they're looking at
  // when bouncing between past/future cruises.
  const dayLabel = format(dateObj, 'EEE, MMM d, yyyy');

  const canGoPrev = !cruise?.startDate || selectedDate > cruise.startDate;
  const canGoNext = !cruise?.endDate || selectedDate < cruise.endDate;

  const goDay = (dir: 'prev' | 'next') => {
    void haptics.tap();
    const fn = dir === 'prev' ? subDays : addDays;
    setSelectedDate(format(fn(dateObj, 1), 'yyyy-MM-dd'));
  };

  // #74: tapping the date label opens a real calendar picker via a hidden
  // <input type="date">. Constrained to the cruise window so users can't
  // wander outside the trip.
  const dateInputRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => {
    void haptics.tap();
    const el = dateInputRef.current;
    if (!el) return;
    // showPicker() is the only way to programmatically open the native
    // calendar; fall back to focus() on browsers that don't support it.
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        // ignore — fall through to focus
      }
    }
    el.focus();
    el.click();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter(null);
    setMemberFilter(null);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-2 pb-3 backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-default) 85%, transparent)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <Text variant="title2" weight="bold" truncate className="flex-1">
            {cruise?.name ?? 'CruiseFlow'}
          </Text>
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="p-2.5 rounded-full press"
            style={{
              backgroundColor: showSearch || hasActiveFilters ? 'var(--accent-soft)' : 'transparent',
              color: showSearch || hasActiveFilters ? 'var(--accent)' : 'var(--fg-muted)',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label={showSearch ? 'Close search' : 'Open search'}
            aria-expanded={showSearch}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Day picker */}
        <div className="flex items-center justify-between mt-1">
          <button
            onClick={() => goDay('prev')}
            disabled={!canGoPrev}
            className="p-2 rounded-full press"
            style={{
              color: canGoPrev ? 'var(--fg-muted)' : 'var(--fg-disabled)',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={openDatePicker}
            className="relative px-2 py-1 rounded-lg press"
            style={{ color: 'var(--accent)', minHeight: 44 }}
            aria-label={`Change date — currently ${dayLabel}`}
          >
            <Text
              variant="callout"
              weight="semibold"
              align="center"
              tone="accent"
              aria-live="polite"
            >
              {dayLabel}
            </Text>
            {/* #74: Hidden but interactive native date input. We don't use
                sr-only because Safari refuses to show a calendar for an
                element with display:none. Pin it under the visible label
                so the popup anchors correctly. */}
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              min={cruise?.startDate}
              max={cruise?.endDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            />
          </button>
          <button
            onClick={() => goDay('next')}
            disabled={!canGoNext}
            className="p-2 rounded-full press"
            style={{
              color: canGoNext ? 'var(--fg-muted)' : 'var(--fg-disabled)',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Search & filters */}
        {showSearch && (
          <div className="flex flex-col gap-2 mt-2 pb-1 animate-fade-slide-up">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--fg-subtle)' }}
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, venue, notes..."
                className="w-full rounded-xl pl-9 pr-9 py-2 text-body focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                }}
                aria-label="Search events"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 press"
                  style={{ color: 'var(--fg-muted)' }}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(active ? null : cat)}
                    className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 press"
                    style={{
                      backgroundColor: active ? config.color : 'var(--bg-card)',
                      color: active ? '#ffffff' : 'var(--fg-muted)',
                      border: `1px solid ${active ? 'transparent' : 'var(--border-default)'}`,
                    }}
                    aria-pressed={active}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
            {members.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                {members.map((m) => {
                  const active = memberFilter === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMemberFilter(active ? null : m.id)}
                      className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 flex items-center gap-1 press"
                      style={{
                        backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                        color: active ? 'var(--accent-fg)' : 'var(--fg-muted)',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                      }}
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
                className="text-footnote self-start"
                style={{ color: 'var(--accent)' }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* On This Day memories */}
      <OnThisDay />

      {/* Conflict banner */}
      {conflicts.length > 0 && (
        <div
          className="mx-4 mt-4 p-3.5 rounded-2xl"
          style={{
            backgroundColor: 'var(--warning-soft)',
            border: '1px solid var(--warning)',
          }}
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: 'var(--warning)' }}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <Text variant="subhead" weight="semibold" tone="warning">
                {conflicts.length} schedule conflict{conflicts.length > 1 ? 's' : ''} detected
              </Text>
              <ul className="mt-1 space-y-0.5">
                {conflicts.slice(0, 3).map((c, i) => {
                  const memberNames = members
                    .filter((m) => c.memberIds.includes(m.id))
                    .map((m) => m.name)
                    .join(', ');
                  return (
                    <li key={i} className="text-footnote" style={{ color: 'var(--fg-muted)' }}>
                      &ldquo;{c.eventA.title}&rdquo; overlaps &ldquo;{c.eventB.title}&rdquo;
                      {memberNames && ` · ${memberNames}`}
                    </li>
                  );
                })}
                {conflicts.length > 3 && (
                  <li className="text-footnote" style={{ color: 'var(--fg-subtle)' }}>
                    +{conflicts.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Events */}
      <div className="flex flex-col gap-3 p-4">
        {events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title={`No events planned for ${dayLabel}`}
            description="Add shows, excursions, dinners, and more to build your daily schedule."
            action={
              <Button
                onClick={() => navigate('/event/new')}
                size="lg"
                leadingIcon={<Plus className="w-4 h-4" />}
              >
                Add your first event
              </Button>
            }
          />
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Text variant="callout" tone="muted">No events match your filters</Text>
            <button
              onClick={clearFilters}
              className="mt-3 text-subhead underline"
              style={{ color: 'var(--accent)' }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Count badge */}
            <div className="flex items-center justify-between px-1 -mb-1">
              <Badge tone="neutral" size="md">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </Badge>
              {activeEvent && (
                <Badge tone="accent" size="md">
                  1 happening now
                </Badge>
              )}
            </div>
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                members={members}
                hasConflict={conflictEventIds.has(event.id)}
                reminder={reminders.get(event.id)}
              />
            ))}
          </>
        )}
      </div>

      {isUploading && <LoadingOverlay message="Adding photo..." />}

      {/* Quick capture pill (shows only when something is happening now) */}
      {activeEvent && (
        <>
          <button
            onClick={() => captureRef.current?.click()}
            className="fixed left-4 press flex items-center gap-2 pl-3 pr-4 rounded-full"
            style={{
              bottom: 'calc(88px + env(safe-area-inset-bottom))',
              backgroundColor: 'var(--warning)',
              color: '#1f1300',
              boxShadow: '0 10px 25px rgba(251, 191, 36, 0.35)',
              height: 44,
              zIndex: 30,
            }}
            aria-label={`Quick photo capture for ${activeEvent.title}`}
          >
            <Camera className="w-4 h-4" />
            <span className="text-footnote font-semibold truncate max-w-[120px]">
              {activeEvent.title}
            </span>
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

      {/* Primary FAB */}
      <button
        onClick={() => {
          void haptics.tap();
          navigate('/event/new');
        }}
        className="fixed right-4 w-14 h-14 rounded-full flex items-center justify-center press"
        style={{
          bottom: 'calc(88px + env(safe-area-inset-bottom))',
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-fg)',
          boxShadow: 'var(--shadow-fab)',
          zIndex: 30,
        }}
        aria-label="Add new event"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
