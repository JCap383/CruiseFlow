import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Share2, Ship, Camera, Users, Calendar } from 'lucide-react';
import type {
  RecapCard,
  CoverCard,
  NumbersCard,
  PhotoCard,
  DayByDayCard,
  BestOfCard,
  WhoWasThereCard,
  BusiestDayCard,
  CloserCard,
} from '@/hooks/useCruiseRecap';
import { haptics } from '@/utils/haptics';
import { useToast } from '@/components/ui/Toast';

/**
 * #96: Full-screen, auto-advancing player for the end-of-cruise recap.
 *
 * Uses the same "Instagram Stories" pattern as StoryViewer (segmented
 * progress bar, tap-to-advance, long-press to pause, swipe-down to
 * dismiss), but renders structured `RecapCard`s instead of raw photos —
 * the cards mix stats, grids, and hero photos.
 */

interface RecapPlayerProps {
  cards: RecapCard[];
  onClose: () => void;
}

const CARD_DURATION_MS = 5500;
const TICK_MS = 60;
const SWIPE_DISMISS_THRESHOLD = 90;
const HOLD_PAUSE_MS = 200;

export function RecapPlayer({ cards, onClose }: RecapPlayerProps) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragY, setDragY] = useState(0);
  const toast = useToast();

  const card = cards[index];
  const total = cards.length;

  // Preload next photo-ish card so the transition doesn't flash.
  useEffect(() => {
    const next = cards[index + 1];
    if (!next) return;
    const preload = (src: string | null | undefined) => {
      if (!src) return;
      const img = new window.Image();
      img.src = src;
    };
    switch (next.type) {
      case 'cover':
        preload(next.heroPhotoDataUrl);
        break;
      case 'first-photo':
      case 'last-photo':
        preload(next.photoDataUrl);
        break;
      case 'busiest-day':
        preload(next.heroPhoto);
        break;
      case 'best-of':
        next.photos.slice(0, 3).forEach((p) => preload(p.dataUrl));
        break;
      case 'day-by-day':
        next.days.slice(0, 3).forEach((d) => preload(d.photoDataUrl));
        break;
    }
  }, [index, cards]);

  // Reset progress when the card changes
  useEffect(() => {
    setProgress(0);
  }, [index]);

  const goNext = useCallback(() => {
    void haptics.tap();
    setIndex((i) => {
      if (i + 1 < cards.length) return i + 1;
      // Last card tapped past → close
      onClose();
      return i;
    });
  }, [cards.length, onClose]);

  const goPrev = useCallback(() => {
    void haptics.tap();
    setProgress((p) => {
      if (p > 0.15) {
        // Restart current card instead of jumping backward — matches
        // Stories convention.
        return 0;
      }
      setIndex((i) => Math.max(0, i - 1));
      return 0;
    });
  }, []);

  // Advance timer
  useEffect(() => {
    if (paused || !card) return;
    const timer = window.setInterval(() => {
      setProgress((p) => {
        const next = p + TICK_MS / CARD_DURATION_MS;
        if (next >= 1) {
          queueMicrotask(() => goNext());
          return 1;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [paused, goNext, card]);

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

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Tap + long-press + swipe gestures (shared with StoryViewer logic).
  const touchRef = useRef<{
    x: number;
    y: number;
    moved: boolean;
    holdTimer: number | null;
  } | null>(null);
  const lastTouchEndAt = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    touchRef.current = {
      x: t.clientX,
      y: t.clientY,
      moved: false,
      holdTimer: window.setTimeout(() => setPaused(true), HOLD_PAUSE_MS),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const ref = touchRef.current;
    const t = e.touches[0];
    if (!ref || !t) return;
    const dx = t.clientX - ref.x;
    const dy = t.clientY - ref.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      ref.moved = true;
      if (ref.holdTimer !== null) {
        clearTimeout(ref.holdTimer);
        ref.holdTimer = null;
      }
    }
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

    const drag = dragY;
    setDragY(0);

    if (drag > SWIPE_DISMISS_THRESHOLD) {
      onClose();
      touchRef.current = null;
      return;
    }

    if (!ref.moved) {
      const t = e.changedTouches[0];
      if (t) {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const relX = t.clientX - rect.left;
        if (relX < rect.width * 0.33) goPrev();
        else goNext();
      }
    }

    lastTouchEndAt.current = Date.now();
    touchRef.current = null;
  };

  const handleShare = async () => {
    const cover = cards.find((c): c is CoverCard => c.type === 'cover');
    const shipName = cover?.shipName ?? 'our cruise';
    const text = `Reliving our ${shipName} memories with CruiseFlow 🚢`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CruiseFlow Story', text });
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.info('Sharing not available on this device');
    }
  };

  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col select-none"
      style={{
        backgroundColor: '#07070c',
        color: '#fff',
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: dragY > 0 ? 'none' : 'transform 240ms cubic-bezier(0.2,0,0,1)',
        opacity: dragY > 0 ? Math.max(0.3, 1 - dragY / 400) : 1,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Cruise recap"
    >
      {/* Tappable card surface — covers the full screen so taps outside
          the visible card content still advance the story. */}
      <div
        className="absolute inset-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (touchRef.current) return;
          if (Date.now() - lastTouchEndAt.current < 500) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const relX = e.clientX - rect.left;
          if (relX < rect.width * 0.33) goPrev();
          else goNext();
        }}
      >
        <CardBody key={card.id} card={card} onShare={handleShare} />
      </div>

      {/* Top chrome (progress + close) — pointer-events-none on wrapper,
          pointer-events-auto on buttons so the tap surface underneath
          still works. */}
      <div
        className="relative pointer-events-none"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0) 100%)',
        }}
      >
        <div className="flex gap-1 px-3">
          {cards.map((_, i) => {
            const filled = i < index ? 1 : i === index ? progress : 0;
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
                    transition: filled === 0 ? 'none' : 'width 60ms linear',
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-3 py-2 pointer-events-auto">
          <span className="text-footnote" style={{ opacity: 0.75 }}>
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-full press"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', minWidth: 40, minHeight: 40 }}
            aria-label="Close recap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Pause indicator */}
      {paused && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        >
          <div
            className="px-4 py-2 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
          >
            <span className="text-footnote font-semibold">Paused</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Card renderers
// ===========================================================================

interface CardBodyProps {
  card: RecapCard;
  onShare: () => void;
}

function CardBody({ card, onShare }: CardBodyProps) {
  switch (card.type) {
    case 'cover':
      return <CoverBody card={card} />;
    case 'numbers':
      return <NumbersBody card={card} />;
    case 'first-photo':
    case 'last-photo':
      return <PhotoBody card={card} />;
    case 'day-by-day':
      return <DayByDayBody card={card} />;
    case 'best-of':
      return <BestOfBody card={card} />;
    case 'who-was-there':
      return <WhoWasThereBody card={card} />;
    case 'busiest-day':
      return <BusiestDayBody card={card} />;
    case 'closer':
      return <CloserBody card={card} onShare={onShare} />;
  }
}

const GRADIENTS = {
  cover: 'radial-gradient(ellipse at top, #ffb86b 0%, #e05a3c 35%, #3b1f5e 75%, #0b0f2e 100%)',
  numbers: 'linear-gradient(160deg, #0f6a7a 0%, #1a365d 55%, #0b1428 100%)',
  dayByDay: 'linear-gradient(170deg, #ff8c42 0%, #9f3b5c 55%, #0b1428 100%)',
  who: 'linear-gradient(165deg, #f472b6 0%, #8b5cf6 55%, #1f0f3e 100%)',
  busiest: 'linear-gradient(180deg, #2d1b3b 0%, #0b1428 100%)',
  closer: 'radial-gradient(ellipse at bottom, #3b1f5e 0%, #0b0f2e 55%, #020611 100%)',
};

const cardInStyle: React.CSSProperties = {
  animation: 'recap-card-in 500ms var(--ease-standard) both',
};

// --- Cover ------------------------------------------------------------------

function CoverBody({ card }: { card: CoverCard }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      style={{ background: GRADIENTS.cover }}
    >
      {card.heroPhotoDataUrl && (
        <img
          src={card.heroPhotoDataUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: 0.35,
            animation: 'kenburns 8s ease-out both',
            transformOrigin: 'center center',
          }}
          draggable={false}
          aria-hidden="true"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center" style={cardInStyle}>
        <div className="flex items-center gap-2 mb-5 opacity-80">
          <Ship className="w-4 h-4" />
          <span className="text-caption uppercase tracking-[0.2em] font-semibold">
            Your story
          </span>
        </div>
        <h1
          className="font-bold text-white mb-3"
          style={{ fontSize: 'clamp(32px, 9vw, 56px)', lineHeight: 1.05 }}
        >
          {card.totalDays} day{card.totalDays === 1 ? '' : 's'}
          <br />
          aboard the
          <br />
          {card.shipName}
        </h1>
        <p className="text-callout opacity-85">{card.dateRange}</p>
        <p className="mt-10 text-footnote opacity-60">Tap to begin</p>
      </div>
    </div>
  );
}

// --- Numbers ---------------------------------------------------------------

function NumbersBody({ card }: { card: NumbersCard }) {
  const tiles = [
    { label: 'Days', value: card.stats.days },
    { label: 'Events', value: card.stats.events },
    { label: 'Photos', value: card.stats.photos },
    { label: 'Travelers', value: card.stats.travelers },
  ];
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: GRADIENTS.numbers }}
    >
      <div className="flex flex-col items-center" style={cardInStyle}>
        <p className="text-caption uppercase tracking-[0.2em] opacity-75 mb-4">
          By the numbers
        </p>
        <h2
          className="font-bold text-white text-center mb-8"
          style={{ fontSize: 'clamp(28px, 7vw, 44px)', lineHeight: 1.1 }}
        >
          You made the most
          <br />
          of every moment.
        </h2>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-2xl px-4 py-5 text-center"
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div
                className="font-bold text-white"
                style={{ fontSize: 'clamp(32px, 10vw, 48px)', lineHeight: 1 }}
              >
                {t.value}
              </div>
              <div className="text-caption uppercase tracking-widest opacity-70 mt-1">
                {t.label}
              </div>
            </div>
          ))}
        </div>
        {card.stats.categories > 0 && (
          <p className="mt-6 text-subhead opacity-80">
            {card.stats.categories} kind{card.stats.categories === 1 ? '' : 's'}{' '}
            of memories made
          </p>
        )}
      </div>
    </div>
  );
}

