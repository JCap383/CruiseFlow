import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Pencil, Check, Download, Star, Plus } from 'lucide-react';
import type { EventPhoto } from '@/types';

interface PhotoLightboxProps {
  photos: EventPhoto[];
  initialIndex: number;
  onClose: () => void;
  onUpdateCaption?: (photoId: string, caption: string) => void;
  /**
   * #94: optional "set as cover" action. When provided, the lightbox shows
   * a star button in the top toolbar that promotes the currently visible
   * photo to be the day's cover. The host page is responsible for knowing
   * *which* day/cruise the photo belongs to and writing the change.
   */
  onSetCover?: (photoId: string) => void;
  /**
   * #94: data URL of the photo that is currently the cover for the day
   * these photos belong to. When the visible photo matches this, the star
   * renders filled and the toolbar shows a "Cover" status label instead of
   * the action.
   */
  currentCoverDataUrl?: string;
  /**
   * #95: optional per-photo labels rendered in the caption strip below the
   * image (e.g. "Day 3 · Tuesday · Front", "Day 3 · Tuesday · Back").
   * When provided, labels take precedence over the caption editor — the
   * lightbox switches to a read-only page-label footer because bulletin
   * photos aren't user-captioned.
   */
  pageLabels?: string[];
  /**
   * #95: optional "add event from this view" action. When provided, the
   * lightbox shows a `+` button in the top toolbar; tapping it closes the
   * lightbox and fires the callback so the host can navigate to the
   * event-create flow with the day pre-selected.
   */
  onAddToSchedule?: () => void;
}

