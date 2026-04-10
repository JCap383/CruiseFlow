import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse, differenceInDays, addDays } from 'date-fns';
import { nanoid } from 'nanoid';
import {
  Camera, Clock, MapPin, Star, Filter, Image as ImageIcon, FileText,
  Anchor, Share2, FileDown, Navigation, Plus, X, Check, Ship, Play,
} from 'lucide-react';
import { useAllCruiseEvents, addEvent, updateEvent } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useCruise, updateCruise } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import { MOOD_OPTIONS } from '@/types';
import type { EventPhoto, CruiseEvent, MoodRating } from '@/types';
import { formatTimeRange } from '@/utils/time';
import { MemberChip } from '@/components/family/MemberAvatar';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { ExportPDF } from '@/components/memories/ExportPDF';
import { MapView } from '@/components/memories/MapView';
import { BeforeAfter } from '@/components/memories/BeforeAfter';
import { StoryViewer, type StoryDay } from '@/components/memories/StoryViewer';
import { haptics } from '@/utils/haptics';
import { useToast } from '@/components/ui/Toast';

/** Simple count-up hook for animating stats. */
function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) { setValue(target); return; }
    let rafId = 0;
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);
  return value;
}

function StatTile({ value, label }: { value: number; label: string }) {
  const animated = useCountUp(value);
  return (
    <div className="text-center">
      <Text variant="title2" weight="bold">{animated}</Text>
      <Text variant="caption" tone="subtle" className="uppercase tracking-wider">{label}</Text>
    </div>
  );
}

