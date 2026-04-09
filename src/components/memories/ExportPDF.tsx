import { useMemo, useRef } from 'react';
import { format, parse, differenceInDays } from 'date-fns';
import { X, Printer } from 'lucide-react';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useCruise } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import { CATEGORY_CONFIG } from '@/types';
import { formatTimeRange } from '@/utils/time';
import type { CruiseEvent } from '@/types';

interface ExportPDFProps {
  onClose: () => void;
}

export function ExportPDF({ onClose }: ExportPDFProps) {
  const events = useAllCruiseEvents();
  const members = useFamily();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const cruise = useCruise(activeCruiseId);
  const printRef = useRef<HTMLDivElement>(null);

  const memoryDays = useMemo(() => {
    const withContent = events.filter(
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
        const dayNum = cruise?.startDate
          ? differenceInDays(
              parse(date, 'yyyy-MM-dd', new Date()),
              parse(cruise.startDate, 'yyyy-MM-dd', new Date()),
            ) + 1
          : null;
        return { date, dayNum, events: sorted };
      });
  }, [events, cruise]);

  const stats = useMemo(() => {
    const totalPhotos = events.reduce((sum, e) => sum + (e.photos?.length ?? 0), 0);
    const favorites = events.filter((e) => e.isFavorite).length;
    const uniqueDates = new Set(events.map((e) => e.date)).size;
    return { events: events.length, photos: totalPhotos, favorites, days: uniqueDates };
  }, [events]);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cruise?.name ?? 'Cruise'} - Memories</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 24px; }
          .cover { text-align: center; padding: 60px 20px; page-break-after: always; }
          .cover h1 { font-size: 36px; margin-bottom: 8px; }
          .cover .subtitle { font-size: 16px; color: #666; }
          .cover .stats { display: flex; justify-content: center; gap: 32px; margin-top: 24px; }
          .cover .stat { text-align: center; }
          .cover .stat-value { font-size: 28px; font-weight: bold; }
          .cover .stat-label { font-size: 12px; color: #888; }
          .day-header { font-size: 20px; font-weight: bold; margin-top: 32px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e5e5; }
          .day-num { font-size: 12px; color: #0077b6; text-transform: uppercase; font-weight: 600; }
          .event { margin-bottom: 20px; padding: 12px; border: 1px solid #eee; border-radius: 12px; page-break-inside: avoid; }
          .event-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
          .event-meta { font-size: 13px; color: #666; margin-top: 4px; }
          .event-notes { font-size: 14px; margin-top: 8px; padding: 8px 12px; background: #f8f9fa; border-radius: 8px; white-space: pre-wrap; }
          .event-members { font-size: 12px; color: #888; margin-top: 6px; }
          .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
          .photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
          .photo-caption { font-size: 10px; color: #666; text-align: center; margin-top: 2px; }
          .cat-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
          .favorite { color: #f59e0b; }
          @media print {
            body { padding: 0; }
            .event { break-inside: avoid; }
          }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-cruise-bg border-b border-cruise-border">
        <button onClick={onClose} className="text-cruise-muted p-1">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-cruise-text">Export Journal</h2>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-sm text-ocean-400 bg-ocean-400/10 px-3 py-1.5 rounded-full"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        <div ref={printRef}>
          {/* Cover page */}
          <div className="cover">
            <h1>{cruise?.name ?? 'My Cruise'}</h1>
            <p className="subtitle">
              {cruise?.shipName && `${cruise.shipName} · `}
              {cruise?.startDate &&
                format(parse(cruise.startDate, 'yyyy-MM-dd', new Date()), 'MMM d')}
              {cruise?.endDate &&
                ` - ${format(parse(cruise.endDate, 'yyyy-MM-dd', new Date()), 'MMM d, yyyy')}`}
            </p>
            <div className="stats">
              <div className="stat">
                <div className="stat-value">{stats.days}</div>
                <div className="stat-label">Days</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stats.events}</div>
                <div className="stat-label">Events</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stats.photos}</div>
                <div className="stat-label">Photos</div>
              </div>
              <div className="stat">
                <div className="stat-value">{stats.favorites}</div>
                <div className="stat-label">Favorites</div>
              </div>
            </div>
          </div>

          {/* Day pages */}
          {memoryDays.map(({ date, dayNum, events: dayEvents }) => (
            <div key={date}>
              <div className="day-header">
                {dayNum && <div className="day-num">Day {dayNum}</div>}
                {format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d, yyyy')}
              </div>

              {dayEvents.map((event) => {
                const config = CATEGORY_CONFIG[event.category];
                const eventMembers = members.filter((m) => event.memberIds.includes(m.id));
                const photos = event.photos ?? [];

                return (
                  <div key={event.id} className="event">
                    <div className="event-title">
                      <span className="cat-dot" style={{ backgroundColor: config.color }} />
                      {event.isFavorite && <span className="favorite">★</span>}
                      {event.title}
                      {event.mood && <span>{event.mood}</span>}
                    </div>
                    <div className="event-meta">
                      {formatTimeRange(event.startTime, event.endTime)}
                      {event.venue && ` · ${event.venue}`}
                      {event.deck != null && ` (Deck ${event.deck})`}
                    </div>
                    {eventMembers.length > 0 && (
                      <div className="event-members">
                        {eventMembers.map((m) => `${m.emoji} ${m.name}`).join(', ')}
                      </div>
                    )}
                    {event.notes && <div className="event-notes">{event.notes}</div>}
                    {photos.length > 0 && (
                      <div className="photos">
                        {photos.map((photo) => (
                          <div key={photo.id}>
                            <img src={photo.dataUrl} alt={photo.caption || ''} />
                            {photo.caption && (
                              <div className="photo-caption">{photo.caption}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