// --- First / Last photo ----------------------------------------------------

function PhotoBody({ card }: { card: PhotoCard }) {
  const headline =
    card.type === 'first-photo' ? 'Where it started' : 'Where it ended';
  return (
    <div
      className="absolute inset-0"
      style={{ backgroundColor: '#000' }}
    >
      <img
        src={card.photoDataUrl}
        alt={card.caption || card.subtitle}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          animation: 'kenburns 8s ease-out both',
          transformOrigin: 'center center',
        }}
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.85) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 top-20 px-6 text-center"
        style={cardInStyle}
      >
        <p className="text-caption uppercase tracking-[0.2em] opacity-80">
          {headline}
        </p>
        <h2
          className="mt-2 font-bold text-white"
          style={{ fontSize: 'clamp(26px, 6vw, 40px)' }}
        >
          {card.dayLabel}
        </h2>
      </div>
      <div className="absolute inset-x-0 bottom-24 px-6 text-center" style={cardInStyle}>
        <p className="text-headline font-semibold text-white">{card.subtitle}</p>
        {card.caption && (
          <p className="mt-1 text-subhead opacity-85 italic">
            &ldquo;{card.caption}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

// --- Day by day ------------------------------------------------------------

function DayByDayBody({ card }: { card: DayByDayCard }) {
  // Show up to 8 day tiles in a 2-column grid for readability.
  const days = card.days.slice(0, 8);
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: GRADIENTS.dayByDay }}
    >
      <div className="flex flex-col items-center w-full max-w-md" style={cardInStyle}>
        <p className="text-caption uppercase tracking-[0.2em] opacity-80 mb-3">
          Day by day
        </p>
        <h2
          className="font-bold text-white text-center mb-6"
          style={{ fontSize: 'clamp(24px, 6vw, 36px)', lineHeight: 1.15 }}
        >
          Every day was
          <br />
          a highlight.
        </h2>
        <div className="grid grid-cols-2 gap-3 w-full">
          {days.map((d) => (
            <div
              key={d.dayNum}
              className="relative rounded-xl overflow-hidden"
              style={{
                aspectRatio: '4 / 3',
                boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
              }}
            >
              <img
                src={d.photoDataUrl}
                alt={`Day ${d.dayNum}`}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.75) 100%)',
                }}
              />
              <div className="absolute bottom-1.5 left-2 text-white">
                <div className="text-footnote font-semibold leading-none">
                  Day {d.dayNum}
                </div>
                <div className="text-[10px] opacity-80 uppercase tracking-wider">
                  {d.dayLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Best of ---------------------------------------------------------------

function BestOfBody({ card }: { card: BestOfCard }) {
  const photos = card.photos.slice(0, 9);
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{
        background:
          'radial-gradient(ellipse at center, #1a1a2e 0%, #070713 70%)',
      }}
    >
      <div className="flex flex-col items-center w-full max-w-md" style={cardInStyle}>
        <p className="text-caption uppercase tracking-[0.2em] opacity-75 mb-3">
          Best of
        </p>
        <h2
          className="font-bold text-white text-center mb-6"
          style={{ fontSize: 'clamp(24px, 6vw, 36px)', lineHeight: 1.15 }}
        >
          The moments that
          <br />
          mattered most.
        </h2>
        <div
          className="grid gap-1.5 w-full"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
          }}
        >
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative rounded-lg overflow-hidden"
              style={{ aspectRatio: '1 / 1' }}
            >
              <img
                src={p.dataUrl}
                alt={p.caption || ''}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
        <p className="mt-5 text-footnote opacity-70">
          {photos.length} favorite{photos.length === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  );
}

