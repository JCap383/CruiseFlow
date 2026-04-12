import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Star, MapPin, Ship, Pause } from 'lucide-react';
import type { EventPhoto, MoodRating } from '@/types';
import { haptics } from '@/utils/haptics';

export interface StoryPhoto {
  photo: EventPhoto;
  eventId: string;
  eventTitle: string;
  venue?: string;
  mood?: MoodRating;
  isFavorite: boolean;
}

export interface StoryDay {
  date: string;
  label: string;
  dayNum: number | null;
  isSeaDay: boolean;
  photos: StoryPhoto[];
}

interface StoryViewerProps {
  days: StoryDay[];
  initialDayIndex?: number;
  initialPhotoIndex?: number;
  shipName?: string;
  onClose: () => void;
  /** Called when the user taps the current event title, to open its detail page. */
  onOpenEvent?: (eventId: string) => void;
}

const PHOTO_DURATION_MS = 5000;
const TICK_MS = 50;
const SWIPE_DISMISS_THRESHOLD = 90;
const SWIPE_HORIZONTAL_THRESHOLD = 50;
const HOLD_PAUSE_MS = 200;

export function StoryViewer({
  days,
  initialDayIndex = 0,
  initialPhotoIndex = 0,
  shipName,
  onClose,
  onOpenEvent,
}: StoryViewerProps) {
  const [dayIdx, setDayIdx] = useState(() =>
    Math.max(0, Math.min(days.length - 1, initialDayIndex)),
  );
  const [photoIdx, setPhotoIdx] = useState(() => Math.max(0, initialPhotoIndex));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [dragY, setDragY] = useState(0);

  const currentDay = days[dayIdx];
  const currentPhoto = currentDay?.photos[photoIdx];
  const totalPhotosInDay = currentDay?.photos.length ?? 0;

  // Preload next photo for smoother advance
  useEffect(() => {
    const next = days[dayIdx]?.photos[photoIdx + 1] ?? days[dayIdx + 1]?.photos[0];
    if (next) {
      const img = new window.Image();
      img.src = next.photo.dataUrl;
    }
  }, [dayIdx, photoIdx, days]);

  // Reset state when photo changes
  useEffect(() => {
    setProgress(0);
    setLoaded(false);
  }, [dayIdx, photoIdx]);

  const goNext = useCallback(() => {
    if (!currentDay) return;
    void haptics.tap();
    if (photoIdx + 1 < currentDay.photos.length) {
      setPhotoIdx((i) => i + 1);
    } else if (dayIdx + 1 < days.length) {
      setDayIdx((d) => d + 1);
      setPhotoIdx(0);
    } else {
      onClose();
    }
  }, [currentDay, photoIdx, dayIdx, days.length, onClose]);

  const goPrev = useCallback(() => {
    void haptics.tap();
    if (progress > 0.15) {
      // Restart current photo instead of jumping to previous
      setProgress(0);
      return;
    }
    if (photoIdx > 0) {
      setPhotoIdx((i) => i - 1);
    } else if (dayIdx > 0) {
      const prevDayPhotos = days[dayIdx - 1]?.photos.length ?? 1;
      setDayIdx((d) => d - 1);
      setPhotoIdx(prevDayPhotos - 1);
    }
  }, [photoIdx, dayIdx, days, progress]);

  const goPrevDay = useCallback(() => {
    if (dayIdx > 0) {
      setDayIdx((d) => d - 1);
      setPhotoIdx(0);
      void haptics.tap();
    }
  }, [dayIdx]);

  const goNextDay = useCallback(() => {
    if (dayIdx + 1 < days.length) {
      setDayIdx((d) => d + 1);
      setPhotoIdx(0);
      void haptics.tap();
    }
  }, [dayIdx, days.length]);

  // Advance timer
  useEffect(() => {
    if (paused || !loaded) return;
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + TICK_MS / PHOTO_DURATION_MS;
        if (next >= 1) {
          // Defer the advance so React commits the 100% frame first
          queueMicrotask(() => goNext());
          return 1;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [paused, loaded, goNext]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  // Touch: tap to advance, hold to pause, swipe-down to dismiss
  const touchRef = useRef<{
    x: number;
    y: number;
    time: number;
    holdTimer: number | null;
    moved: boolean;
  } | null>(null);
  // Timestamp of the most recent touchend. On touch devices a tap fires both
  // `touchend` and a synthetic `click`, so the onClick handler below guards
  // against any click that arrives within a short window after a touch —
  // otherwise every tap advances the story twice (issue #57).
  const lastTouchEndAt = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchRef.current = {
      x: t.clientX,
      y: t.clientY,
      time: Date.now(),
      moved: false,
      holdTimer: window.setTimeout(() => {
        setPaused(true);
      }, HOLD_PAUSE_MS),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const ref = touchRef.current;
    const t = e.touches[0];
    if (!ref || !t) return;
    const dy = t.clientY - ref.y;
    const dx = t.clientX - ref.x;
    if (Math.abs(dy) > 8 || Math.abs(dx) > 8) {
      ref.moved = true;
      if (ref.holdTimer !== null) {
        clearTimeout(ref.holdTimer);
        ref.holdTimer = null;
      }
    }
    // Only track downward drag for dismiss
    if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
      setDragY(dy);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const ref = touchRef.current;
    if (!ref) return;
    if (ref.holdTimer !== null) {
      clearTimeout(ref.holdTimer);
      ref.holdTimer = null;
    }
    setPaused(false);

    const dragDistance = dragY;
    setDragY(0);

    if (dragDistance > SWIPE_DISMISS_THRESHOLD) {
      onClose();
      touchRef.current = null;
      return;
    }

    const t = e.changedTouches[0];
    if (ref.moved && t) {
      // Horizontal swipe to navigate between photos
      const dx = t.clientX - ref.x;
      const dy = t.clientY - ref.y;
      if (Math.abs(dx) > SWIPE_HORIZONTAL_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext();
        else goPrev();
        lastTouchEndAt.current = Date.now();
        touchRef.current = null;
        return;
      }
    }

    if (!ref.moved && t) {
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const relX = t.clientX - rect.left;
      if (relX < rect.width * 0.33) goPrev();
      else goNext();
    }

    lastTouchEndAt.current = Date.now();
    touchRef.current = null;
  };

  if (!currentDay || !currentPhoto) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col select-none"
      style={{
        backgroundColor: '#000',
        color: '#fff',
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: dragY > 0 ? 'none' : 'transform 240ms cubic-bezier(0.2,0,0,1)',
        opacity: dragY > 0 ? Math.max(0.3, 1 - dragY / 400) : 1,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Memories stories"
    >
      {/* Photo surface (tap target) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // Ignore clicks while a touch is still in flight, and also the
          // synthetic click that fires right after a touchend on mobile —
          // otherwise taps advance the story twice (issue #57).
          if (touchRef.current) return;
          if (Date.now() - lastTouchEndAt.current < 500) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const relX = e.clientX - rect.left;
          if (relX < rect.width * 0.33) goPrev();
          else goNext();
        }}
      >
        <img
          key={`${dayIdx}-${photoIdx}`}
          src={currentPhoto.photo.dataUrl}
          alt={currentPhoto.photo.caption || currentPhoto.eventTitle}
          className="max-w-full max-h-full object-contain animate-fade-in"
          onLoad={() => setLoaded(true)}
          draggable={false}
        />
      </div>

      {/* Top gradient + chrome */}
      <div
        className="relative pointer-events-none"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0) 100%)',
        }}
      >
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pointer-events-auto">
          {currentDay.photos.map((_, i) => {
            const filled = i < photoIdx ? 1 : i === photoIdx ? progress : 0;
            return (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${filled * 100}%`,
                    backgroundColor: '#fff',
                    transition: i === photoIdx ? 'none' : 'width 120ms linear',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Day header */}
        <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-4 pointer-events-auto">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {shipName && (
                <>
                  <Ship className="w-3.5 h-3.5 text-white/80" aria-hidden="true" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/80 truncate">
                    {shipName}
                  </span>
                </>
              )}
              {currentDay.dayNum && (
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ml-1"
                  style={{
                    backgroundColor: currentDay.isSeaDay
                      ? 'rgba(255,255,255,0.18)'
                      : 'rgba(56,189,248,0.35)',
                    color: '#fff',
                  }}
                >
                  Day {currentDay.dayNum}
                </span>
              )}
            </div>
            <div className="text-base font-bold mt-0.5 truncate">{currentDay.label}</div>
          </div>
          {paused && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              aria-hidden="true"
            >
              <Pause className="w-4 h-4" />
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center press"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            aria-label="Close stories"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Spacer pushes caption to bottom */}
      <div className="flex-1" />

      {/* Bottom caption bar */}
      <div
        className="relative pointer-events-none"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
          background:
            'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)',
        }}
      >
        <div className="px-5 pt-10 pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentPhoto.isFavorite && (
              <Star
                className="w-4 h-4 shrink-0"
                style={{ color: '#fbbf24', fill: '#fbbf24' }}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenEvent) onOpenEvent(currentPhoto.eventId);
              }}
              className="text-left"
            >
              <span className="text-lg font-bold text-white leading-tight">
                {currentPhoto.eventTitle}
              </span>
            </button>
            {currentPhoto.mood && (
              <span className="text-lg" aria-hidden="true">
                {currentPhoto.mood}
              </span>
            )}
          </div>
          {currentPhoto.venue && (
            <div className="flex items-center gap-1 mt-1 text-sm text-white/85">
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{currentPhoto.venue}</span>
            </div>
          )}
          {currentPhoto.photo.caption && (
            <p className="mt-2 text-sm text-white/90 leading-relaxed line-clamp-3">
              {currentPhoto.photo.caption}
            </p>
          )}
          <div className="mt-2 text-[11px] text-white/60">
            {photoIdx + 1} / {totalPhotosInDay} · Day {dayIdx + 1} of {days.length}
          </div>
        </div>
      </div>

      {/* Desktop day navigation arrows (hidden on touch) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          goPrevDay();
        }}
        disabled={dayIdx === 0}
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center press disabled:opacity-30"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        aria-label="Previous day"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          goNextDay();
        }}
        disabled={dayIdx === days.length - 1}
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center press disabled:opacity-30"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        aria-label="Next day"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
