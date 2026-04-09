import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { Camera, Clock, MapPin } from 'lucide-react';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { CATEGORY_CONFIG } from '@/types';
import type { EventPhoto } from '@/types';
import { formatTimeRange } from '@/utils/time';
import { MemberChip } from '@/components/family/MemberAvatar';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';

export function Memories() {
  const navigate = useNavigate();
  const events = useAllCruiseEvents();
  const members = useFamily();
  const [lightboxPhotos, setLightboxPhotos] = useState<EventPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  // Get events that have notes or photos, grouped by date, sorted chronologically
  const memoryDays = useMemo(() => {
    const withContent = events.filter(
      (e) => (e.photos && e.photos.length > 0) || e.notes,
    );

    // Group by date
    const byDate = new Map<string, typeof withContent>();
    for (const e of withContent) {
      const existing = byDate.get(e.date) ?? [];
      existing.push(e);
      byDate.set(e.date, existing);
    }

    // Sort dates, then sort events within each date by time
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayEvents]) => ({
        date,
        label: format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d'),
        events: dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }));
  }, [events]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-2 pb-2 border-b border-cruise-border">
        <h1 className="text-lg font-bold">Memories</h1>
        <p className="text-xs text-cruise-muted mt-0.5">
          Your cruise journal
        </p>
      </div>

      {memoryDays.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ocean-500/10 mb-4">
            <Camera className="w-7 h-7 text-ocean-400" />
          </div>
          <p className="text-cruise-muted font-medium">No memories yet</p>
          <p className="text-cruise-muted/60 text-xs mt-1">
            Add photos and notes to your events to start building your cruise journal
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {memoryDays.map(({ date, label, events: dayEvents }) => (
            <div key={date}>
              {/* Day header */}
              <div className="sticky top-0 bg-cruise-bg/95 backdrop-blur-md z-10 px-4 py-2 border-b border-cruise-border">
                <span className="text-sm font-medium text-ocean-300">
                  {label}
                </span>
              </div>

              {/* Events for this day */}
              <div className="flex flex-col gap-4 p-4">
                {dayEvents.map((event) => {
                  const config = CATEGORY_CONFIG[event.category];
                  const assignedMembers = members.filter((m) =>
                    event.memberIds.includes(m.id),
                  );
                  const photos = event.photos ?? [];

                  return (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/event/${event.id}`)}
                      className="w-full text-left"
                    >
                      <div className="flex gap-3">
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center pt-1.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: config.color }}
                          />
                          <div className="w-0.5 flex-1 bg-cruise-border mt-1" />
                        </div>

                        <div className="flex-1 min-w-0 pb-4">
                          {/* Event title & time */}
                          <h3 className="font-semibold text-cruise-text">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-cruise-muted">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimeRange(event.startTime, event.endTime)}
                            </span>
                            {event.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.venue}
                              </span>
                            )}
                          </div>

                          {/* Members */}
                          {assignedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {assignedMembers.map((m) => (
                                <MemberChip key={m.id} member={m} />
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {event.notes && (
                            <p className="text-sm text-cruise-text/80 mt-2 bg-cruise-card rounded-xl p-3 border border-cruise-border whitespace-pre-wrap">
                              {event.notes}
                            </p>
                          )}

                          {/* Photos grid */}
                          {photos.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5 mt-2">
                              {photos.map((photo, photoIdx) => (
                                <div
                                  key={photo.id}
                                  role="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxPhotos(photos);
                                    setLightboxIndex(photoIdx);
                                  }}
                                  className="aspect-square rounded-lg overflow-hidden bg-cruise-surface"
                                >
                                  <img
                                    src={photo.dataUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
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
        />
      )}
    </div>
  );
}
