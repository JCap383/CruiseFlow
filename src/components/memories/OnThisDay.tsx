import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse, differenceInCalendarYears } from 'date-fns';
import { Calendar, Star, Camera, ChevronRight } from 'lucide-react';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useCruise } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import { CATEGORY_CONFIG } from '@/types';
import { formatTimeRange } from '@/utils/time';

/**
 * Shows "On This Day" memories when the current date matches a past cruise date
 * (same month & day from a previous year).
 */
export function OnThisDay() {
  const navigate = useNavigate();
  const events = useAllCruiseEvents();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const cruise = useCruise(activeCruiseId);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayMonthDay = today.slice(5); // "MM-dd"

  const memories = useMemo(() => {
    if (!cruise?.endDate) return [];

    // Only show if cruise is in the past
    if (cruise.endDate >= today) return [];

    // Find events from same month-day in a previous year
    return events.filter((e) => {
      const eventMonthDay = e.date.slice(5);
      const yearsAgo = differenceInCalendarYears(
        new Date(),
        parse(e.date, 'yyyy-MM-dd', new Date()),
      );
      return eventMonthDay === todayMonthDay && yearsAgo >= 1;
    });
  }, [events, cruise, today, todayMonthDay]);

  if (memories.length === 0) return null;

  const yearsAgo = differenceInCalendarYears(
    new Date(),
    parse(memories[0]!.date, 'yyyy-MM-dd', new Date()),
  );

  return (
    <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/20 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-purple-300">
          On This Day — {yearsAgo} year{yearsAgo > 1 ? 's' : ''} ago
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {memories.slice(0, 3).map((event) => {
          const config = CATEGORY_CONFIG[event.category];
          const photoCount = event.photos?.length ?? 0;

          return (
            <button
              key={event.id}
              onClick={() => navigate(`/event/${event.id}`)}
              className="w-full text-left flex items-center gap-3 p-2 rounded-xl bg-cruise-card/50 border border-cruise-border/50"
            >
              {/* Thumbnail or category dot */}
              {event.photos?.[0] ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={event.photos[0].dataUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cruise-text truncate">
                  {event.isFavorite && (
                    <Star className="w-3 h-3 inline text-amber-400 fill-amber-400 mr-1" />
                  )}
                  {event.title}
                  {event.mood && <span className="ml-1">{event.mood}</span>}
                </p>
                <p className="text-xs text-cruise-muted">
                  {formatTimeRange(event.startTime, event.endTime)}
                  {event.venue && ` · ${event.venue}`}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {photoCount > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-cruise-muted">
                    <Camera className="w-3 h-3" /> {photoCount}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-cruise-muted/50" />
              </div>
            </button>
          );
        })}
      </div>

      {memories.length > 3 && (
        <button
          onClick={() => navigate('/memories')}
          className="text-xs text-purple-400 mt-2 w-full text-center"
        >
          +{memories.length - 3} more memories from this day
        </button>
      )}
    </div>
  );
}