export function Memories() {
  const navigate = useNavigate();
  const events = useAllCruiseEvents();
  const members = useFamily();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const cruise = useCruise(activeCruiseId);
  const toast = useToast();

  const [lightboxPhotos, setLightboxPhotos] = useState<EventPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportPDF, setShowExportPDF] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showQuickMemory, setShowQuickMemory] = useState(false);
  const [qmTitle, setQmTitle] = useState('');
  const [qmNotes, setQmNotes] = useState('');
  const [qmMood, setQmMood] = useState<MoodRating>(null);
  const [qmPhotos, setQmPhotos] = useState<EventPhoto[]>([]);
  const qmFileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmptyDays, setShowEmptyDays] = useState(false);
  const [storyState, setStoryState] = useState<{
    dayIndex: number;
    photoIndex: number;
  } | null>(null);

  // Parallax scroll offset for hero cover
  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY || document.documentElement.scrollTop);
    const appMain = document.querySelector('main');
    const target = appMain ?? window;
    const onScroll = () => {
      if (appMain) setScrollY(appMain.scrollTop);
      else handler();
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  // Trip stats
  const stats = useMemo(() => {
    const totalPhotos = events.reduce((sum, e) => sum + (e.photos?.length ?? 0), 0);
    const favorites = events.filter((e) => e.isFavorite).length;
    const uniqueDates = new Set(events.map((e) => e.date)).size;
    const excursions = events.filter((e) => e.category === 'excursion').length;
    return { events: events.length, photos: totalPhotos, favorites, days: uniqueDates, excursions };
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filterMemberId) {
      filtered = filtered.filter((e) => e.memberIds.includes(filterMemberId));
    }
    return filtered;
  }, [events, filterMemberId]);

  // Group events by date
  const memoryDays = useMemo(() => {
    const byDate = new Map<string, CruiseEvent[]>();
    for (const e of filteredEvents) {
      const existing = byDate.get(e.date) ?? [];
      existing.push(e);
      byDate.set(e.date, existing);
    }

    const dates: string[] = [];
    if (showEmptyDays && cruise?.startDate && cruise?.endDate) {
      const start = parse(cruise.startDate, 'yyyy-MM-dd', new Date());
      const end = parse(cruise.endDate, 'yyyy-MM-dd', new Date());
      const totalDays = differenceInDays(end, start) + 1;
      for (let i = 0; i < totalDays; i++) {
        dates.push(format(addDays(start, i), 'yyyy-MM-dd'));
      }
    } else {
      const datesWithContent = new Set<string>();
      for (const [date, dayEvents] of byDate.entries()) {
        const hasContent = dayEvents.some(
          (e) => (e.photos && e.photos.length > 0) || e.notes || e.isFavorite || e.mood,
        );
        if (hasContent) datesWithContent.add(date);
      }
      dates.push(...Array.from(datesWithContent).sort());
    }

    return dates
      .sort()
      .map((date) => {
        const dayEvents = byDate.get(date) ?? [];
        const sorted = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const dayPhotos = sorted.flatMap((e) => e.photos ?? []);
        const dayNum = cruise?.startDate
          ? differenceInDays(parse(date, 'yyyy-MM-dd', new Date()), parse(cruise.startDate, 'yyyy-MM-dd', new Date())) + 1
          : null;
        const hasExcursion = sorted.some((e) => e.category === 'excursion');
        const isSeaDay = !hasExcursion;

        return {
          date,
          label: format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d'),
          dayNum,
          isSeaDay,
          events: sorted,
          photoCount: dayPhotos.length,
          coverPhoto: cruise?.coverPhotos?.[date] ?? dayPhotos[0]?.dataUrl ?? null,
        };
      });
  }, [filteredEvents, cruise, showEmptyDays]);

  // Build story data: only days that actually have photos, flattened to
  // (photo, event) pairs so each photo is its own story "page".
  const storyDays = useMemo<StoryDay[]>(() => {
    return memoryDays
      .map((day) => {
        const photos = day.events.flatMap((e) =>
          (e.photos ?? []).map((photo) => ({
            photo,
            eventId: e.id,
            eventTitle: e.title,
            venue: e.venue || undefined,
            mood: e.mood,
            isFavorite: e.isFavorite,
          })),
        );
        return {
          date: day.date,
          label: day.label,
          dayNum: day.dayNum,
          isSeaDay: day.isSeaDay,
          photos,
        };
      })
      .filter((d) => d.photos.length > 0);
  }, [memoryDays]);

  const openStoriesFromStart = () => {
    if (storyDays.length === 0) return;
    void haptics.tap();
    setStoryState({ dayIndex: 0, photoIndex: 0 });
  };

  const handleSetCoverPhoto = async (date: string, dataUrl: string) => {
    if (!activeCruiseId || !cruise) return;
    await updateCruise(activeCruiseId, {
      coverPhotos: { ...cruise.coverPhotos, [date]: dataUrl },
    });
    toast.success('Cover photo updated');
  };

  const compressPhoto = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 1200;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = (h / w) * MAX; w = MAX; }
            else { w = (w / h) * MAX; h = MAX; }
          }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleQmAddPhotos = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    try {
      const newPhotos: EventPhoto[] = [];
      for (const file of Array.from(files)) {
        const dataUrl = await compressPhoto(file);
        newPhotos.push({ id: nanoid(), dataUrl, caption: '', addedAt: Date.now() });
      }
      setQmPhotos((prev) => [...prev, ...newPhotos]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateQuickMemory = async () => {
    if (!activeCruiseId) return;
    const now = new Date();
    const date = format(now, 'yyyy-MM-dd');
    const time = format(now, 'HH:mm');

    await addEvent({
      cruiseId: activeCruiseId,
      title: qmTitle.trim() || 'Quick Memory',
      date,
      startTime: time,
      endTime: time,
      category: 'personal',
      venue: '',
      deck: null,
      notes: qmNotes,
      memberIds: [],
      reminderMinutes: null,
      photos: qmPhotos,
      isFavorite: false,
      mood: qmMood,
    });

    setQmTitle('');
    setQmNotes('');
    setQmMood(null);
    setQmPhotos([]);
    setShowQuickMemory(false);
    toast.success('Memory saved');
    void haptics.success();
  };

  const handleShareTrip = async () => {
    const text = [
      `${cruise?.name ?? 'My Cruise'} Memories`,
      `${stats.days} days · ${stats.events} events · ${stats.photos} photos`,
      stats.favorites > 0 ? `${stats.favorites} favorite moments` : '',
    ].filter(Boolean).join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: cruise?.name, text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.info('Summary copied to clipboard');
    }
  };

  // Hero data
  const firstCover = memoryDays.find((d) => d.coverPhoto)?.coverPhoto ?? null;
  const heroParallax = Math.max(-80, -scrollY * 0.4);
  const heroFade = Math.max(0, 1 - scrollY / 200);

  return (
    <div ref={scrollContainerRef} className="flex flex-col">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          height: 260,
          backgroundColor: firstCover ? 'transparent' : 'var(--bg-card)',
        }}
      >
        {firstCover ? (
          <img
            src={firstCover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: `translateY(${heroParallax}px) scale(1.08)` }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, #075985 100%)',
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, var(--bg-default) 100%)',
          }}
        />
        {/* Action bar */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-end gap-1 px-3 pt-2"
        >
          {storyDays.length > 0 && (
            <button
              onClick={openStoriesFromStart}
              className="p-2.5 rounded-full press"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#ffffff', minWidth: 44, minHeight: 44 }}
              aria-label="Play stories"
            >
              <Play className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowMapView(true)}
            className="p-2.5 rounded-full press"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#ffffff', minWidth: 44, minHeight: 44 }}
            aria-label="Port map"
          >
            <Navigation className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowExportPDF(true)}
            className="p-2.5 rounded-full press"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#ffffff', minWidth: 44, minHeight: 44 }}
            aria-label="Export PDF"
          >
            <FileDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="p-2.5 rounded-full press"
            style={{
              backgroundColor: showFilters ? 'var(--accent)' : 'rgba(0,0,0,0.35)',
              color: '#ffffff',
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label="Filters"
            aria-expanded={showFilters}
          >
            <Filter className="w-5 h-5" />
          </button>
          <button
            onClick={handleShareTrip}
            className="p-2.5 rounded-full press"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#ffffff', minWidth: 44, minHeight: 44 }}
            aria-label="Share trip"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        {/* Title */}
        <div
          className="absolute bottom-0 left-0 right-0 px-5 pb-4"
          style={{ opacity: heroFade }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Ship className="w-4 h-4 text-white" aria-hidden="true" />
            <Text variant="caption" weight="semibold" className="uppercase tracking-wider text-white/80">
              {cruise?.shipName ?? 'Your Cruise'}
            </Text>
          </div>
          <Text variant="largeTitle" weight="bold" className="text-white">
            {cruise?.name ?? 'Memories'}
          </Text>
        </div>
      </div>

      {/* Stats ribbon */}
      {stats.events > 0 && (
        <div
          className="mx-4 -mt-8 relative z-10 rounded-2xl p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Anchor className="w-4 h-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <Text variant="caption" weight="semibold" tone="accent" className="uppercase tracking-wider">
              Trip summary
            </Text>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile value={stats.days} label="Days" />
            <StatTile value={stats.events} label="Events" />
            <StatTile value={stats.photos} label="Photos" />
            <StatTile value={stats.favorites} label="Faves" />
          </div>
        </div>
      )}

      {/* Stories reel — Instagram-style day bubbles */}
      {storyDays.length > 0 && (
        <div className="mt-5">
          <div className="px-4 flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <Text variant="caption" weight="semibold" tone="accent" className="uppercase tracking-wider">
                Stories
              </Text>
            </div>
            <button
              type="button"
              onClick={openStoriesFromStart}
              className="text-caption font-semibold press"
              style={{ color: 'var(--accent)' }}
            >
              Play all
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
            {storyDays.map((day, i) => (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  void haptics.tap();
                  setStoryState({ dayIndex: i, photoIndex: 0 });
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 press"
                aria-label={`Play stories for ${day.label}`}
              >
                <div
                  className="rounded-full p-[2.5px]"
                  style={{
                    background:
                      'conic-gradient(from 180deg, #38bdf8, #a855f7, #f472b6, #fbbf24, #38bdf8)',
                  }}
                >
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden"
                    style={{
                      border: '2.5px solid var(--bg-default)',
                      backgroundColor: 'var(--bg-card)',
                    }}
                  >
                    {day.photos[0] ? (
                      <img
                        src={day.photos[0].photo.dataUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera
                          className="w-5 h-5"
                          style={{ color: 'var(--fg-subtle)' }}
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <Text variant="caption" tone="muted" className="max-w-[72px] truncate">
                  {day.dayNum ? `Day ${day.dayNum}` : day.label.split(',')[0]}
                </Text>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="px-4 mt-4 flex flex-col gap-2 animate-fade-slide-up">
          {members.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setFilterMemberId(null)}
                className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap press"
                style={{
                  backgroundColor: !filterMemberId ? 'var(--accent)' : 'var(--bg-card)',
                  color: !filterMemberId ? 'var(--accent-fg)' : 'var(--fg-muted)',
                  border: `1px solid ${!filterMemberId ? 'var(--accent)' : 'var(--border-default)'}`,
                }}
              >
                All
              </button>
              {members.map((m) => {
                const active = filterMemberId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setFilterMemberId(active ? null : m.id)}
                    className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1 press"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                      color: active ? 'var(--accent-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                    }}
                  >
                    <span>{m.emoji}</span> {m.name}
                  </button>
                );
              })}
            </div>
          )}
          <label className="flex items-center gap-2 text-footnote cursor-pointer" style={{ color: 'var(--fg-muted)' }}>
            <input
              type="checkbox"
              checked={showEmptyDays}
              onChange={(e) => setShowEmptyDays(e.target.checked)}
              className="accent-ocean-500"
            />
            Show all cruise days (including empty ones)
          </label>
        </div>
      )}

      {/* Before & After */}
      <BeforeAfter />

      {memoryDays.length === 0 ? (
        <EmptyState
          icon={<Camera className="w-8 h-8" />}
          title="No memories yet"
          description="Add photos, notes, or ratings to your events to start building your cruise journal."
        />
      ) : (
        <div className="flex flex-col">
          {memoryDays.map(({ date, label, dayNum, isSeaDay, events: dayEvents, photoCount }) => (
            <div key={date} className="mt-6">
              {/* Day header */}
              <div className="px-4 flex items-center justify-between mb-3">
                <div>
                  {dayNum && (
                    <Badge tone={isSeaDay ? 'neutral' : 'accent'} size="md">
                      Day {dayNum} · {isSeaDay ? 'Sea Day' : 'Port Day'}
                    </Badge>
                  )}
                  <Text variant="headline" className="mt-1.5">{label}</Text>
                </div>
                <div className="flex items-center gap-2">
                  {photoCount > 0 && (
                    <Badge tone="neutral" icon={<ImageIcon className="w-3 h-3" />}>
                      {photoCount}
                    </Badge>
                  )}
                  <Badge tone="neutral" icon={<FileText className="w-3 h-3" />}>
                    {dayEvents.length}
                  </Badge>
                </div>
              </div>

              {/* Events for this day */}
              <div className="flex flex-col gap-4 px-4">
                {dayEvents.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      useAppStore.getState().setSelectedDate(date);
                      navigate('/event/new');
                    }}
                    className="w-full rounded-2xl p-5 text-center text-footnote press"
                    style={{
                      border: '1.5px dashed var(--border-strong)',
                      color: 'var(--fg-muted)',
                    }}
                  >
                    Nothing planned yet — tap to add your first event
                  </button>
                )}
                {dayEvents.map((event) => {
                  const assignedMembers = members.filter((m) =>
                    event.memberIds.includes(m.id),
                  );
                  const photos = event.photos ?? [];
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        void haptics.tap();
                        navigate(`/event/${event.id}`);
                      }}
                      className="w-full text-left press"
                    >
                      <div className="flex gap-3">
                        {/* Timeline rail */}
                        <div className="flex flex-col items-center pt-1.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: 'var(--accent)' }}
                          />
                          <div
                            className="w-0.5 flex-1 mt-1"
                            style={{ backgroundColor: 'var(--border-default)' }}
                          />
                        </div>

                        <div className="flex-1 min-w-0 pb-5">
                          <div className="flex items-center gap-1.5">
                            {event.isFavorite && (
                              <Star
                                className="w-3.5 h-3.5 shrink-0"
                                style={{ color: 'var(--warning)', fill: 'var(--warning)' }}
                                aria-hidden="true"
                              />
                            )}
                            <Text variant="headline" as="h3" truncate>
                              {event.title}
                            </Text>
                            {event.mood && <span className="text-body shrink-0">{event.mood}</span>}
                          </div>
                          <div
                            className="flex items-center gap-3 mt-1 text-footnote"
                            style={{ color: 'var(--fg-muted)' }}
                          >
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {formatTimeRange(event.startTime, event.endTime)}
                            </span>
                            {event.venue && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{event.venue}</span>
                              </span>
                            )}
                          </div>

                          {assignedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {assignedMembers.map((m) => (
                                <MemberChip key={m.id} member={m} />
                              ))}
                            </div>
                          )}

                          {event.notes && (
                            <div
                              className="text-subhead mt-2 rounded-xl p-3 whitespace-pre-wrap"
                              style={{
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-default)',
                                color: 'var(--fg-default)',
                              }}
                            >
                              {event.notes}
                            </div>
                          )}

                          {photos.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5 mt-2">
                              {photos.map((photo, photoIdx) => (
                                <div
                                  key={photo.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxPhotos(photos);
                                    setLightboxIndex(photoIdx);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setLightboxPhotos(photos);
                                      setLightboxIndex(photoIdx);
                                    }
                                  }}
                                  className="aspect-square rounded-xl overflow-hidden relative group press"
                                  style={{ backgroundColor: 'var(--bg-surface)' }}
                                >
                                  <img
                                    src={photo.dataUrl}
                                    alt={photo.caption || ''}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      handleSetCoverPhoto(event.date, photo.dataUrl);
                                    }}
                                    className="absolute bottom-1 left-1 text-caption bg-black/60 text-white/90 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                                  >
                                    Cover
                                  </button>
                                  {photo.caption && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                                      <p className="text-caption text-white/90 truncate">{photo.caption}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex >= 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onUpdateCaption={async (photoId, caption) => {
            for (const event of events) {
              const photos = event.photos ?? [];
              const photoIdx = photos.findIndex((p) => p.id === photoId);
              if (photoIdx >= 0) {
                await updateEvent(event.id, {
                  photos: photos.map((p) =>
                    p.id === photoId ? { ...p, caption } : p,
                  ),
                });
                break;
              }
            }
          }}
        />
      )}

      {/* Quick Memory FAB */}
      <button
        onClick={() => {
          void haptics.tap();
          setShowQuickMemory(true);
        }}
        className="fixed right-4 w-14 h-14 rounded-full flex items-center justify-center press"
        style={{
          bottom: 'calc(88px + env(safe-area-inset-bottom))',
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-fg)',
          boxShadow: 'var(--shadow-fab)',
          zIndex: 30,
        }}
        aria-label="Add quick memory"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Memory Sheet */}
      <Sheet open={showQuickMemory} onClose={() => setShowQuickMemory(false)} title="Quick Memory">
        <div className="px-4 pb-4 flex flex-col gap-3">
          <input
            value={qmTitle}
            onChange={(e) => setQmTitle(e.target.value)}
            placeholder="What's this memory?"
            className="w-full rounded-xl px-4 py-2.5 text-body focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          />
          <textarea
            value={qmNotes}
            onChange={(e) => setQmNotes(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="w-full rounded-xl px-4 py-2.5 text-body focus:outline-none resize-none"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              color: 'var(--fg-default)',
            }}
          />

          <div className="flex gap-2">
            {MOOD_OPTIONS.map(({ emoji, label }) => {
              const active = qmMood === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setQmMood(active ? null : emoji)}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl flex-1 press"
                  style={{
                    backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-card)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                  }}
                  aria-pressed={active}
                >
                  <span className="text-lg" aria-hidden="true">{emoji}</span>
                  <span className="text-caption" style={{ color: 'var(--fg-muted)' }}>{label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Text variant="footnote" tone="muted">
                Photos {qmPhotos.length > 0 && `(${qmPhotos.length})`}
              </Text>
              <button
                type="button"
                onClick={() => qmFileRef.current?.click()}
                className="flex items-center gap-1 text-footnote px-2.5 py-1 rounded-full press"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Camera className="w-3 h-3" /> Add
              </button>
              <input
                ref={qmFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { handleQmAddPhotos(e.target.files); e.target.value = ''; }}
              />
            </div>
            {qmPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {qmPhotos.map((photo, idx) => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden">
                    <img src={photo.dataUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setQmPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleCreateQuickMemory}
            disabled={!qmTitle.trim() && !qmNotes.trim() && qmPhotos.length === 0 && !qmMood}
            fullWidth
            size="lg"
            leadingIcon={<Check className="w-4 h-4" />}
          >
            Save Memory
          </Button>
        </div>
      </Sheet>

      {showExportPDF && <ExportPDF onClose={() => setShowExportPDF(false)} />}
      {showMapView && <MapView onClose={() => setShowMapView(false)} />}
      {isUploading && <LoadingOverlay message="Compressing photos..." />}

      {storyState && storyDays.length > 0 && (
        <StoryViewer
          days={storyDays}
          initialDayIndex={storyState.dayIndex}
          initialPhotoIndex={storyState.photoIndex}
          shipName={cruise?.shipName}
          onClose={() => setStoryState(null)}
          onOpenEvent={(eventId) => {
            setStoryState(null);
            navigate(`/event/${eventId}`);
          }}
        />
      )}
    </div>
  );
}