export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
  onUpdateCaption,
  onSetCover,
  currentCoverDataUrl,
  pageLabels,
  onAddToSchedule,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  // Pinch-to-zoom + pan state. `scale` / `offset` drive the img transform;
  // the refs mirror the latest values so the native touchmove listener
  // (which closes over stale state otherwise) can read them in real time.
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const imgWrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  const photo = photos[index];

  // Reset zoom on navigate so the next photo always opens at 1x.
  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
    setEditingCaption(false);
    resetZoom();
  }, [resetZoom]);

  const goNext = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : i));
    setEditingCaption(false);
    resetZoom();
  }, [photos.length, resetZoom]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingCaption) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goPrev, goNext, editingCaption]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Native touch handlers for pinch-zoom + pan + swipe nav. We use
  // addEventListener with `{ passive: false }` so `preventDefault()` can
  // actually cancel the browser's default pan/zoom when we're handling a
  // gesture. React's synthetic touch events are always passive as of
  // React 17+, which is why we can't use onTouchMove here.
  useEffect(() => {
    const el = imgWrapRef.current;
    if (!el) return;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    // Constrain offset so the image can't drift past the edges when
    // zoomed. Called after every pan/pinch update.
    const clamp = (o: { x: number; y: number }, s: number) => {
      const imgEl = imgRef.current;
      if (!imgEl || s <= 1) return { x: 0, y: 0 };
      const rect = imgEl.getBoundingClientRect();
      // rect already reflects the current scaled size (transform is
      // applied), so subtract the natural "1x" size to get slack.
      const slackX = Math.max(0, (rect.width - rect.width / s) / 2);
      const slackY = Math.max(0, (rect.height - rect.height / s) / 2);
      return {
        x: Math.max(-slackX, Math.min(slackX, o.x)),
        y: Math.max(-slackY, Math.min(slackY, o.y)),
      };
    };

    let pinch: {
      startDist: number;
      startScale: number;
      startOffset: { x: number; y: number };
    } | null = null;
    let pan: {
      startX: number;
      startY: number;
      startOffset: { x: number; y: number };
    } | null = null;
    let swipeStartX: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (editingCaption) return;
      if (e.touches.length === 2) {
        // Two fingers down → start pinch. Capture initial distance +
        // current scale/offset so we can interpolate from there.
        pinch = {
          startDist: getDistance(e.touches[0]!, e.touches[1]!),
          startScale: scaleRef.current,
          startOffset: { ...offsetRef.current },
        };
        pan = null;
        swipeStartX = null;
        setIsGesturing(true);
      } else if (e.touches.length === 1) {
        const t = e.touches[0]!;
        if (scaleRef.current > 1) {
          // Zoomed in → single-finger drag pans the image instead of
          // navigating to the next photo.
          pan = {
            startX: t.clientX,
            startY: t.clientY,
            startOffset: { ...offsetRef.current },
          };
          swipeStartX = null;
          setIsGesturing(true);
        } else {
          // At 1x, a single finger starts a swipe for photo navigation.
          swipeStartX = t.clientX;
          pan = null;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch) {
        e.preventDefault();
        const dist = getDistance(e.touches[0]!, e.touches[1]!);
        const ratio = dist / pinch.startDist;
        const nextScale = Math.max(1, Math.min(4, pinch.startScale * ratio));
        setScale(nextScale);
        // Keep offset reasonable as the user zooms out back toward 1x.
        setOffset(clamp(pinch.startOffset, nextScale));
      } else if (e.touches.length === 1 && pan) {
        e.preventDefault();
        const t = e.touches[0]!;
        const raw = {
          x: pan.startOffset.x + (t.clientX - pan.startX),
          y: pan.startOffset.y + (t.clientY - pan.startY),
        };
        setOffset(clamp(raw, scaleRef.current));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (pinch && e.touches.length < 2) {
        pinch = null;
        // Snap back to 1x if the user almost fully zoomed out — avoids
        // the awkward "0.99x with tiny pan offset" state.
        if (scaleRef.current <= 1.02) {
          setScale(1);
          setOffset({ x: 0, y: 0 });
        }
      }
      if (pan && e.touches.length === 0) {
        pan = null;
      }
      if (
        swipeStartX !== null &&
        e.touches.length === 0 &&
        scaleRef.current === 1
      ) {
        const endX = e.changedTouches[0]?.clientX;
        if (endX !== undefined) {
          const diff = endX - swipeStartX;
          if (Math.abs(diff) > 50) {
            if (diff > 0) goPrev();
            else goNext();
          }
        }
        swipeStartX = null;
      }
      if (e.touches.length === 0) {
        setIsGesturing(false);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [editingCaption, goPrev, goNext]);

  // Double-tap / double-click toggles between 1x and 2.5x. On touch
  // devices this runs after the synthetic click fires at touch-end.
  const handleImageTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (scaleRef.current > 1) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      } else {
        setScale(2.5);
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // Desktop: Ctrl/Cmd + wheel zoom. Plain wheel is ignored so users can
  // still scroll the surrounding page chrome if needed.
  const handleWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = -e.deltaY * 0.003;
    const nextScale = Math.max(1, Math.min(4, scaleRef.current + delta));
    setScale(nextScale);
    if (nextScale === 1) setOffset({ x: 0, y: 0 });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const startEditCaption = () => {
    setCaptionText(photo?.caption ?? '');
    setEditingCaption(true);
    setTimeout(() => captionInputRef.current?.focus(), 50);
  };

  const saveCaption = () => {
    if (photo && onUpdateCaption) {
      onUpdateCaption(photo.id, captionText.trim());
    }
    setEditingCaption(false);
  };

  const handleDownload = async () => {
    if (!photo) return;

    // Try Web Share API with file (works on iOS Safari for "Save to Photos")
    try {
      const res = await fetch(photo.dataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `cruiseflow-${photo.caption || 'photo'}-${photo.id.slice(0, 6)}.jpg`,
        { type: 'image/jpeg' },
      );

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: photo.caption || 'CruiseFlow Photo',
        });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }

    // Fallback: download via anchor tag
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = `cruiseflow-${photo.caption || 'photo'}-${photo.id.slice(0, 6)}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!photo) return null;

  // #94: derive whether the visible photo IS the day's current cover so the
  // toolbar can switch between an action button and a status badge.
  const isCoverPhoto = !!currentCoverDataUrl && currentCoverDataUrl === photo.dataUrl;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
    >
      {/* Top buttons */}
      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 flex items-center gap-2">
        {onAddToSchedule && (
          // #95: "add event from this bulletin view" handoff. Closing the
          // lightbox is the host's responsibility — the callback is free
          // to navigate away.
          <button
            onClick={onAddToSchedule}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
            aria-label="Add event for this day"
            title="Add event for this day"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
        {onSetCover && (
          // #94: surface "Set as cover" inside the full-screen viewer so the
          // photo grid can stay clean. When this photo is *already* the
          // cover, render a filled star with no-op handler so it reads as a
          // status indicator instead of a tappable action.
          isCoverPhoto ? (
            <span
              className="h-10 px-3 flex items-center gap-1.5 rounded-full bg-white/20 text-white text-xs font-medium"
              aria-label="This photo is the day's cover"
            >
              <Star className="w-4 h-4" style={{ fill: 'currentColor' }} aria-hidden="true" />
              Cover
            </span>
          ) : (
            <button
              onClick={() => onSetCover(photo.id)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
              aria-label="Set as cover photo"
              title="Set as cover photo"
            >
              <Star className="w-5 h-5" aria-hidden="true" />
            </button>
          )
        )}
        <button
          onClick={handleDownload}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
          aria-label="Download photo"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
          aria-label="Close photo viewer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Counter */}
      {photos.length > 1 && (
        <span className="absolute top-[max(1.25rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 text-sm text-white/70">
          {index + 1} / {photos.length}
        </span>
      )}

      {/* Prev button */}
      {index > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next button */}
      {index < photos.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Photo */}
      <div
        ref={imgWrapRef}
        className="max-w-full max-h-full p-4 flex flex-col items-center"
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
      >
        <img
          ref={imgRef}
          src={photo.dataUrl}
          alt={photo.caption || ''}
          onClick={handleImageTap}
          draggable={false}
          className="max-w-full max-h-[75vh] object-contain rounded-lg select-none"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isGesturing ? 'none' : 'transform 0.2s ease-out',
            willChange: 'transform',
            cursor: scale > 1 ? 'grab' : 'zoom-in',
          }}
        />

        {/* Caption area */}
        <div className="mt-3 flex items-center gap-2 min-h-[2rem]">
          {pageLabels ? (
            // #95: bulletin mode — render the page label (e.g. "Day 3 ·
            // Tuesday · Front") read-only. Bulletin photos aren't
            // captioned, so the caption editor is hidden entirely.
            <span className="text-white/80 text-sm">
              {pageLabels[index] ?? ''}
            </span>
          ) : editingCaption ? (
            <>
              <input
                ref={captionInputRef}
                value={captionText}
                onChange={(e) => setCaptionText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveCaption(); }}
                placeholder="Add a caption..."
                className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-lg border border-white/20 outline-none flex-1 min-w-0"
              />
              <button onClick={saveCaption} className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 text-white">
                <Check className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onUpdateCaption ? startEditCaption : undefined}
              className="flex items-center gap-1.5 text-white/60 text-sm hover:text-white/90 transition-colors"
            >
              {photo.caption ? (
                <span className="text-white/80">{photo.caption}</span>
              ) : onUpdateCaption ? (
                <>
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Add caption</span>
                </>
              ) : null}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