// --- Who was there ---------------------------------------------------------

function WhoWasThereBody({ card }: { card: WhoWasThereCard }) {
  // Show up to 8 to avoid cramping
  const list = card.travelers.slice(0, 8);
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: GRADIENTS.who }}
    >
      <div className="flex flex-col items-center w-full max-w-sm" style={cardInStyle}>
        <Users className="w-6 h-6 mb-3 opacity-90" />
        <p className="text-caption uppercase tracking-[0.2em] opacity-80 mb-2">
          Your crew
        </p>
        <h2
          className="font-bold text-white text-center mb-6"
          style={{ fontSize: 'clamp(24px, 6vw, 36px)', lineHeight: 1.15 }}
        >
          {card.top.name}
          <br />
          was everywhere.
        </h2>
        <div className="flex flex-col gap-2.5 w-full">
          {list.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-full pl-2 pr-4 py-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: t.color }}
              >
                {t.emoji}
              </div>
              <span className="text-body font-semibold flex-1 truncate">
                {t.name}
              </span>
              <span className="text-footnote opacity-80">
                {t.count} event{t.count === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Busiest day -----------------------------------------------------------

function BusiestDayBody({ card }: { card: BusiestDayCard }) {
  return (
    <div
      className="absolute inset-0"
      style={{ background: GRADIENTS.busiest, backgroundColor: '#000' }}
    >
      {card.heroPhoto && (
        <img
          src={card.heroPhoto}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: 0.55,
            animation: 'kenburns 8s ease-out both',
            transformOrigin: 'center center',
          }}
          draggable={false}
          aria-hidden="true"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.85) 100%)',
        }}
      />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
        style={cardInStyle}
      >
        <Calendar className="w-6 h-6 mb-3 opacity-90" />
        <p className="text-caption uppercase tracking-[0.2em] opacity-85 mb-3">
          Your busiest day
        </p>
        <h2
          className="font-bold text-white mb-4"
          style={{ fontSize: 'clamp(28px, 8vw, 48px)', lineHeight: 1.05 }}
        >
          {card.dayLabel}
        </h2>
        <div className="flex items-center gap-6 mt-2">
          <div>
            <div
              className="font-bold text-white"
              style={{ fontSize: 'clamp(30px, 9vw, 44px)', lineHeight: 1 }}
            >
              {card.eventCount}
            </div>
            <div className="text-caption uppercase tracking-widest opacity-75">
              Events
            </div>
          </div>
          <div className="w-px h-10 bg-white/30" />
          <div>
            <div
              className="font-bold text-white"
              style={{ fontSize: 'clamp(30px, 9vw, 44px)', lineHeight: 1 }}
            >
              {card.photoCount}
            </div>
            <div className="text-caption uppercase tracking-widest opacity-75">
              Photos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Closer ----------------------------------------------------------------

function CloserBody({ card, onShare }: { card: CloserCard; onShare: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      style={{ background: GRADIENTS.closer }}
    >
      <div className="flex flex-col items-center" style={cardInStyle}>
        <Camera className="w-8 h-8 mb-4 opacity-80" />
        <p className="text-caption uppercase tracking-[0.2em] opacity-80">
          Thank you
        </p>
        <h2
          className="mt-2 font-bold text-white"
          style={{ fontSize: 'clamp(32px, 9vw, 52px)', lineHeight: 1.05 }}
        >
          Until the next
          <br />
          cruise.
        </h2>
        <p className="mt-6 text-subhead opacity-80 max-w-xs">
          {card.totalPhotos > 0
            ? `${card.totalPhotos} memor${card.totalPhotos === 1 ? 'y' : 'ies'} saved forever aboard the ${card.shipName}.`
            : `Your ${card.shipName} story is ready whenever you are.`}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void onShare();
          }}
          className="mt-10 flex items-center gap-2 px-6 py-3 rounded-full press"
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Share2 className="w-4 h-4" />
          <span className="text-callout font-semibold">Share your story</span>
        </button>
      </div>
    </div>
  );
}
