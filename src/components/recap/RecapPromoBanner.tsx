import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, parse } from 'date-fns';
import { Play, X } from 'lucide-react';
import type { Cruise } from '@/types';
import { haptics } from '@/utils/haptics';

/**
 * #96: A soft banner that invites users to watch their cruise recap
 * during the first 7 days after a trip ends. Dismissible, and the
 * dismissal is remembered per-cruise so it doesn't keep nagging.
 *
 * Intentionally renders nothing outside the promotion window, so callers
 * can mount it unconditionally.
 */

interface RecapPromoBannerProps {
  cruise: Cruise | undefined | null;
}

const DISMISS_KEY_PREFIX = 'cruiseflow:recap-dismissed:';
const PROMO_DAYS = 7;

function isDismissed(cruiseId: string): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY_PREFIX + cruiseId) === '1';
  } catch {
    return false;
  }
}

function markDismissed(cruiseId: string) {
  try {
    localStorage.setItem(DISMISS_KEY_PREFIX + cruiseId, '1');
  } catch {
    /* ignore — private mode etc. */
  }
}

export function RecapPromoBanner({ cruise }: RecapPromoBannerProps) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

  // Compute whether the banner is eligible to show. All the gating
  // lives in a memo so React doesn't thrash the DOM on every render.
  const shouldShow = useMemo(() => {
    if (!cruise) return false;
    if (hidden) return false;
    if (isDismissed(cruise.id)) return false;

    const today = new Date();
    const end = parse(cruise.endDate, 'yyyy-MM-dd', new Date());
    const daysSinceEnd = differenceInCalendarDays(today, end);

    // Show from the day the cruise ends through PROMO_DAYS after.
    return daysSinceEnd >= 0 && daysSinceEnd <= PROMO_DAYS;
  }, [cruise, hidden]);

  if (!shouldShow || !cruise) return null;

  const handlePlay = () => {
    void haptics.tap();
    navigate(`/cruise/${cruise.id}/recap`);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    markDismissed(cruise.id);
    setHidden(true);
  };

  return (
    <div className="mx-4 mt-3 animate-fade-slide-up">
      <button
        type="button"
        onClick={handlePlay}
        className="w-full press flex items-center gap-3 rounded-2xl px-4 py-3 text-left"
        style={{
          background:
            'linear-gradient(135deg, #ff8c42 0%, #e0477a 45%, #8b5cf6 100%)',
          color: '#fff',
          boxShadow: '0 10px 30px rgba(224, 71, 122, 0.28)',
        }}
        aria-label={`Play the end-of-cruise story for ${cruise.name}`}
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
        >
          <Play className="w-5 h-5" style={{ fill: '#fff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-callout font-bold">Your cruise story is ready</div>
          <div className="text-footnote opacity-90 truncate">
            Tap to relive {cruise.name}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 rounded-full shrink-0 press"
          style={{
            backgroundColor: 'rgba(0,0,0,0.25)',
            color: '#fff',
          }}
          aria-label="Dismiss recap promotion"
        >
          <X className="w-4 h-4" />
        </button>
      </button>
    </div>
  );
}
