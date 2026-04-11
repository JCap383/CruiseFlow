import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse, differenceInDays, addDays } from 'date-fns';
import { nanoid } from 'nanoid';
import {
  Camera, Clock, MapPin, Star, Filter, Image as ImageIcon, FileText,
  Anchor, Share2, FileDown, Navigation, Plus, X, Check, Ship, Play,
  ArrowDownWideNarrow, ArrowUpWideNarrow,
} from 'lucide-react';
import { useAllCruiseEvents, addEvent, updateEvent } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useCruise, useCruises, updateCruise } from '@/hooks/useCruise';
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
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const allCruises = useCruises() ?? [];

  // Cruise filter — null = "All cruises", a string = a specific cruise id.
  // Defaults to the active cruise (so existing users land on their current
  // trip), but users can switch to "All cruises" to see every memory.
  const [cruiseFilter, setCruiseFilter] = useState<string | null>(activeCruiseId);

  // Keep the filter in sync when the active cruise changes (e.g. the user
  // just switched cruises in Settings) — but only if the filter was on a
  // specific cruise. Preserve an explicit "All cruises" selection.
  useEffect(() => {
    setCruiseFilter((prev) => (prev === null ? null : activeCruiseId));
  }, [activeCruiseId]);

  const events = useAllCruiseEvents(cruiseFilter ?? 'all');
  // Always load family members across all cruises so chips render
  // correctly even when viewing memories from a non-active cruise.
  const members = useFamily('all');
  const cruise = useCruise(cruiseFilter ?? activeCruiseId);
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
  // Sort order for the memory list. Defaults to "newest" so users land on
  // their most recent memories first (issue #58).
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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

  // Quick lookup from cruiseId → Cruise so we can show cruise names and
  // compute day numbers when viewing memories across multiple cruises.
  const cruiseById = useMemo(() => {
    const map = new Map<string, (typeof allCruises)[number]>();
    for (const c of allCruises) map.set(c.id, c);
    return map;
  }, [allCruises]);

  const isAllCruises = cruiseFilter === null;

  // Group events by (cruiseId, date) — this keeps memories from the same
  // calendar date across different cruises separate, which matters when
  // viewing all cruises at once.
  const memoryDays = useMemo(() => {
    interface Bucket {
      cruiseId: string;
      date: string;
      events: CruiseEvent[];
    }
    const byKey = new Map<string, Bucket>();
    const keyOf = (c: string, d: string) => `${c}::${d}`;

    for (const e of filteredEvents) {
      const k = keyOf(e.cruiseId, e.date);
      const existing = byKey.get(k);
      if (existing) {
        existing.events.push(e);
      } else {
        byKey.set(k, { cruiseId: e.cruiseId, date: e.date, events: [e] });
      }
    }

    const buckets: Bucket[] = [];

    // When filtering to a single cruise and "show empty days" is on, include
    // every date in that cruise's range (so users see Day 1, Day 2, etc.
    // even if nothing is logged). In all-cruises mode this would be too
    // noisy, so skip it.
    if (showEmptyDays && !isAllCruises && cruise?.startDate && cruise?.endDate) {
      const start = parse(cruise.startDate, 'yyyy-MM-dd', new Date());
      const end = parse(cruise.endDate, 'yyyy-MM-dd', new Date());
      const totalDays = differenceInDays(end, start) + 1;
      for (let i = 0; i < totalDays; i++) {
        const date = format(addDays(start, i), 'yyyy-MM-dd');
        const k = keyOf(cruise.id, date);
        if (!byKey.has(k)) {
          byKey.set(k, { cruiseId: cruise.id, date, events: [] });
        }
      }
      buckets.push(...byKey.values());
    } else {
      // Only include buckets with actual photos/notes/favourites/moods
      for (const bucket of byKey.values()) {
        const hasContent = bucket.events.some(
          (e) =>
            (e.photos && e.photos.length > 0) || e.notes || e.isFavorite || e.mood,
        );
        if (hasContent) buckets.push(bucket);
      }
    }

    // Sort: newest cruise first (by createdAt), then by date within cruise.
    // The date direction is controlled by `sortOrder` so users can see their
    // most recent memories on top or start at day 1 of their trip (issue #58).
    buckets.sort((a, b) => {
      const cA = cruiseById.get(a.cruiseId);
      const cB = cruiseById.get(b.cruiseId);
      const createdDiff = (cB?.createdAt ?? 0) - (cA?.createdAt ?? 0);
      if (createdDiff !== 0) return createdDiff;
      return sortOrder === 'newest'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    });

    return buckets.map(({ cruiseId, date, events: dayEvents }) => {
      const bucketCruise = cruiseById.get(cruiseId);
      const sorted = [...dayEvents].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      const dayPhotos = sorted.flatMap((e) => e.photos ?? []);
      const dayNum = bucketCruise?.startDate
        ? differenceInDays(
            parse(date, 'yyyy-MM-dd', new Date()),
            parse(bucketCruise.startDate, 'yyyy-MM-dd', new Date()),
          ) + 1
        : null;
      // #80: Don't claim "Sea Day" just because the user didn't log an
      // excursion — many port days have no excursion logged. Only emit a
      // positive label when we have actual evidence:
      //   - Excursion logged → Port Day
      //   - Otherwise → no day-type badge (the trip dayNum still shows)
      const hasExcursion = sorted.some((e) => e.category === 'excursion');
      const dayType: 'port' | null = hasExcursion ? 'port' : null;

      // #88: Pick the cover photo from a *stable* photo regardless of UI
      // sort order. We pin the displayed cover to the user's explicit
      // choice if any, otherwise to the earliest-captured photo of the day
      // so toggling sort never swaps the visible cover.
      const stablePhoto = dayPhotos
        .slice()
        .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))[0];

      return {
        key: `${cruiseId}::${date}`,
        cruiseId,
        cruiseName: bucketCruise?.name ?? 'Cruise',
        date,
        label: format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d'),
        dayNum,
        dayType,
        events: sorted,
        photoCount: dayPhotos.length,
        coverPhoto:
          bucketCruise?.coverPhotos?.[date] ?? stablePhoto?.dataUrl ?? null,
      };
    });
  }, [filteredEvents, cruise, showEmptyDays, cruiseById, isAllCruises, sortOrder]);

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
          // Stories still want a boolean. Treat the absence of a positive
          // port-day signal as "sea day" for the storyteller, since the
          // viewer just uses it for cosmetic copy.
          isSeaDay: day.dayType !== 'port',
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

  // #70: Use the event's *own* cruiseId, not the active cruise. When the
  // user is viewing "All cruises", tapping "Cover" on a photo from cruise B
  // while cruise A is active used to write the cover photo onto cruise A
  // with cruise B's date as the key — corrupting cruise A and never giving
  // cruise B its cover. Now we look up the right cruise and merge into its
  // coverPhotos map.
  const handleSetCoverPhoto = async (
    eventCruiseId: string,
    date: string,
    dataUrl: string,
  ) => {
    const target = cruiseById.get(eventCruiseId);
    if (!target) return;
    await updateCruise(eventCruiseId, {
      coverPhotos: { ...(target.coverPhotos ?? {}), [date]: dataUrl },
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

  // Hero data — #88: pin to a stable choice that doesn't change when the
  // user toggles sort order. Always prefer the most recent cruise's
  // explicit cover photo, then the earliest day with any photo within that
  // cruise (using a date-ascending lookup so the result is independent of
  // the visible sortOrder).
  const firstCover = useMemo(() => {
    if (memoryDays.length === 0) return null;
    const stable = [...memoryDays].sort((a, b) => {
      const cA = cruiseById.get(a.cruiseId);
      const cB = cruiseById.get(b.cruiseId);
      const createdDiff = (cB?.createdAt ?? 0) - (cA?.createdAt ?? 0);
      if (createdDiff !== 0) return createdDiff;
      return a.date.localeCompare(b.date);
    });
    return stable.find((d) => d.coverPhoto)?.coverPhoto ?? null;
  }, [memoryDays, cruiseById]);
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
              {isAllCruises
                ? `${allCruises.length} ${allCruises.length === 1 ? 'Cruise' : 'Cruises'}`
                : (cruise?.shipName ?? 'Your Cruise')}
            </Text>
          </div>
          <Text variant="largeTitle" weight="bold" className="text-white">
            {isAllCruises ? 'All Memories' : (cruise?.name ?? 'Memories')}
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

      {/* Cruise filter — shown whenever there's more than one cruise */}
      {allCruises.length > 1 && (
        <div className="mt-5">
          <div
            className="flex items-center gap-1.5 px-4 mb-2"
          >
            <Text variant="caption" weight="semibold" tone="accent" className="uppercase tracking-wider">
              Cruise
            </Text>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
            <button
              type="button"
              onClick={() => {
                void haptics.tap();
                setCruiseFilter(null);
              }}
              className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap press"
              style={{
                backgroundColor: isAllCruises ? 'var(--accent)' : 'var(--bg-card)',
                color: isAllCruises ? 'var(--accent-fg)' : 'var(--fg-muted)',
                border: `1px solid ${isAllCruises ? 'var(--accent)' : 'var(--border-default)'}`,
              }}
              aria-pressed={isAllCruises}
            >
              All cruises
            </button>
            {[...allCruises]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((c) => {
                const active = cruiseFilter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      void haptics.tap();
                      setCruiseFilter(c.id);
                    }}
                    className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap press"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                      color: active ? 'var(--accent-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                    }}
                    aria-pressed={active}
                  >
                    {c.name}
                  </button>
                );
              })}
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
        <div className="px-4 mt-4 flex flex-col gap-3 animate-fade-slide-up">
          {/* Sort order — issue #58 */}
          <div>
            <Text
              variant="caption"
              weight="semibold"
              tone="accent"
              className="uppercase tracking-wider block mb-1.5"
            >
              Sort
            </Text>
            <div
              className="inline-flex rounded-full p-0.5"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
              role="group"
              aria-label="Sort order"
            >
              <button
                type="button"
                onClick={() => {
                  void haptics.tap();
                  setSortOrder('newest');
                }}
                className="text-footnote px-3 py-1.5 rounded-full flex items-center gap-1 press"
                style={{
                  backgroundColor:
                    sortOrder === 'newest' ? 'var(--accent)' : 'transparent',
                  color:
                    sortOrder === 'newest'
                      ? 'var(--accent-fg)'
                      : 'var(--fg-muted)',
                }}
                aria-pressed={sortOrder === 'newest'}
              >
                <ArrowDownWideNarrow className="w-3.5 h-3.5" aria-hidden="true" />
                Newest first
              </button>
              <button
                type="button"
                onClick={() => {
                  void haptics.tap();
                  setSortOrder('oldest');
                }}
                className="text-footnote px-3 py-1.5 rounded-full flex items-center gap-1 press"
                style={{
                  backgroundColor:
                    sortOrder === 'oldest' ? 'var(--accent)' : 'transparent',
                  color:
                    sortOrder === 'oldest'
                      ? 'var(--accent-fg)'
                      : 'var(--fg-muted)',
                }}
                aria-pressed={sortOrder === 'oldest'}
              >
                <ArrowUpWideNarrow className="w-3.5 h-3.5" aria-hidden="true" />
                Oldest first
              </button>
            </div>
          </div>

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
          {memoryDays.map(({ key, date, label, dayNum, dayType, events: dayEvents, photoCount, cruiseName, cruiseId: bucketCruiseId }) => (
            <div key={key} className="mt-6">
              {/* Day header */}
              <div className="px-4 flex items-center justify-between mb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {dayNum && (
                      <Badge tone={dayType === 'port' ? 'accent' : 'neutral'} size="md">
                        Day {dayNum}
                        {dayType === 'port' ? ' · Port Day' : ''}
                      </Badge>
                    )}
                    {isAllCruises && (
                      <Badge tone="neutral" size="md" icon={<Ship className="w-3 h-3" />}>
                        {cruiseName}
                      </Badge>
                    )}
                  </div>
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
                  const openEvent = () => {
                    void haptics.tap();
                    navigate(`/event/${event.id}`);
                  };
                  // #76: Replaced the old structure (outer <button> wrapping
                  // <div role="button"> photos that themselves contained a
                  // real <button> for "Cover") with a flat <div> shell. The
                  // event card body and each photo are now sibling <button>
                  // elements, so screen-reader and keyboard semantics are
                  // sane and HTML's "no interactive descendants" rule is
                  // respected.
                  return (
                    <div key={event.id} className="flex gap-3">
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
                        <button
                          type="button"
                          onClick={openEvent}
                          className="w-full text-left press rounded-xl"
                          aria-label={`Open ${event.title}`}
                        >
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
                        </button>

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
                            {photos.map((photo, photoIdx) => {
                              // #93: only the *current* cover photo for this
                              // day should advertise itself as "Cover". The
                              // previous markup labelled every photo "Cover"
                              // because the chip was an action label, not a
                              // status — confusing because it looked like an
                              // assertion that every photo was the cover.
                              // Now: the active cover renders a filled-star
                              // "Cover" badge and other photos render a
                              // smaller outlined "Set cover" button.
                              const bucketCruise = cruiseById.get(bucketCruiseId);
                              const dayCover = bucketCruise?.coverPhotos?.[event.date];
                              const isCover = dayCover === photo.dataUrl;
                              return (
                              <div key={photo.id} className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightboxPhotos(photos);
                                    setLightboxIndex(photoIdx);
                                  }}
                                  className="aspect-square w-full rounded-xl overflow-hidden press block"
                                  style={{ backgroundColor: 'var(--bg-surface)' }}
                                  aria-label={photo.caption || `Open photo ${photoIdx + 1}`}
                                >
                                  <img
                                    src={photo.dataUrl}
                                    alt={photo.caption || ''}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                                {isCover ? (
                                  <div
                                    className="absolute bottom-1 left-1 text-caption px-1.5 py-0.5 rounded flex items-center gap-1 pointer-events-none"
                                    style={{
                                      backgroundColor: 'var(--accent)',
                                      color: 'var(--accent-fg)',
                                    }}
                                    aria-label="This photo is the day's cover"
                                  >
                                    <Star
                                      className="w-3 h-3"
                                      style={{ fill: 'currentColor' }}
                                      aria-hidden="true"
                                    />
                                    Cover
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSetCoverPhoto(
                                        bucketCruiseId,
                                        event.date,
                                        photo.dataUrl,
                                      )
                                    }
                                    className="absolute bottom-1 left-1 text-caption px-1.5 py-0.5 rounded flex items-center gap-1 press"
                                    style={{
                                      backgroundColor: 'rgba(0,0,0,0.6)',
                                      color: 'rgba(255,255,255,0.92)',
                                    }}
                                    aria-label="Set as cover photo"
                                  >
                                    <Star className="w-3 h-3" aria-hidden="true" />
                                    Set cover
                                  </button>
                                )}
                                {photo.caption && (
                                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                    <p className="text-caption truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{photo.caption}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          </div>
                        )}
                      </div>
                    </div>
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
