import { useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { ArrowRight, Camera } from 'lucide-react';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useCruise } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import type { EventPhoto } from '@/types';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';

/**
 * Shows side-by-side comparison of first day vs last day photos
 */
export function BeforeAfter() {
  const events = useAllCruiseEvents();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const cruise = useCruise(activeCruiseId);
  const [lightboxPhotos, setLightboxPhotos] = useState<EventPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const { firstDayPhotos, lastDayPhotos, firstDate, lastDate } = useMemo(() => {
    if (!cruise?.startDate || !cruise?.endDate || events.length === 0) {
      return { firstDayPhotos: [], lastDayPhotos: [], firstDate: null, lastDate: null };
    }

    // Get all unique dates that have photos
    const datesWithPhotos = [...new Set(
      events
        .filter((e) => e.photos && e.photos.length > 0)
        .map((e) => e.date),
    )].sort();

    if (datesWithPhotos.length < 2) {
      return { firstDayPhotos: [], lastDayPhotos: [], firstDate: null, lastDate: null };
    }

    const firstDate = datesWithPhotos[0]!;
    const lastDate = datesWithPhotos[datesWithPhotos.length - 1]!;

    // Must be different dates
    if (firstDate === lastDate) {
      return { firstDayPhotos: [], lastDayPhotos: [], firstDate: null, lastDate: null };
    }

    const firstDayPhotos = events
      .filter((e) => e.date === firstDate)
      .flatMap((e) => e.photos ?? []);

    const lastDayPhotos = events
      .filter((e) => e.date === lastDate)
      .flatMap((e) => e.photos ?? []);

    return { firstDayPhotos, lastDayPhotos, firstDate, lastDate };
  }, [events, cruise]);

  if (firstDayPhotos.length === 0 || lastDayPhotos.length === 0) {
    return null;
  }

  const openLightbox = (photos: EventPhoto[], idx: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(idx);
  };

  return (
    <div className="mx-4 mt-3">
      <h3 className="text-sm font-bold text-cruise-text flex items-center gap-1.5 mb-3">
        <Camera className="w-4 h-4 text-ocean-400" />
        Before & After
      </h3>

      <div className="flex gap-2 items-stretch">
        {/* First day */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-cruise-muted text-center mb-1.5 font-medium uppercase tracking-wider">
            Day 1
          </p>
          {firstDate && (
            <p className="text-[10px] text-cruise-muted/60 text-center mb-1.5">
              {format(parse(firstDate, 'yyyy-MM-dd', new Date()), 'MMM d')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1">
            {firstDayPhotos.slice(0, 4).map((photo, idx) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(firstDayPhotos, idx)}
                className="aspect-square rounded-lg overflow-hidden bg-cruise-surface"
              >
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || 'First day'}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          {firstDayPhotos.length > 4 && (
            <p className="text-[10px] text-cruise-muted text-center mt-1">
              +{firstDayPhotos.length - 4} more
            </p>
          )}
        </div>

        {/* Arrow divider */}
        <div className="flex items-center shrink-0 px-1">
          <ArrowRight className="w-5 h-5 text-ocean-400/50" />
        </div>

        {/* Last day */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-cruise-muted text-center mb-1.5 font-medium uppercase tracking-wider">
            Last Day
          </p>
          {lastDate && (
            <p className="text-[10px] text-cruise-muted/60 text-center mb-1.5">
              {format(parse(lastDate, 'yyyy-MM-dd', new Date()), 'MMM d')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-1">
            {lastDayPhotos.slice(0, 4).map((photo, idx) => (
              <button
                key={photo.id}
                onClick={() => openLightbox(lastDayPhotos, idx)}
                className="aspect-square rounded-lg overflow-hidden bg-cruise-surface"
              >
                <img
                  src={photo.dataUrl}
                  alt={photo.caption || 'Last day'}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
          {lastDayPhotos.length > 4 && (
            <p className="text-[10px] text-cruise-muted text-center mt-1">
              +{lastDayPhotos.length - 4} more
            </p>
          )}
        </div>
      </div>

      {lightboxIndex >= 0 && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
        />
      )}
    </div>
  );
}
