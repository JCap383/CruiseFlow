import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse, differenceInDays } from 'date-fns';
import {
  Camera, Clock, MapPin, Star, Filter, Image, FileText,
  Anchor, Share2, FileDown, Navigation,
} from 'lucide-react';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useCruise, updateCruise } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import { CATEGORY_CONFIG } from '@/types';
import type { EventPhoto, CruiseEvent } from '@/types';
import { formatTimeRange } from '@/utils/time';
import { MemberChip } from '@/components/family/MemberAvatar';
import { PhotoLightbox } from '@/components/ui/PhotoLightbox';
import { updateEvent } from '@/hooks/useEvents';
import { ExportPDF } from '@/components/memories/ExportPDF';
import { MapView } from '@/components/memories/MapView';
import { BeforeAfter } from '@/components/memories/BeforeAfter';

export function Memories() {
  const navigate = useNavigate();
  const events = useAllCruiseEvents();
  const members = useFamily();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const cruise = useCruise(activeCruiseId);
  const [lightboxPhotos, setLightboxPhotos] = useState<EventPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportPDF, setShowExportPDF] = useState(false);
  const [showMapView, setShowMapView] = useState(false);

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

  // Group events with content by date
  const memoryDays = useMemo(() => {
    const withContent = filteredEvents.filter(
      (e) => (e.photos && e.photos.length > 0) || e.notes || e.isFavorite || e.mood,
    );

    const byDate = new Map<string, CruiseEvent[]>();
    for (const e of withContent) {
      const existing = byDate.get(e.date) ?? [];
      existing.push(e);
      byDate.set(e.date, existing);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayEvents]) => {
        const sorted = dayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));
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
  }, [filteredEvents, cruise]);

  const handleSetCoverPhoto = async (date: string, dataUrl: string) => {
    if (!activeCruiseId || !cruise) return;
    await updateCruise(activeCruiseId, {
      coverPhotos: { ...cruise.coverPhotos, [date]: dataUrl },
    });
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
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-2 pb-2 border-b border-cruise-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Memories</h1>
            <p className="text-xs text-cruise-muted mt-0.5">Your cruise journal</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMapView(true)}
              className="p-2 text-cruise-muted"
              title="Port Map"
            >
              <Navigation className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowExportPDF(true)}
              className="p-2 text-cruise-muted"
              title="Export PDF"
            >
              <FileDown className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg ${showFilters ? 'text-ocean-400 bg-ocean-400/10' : 'text-cruise-muted'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
            <button onClick={handleShareTrip} className="p-2 text-cruise-muted">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Member filter */}
        {showFilters && members.length > 0 && (
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterMemberId(null)}
              className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap ${
                !filterMemberId ? 'bg-ocean-500 text-white border-ocean-500' : 'border-cruise-border text-cruise-muted'
              }`}
            >
              All
            </button>
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setFilterMemberId(filterMemberId === m.id ? null : m.id)}
                className={`text-xs px-3 py-1.5 rounded-full border whitespace-nowrap flex items-center gap-1 ${
                  filterMemberId === m.id ? 'bg-ocean-500 text-white border-ocean-500' : 'border-cruise-border text-cruise-muted'
                }`}
              >
                <span>{m.emoji}</span> {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trip Summary Card */}
      {stats.events > 0 && (
        <div className="mx-4 mt-3 p-4 bg-gradient-to-br from-ocean-500/20 to-ocean-700/10 rounded-2xl border border-ocean-500/20">
          <h2 className="text-sm font-bold text-ocean-300 mb-3 flex items-center gap-1.5">
            <Anchor className="w-4 h-4" />
            Trip Summary
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-cruise-text">{stats.days}</p>
              <p className="text-[10px] text-cruise-muted">Days</p>
            </div>
            <div>
              <p className="text-lg font-bold text-cruise-text">{stats.events}</p>
              <p className="text-[10px] text-cruise-muted">Events</p>
            </div>
            <div>
              <p className="text-lg font-bold text-cruise-text">{stats.photos}</p>
              <p className="text-[10px] text-cruise-muted">Photos</p>
            </div>
            <div>
              <p className="text-lg font-bold text-cruise-text">{stats.favorites}</p>
              <p className="text-[10px] text-cruise-muted">Favorites</p>
            </div>
          </div>
        </div>
      )}

      {/* Before & After comparison */}
      <BeforeAfter />

      {memoryDays.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ocean-500/10 mb-4">
            <Camera className="w-7 h-7 text-ocean-400" />
          </div>
          <p className="text-cruise-muted font-medium">No memories yet</p>
          <p className="text-cruise-muted/60 text-xs mt-1">
            Add photos, notes, or ratings to your events to start building your cruise journal
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {memoryDays.map(({ date, label, dayNum, isSeaDay, events: dayEvents, photoCount, coverPhoto }) => (
            <div key={date}>
              {/* Day header with cover photo */}
              <div className="relative">
                {coverPhoto && (
                  <div className="h-32 overflow-hidden">
                    <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 h-32 bg-gradient-to-b from-black/30 via-transparent to-cruise-bg" />
                  </div>
                )}
                <div className={`px-4 py-2 ${coverPhoto ? 'absolute bottom-0 left-0 right-0' : 'border-b border-cruise-border bg-cruise-bg/95 backdrop-blur-md'} z-10`}>
                  <div className="flex items-center justify-between">
                    <div>
                      {dayNum && (
                        <span className="text-xs font-bold text-ocean-400">
                          DAY {dayNum} {isSeaDay ? '· Sea Day' : '· Port Day'}
                        </span>
                      )}
                      <p className="text-sm font-medium text-cruise-text">{label}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-cruise-muted">
                      {photoCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Image className="w-3 h-3" /> {photoCount}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <FileText className="w-3 h-3" /> {dayEvents.length}
                      </span>
                    </div>
                  </div>
                </div>
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
                          {/* Event title & meta */}
                          <div className="flex items-center gap-1.5">
                            {event.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                            <h3 className="font-semibold text-cruise-text truncate">
                              {event.title}
                            </h3>
                            {event.mood && <span className="text-sm shrink-0">{event.mood}</span>}
                          </div>
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
                                  className="aspect-square rounded-lg overflow-hidden bg-cruise-surface relative group"
                                >
                                  <img
                                    src={photo.dataUrl}
                                    alt={photo.caption || ''}
                                    className="w-full h-full object-cover"
                                  />
                                  {/* Set as cover photo */}
                                  <button
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      handleSetCoverPhoto(event.date, photo.dataUrl);
                                    }}
                                    className="absolute bottom-0.5 left-0.5 text-[8px] bg-black/60 text-white/80 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Cover
                                  </button>
                                  {photo.caption && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
                                      <p className="text-[9px] text-white/90 truncate">{photo.caption}</p>
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
            // Find which event this photo belongs to and update it
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
      {showExportPDF && <ExportPDF onClose={() => setShowExportPDF(false)} />}
      {showMapView && <MapView onClose={() => setShowMapView(false)} />}
    </div>
  );
}
