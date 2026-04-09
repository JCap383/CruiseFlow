import { useMemo } from 'react';
import { format, parse, differenceInDays } from 'date-fns';
import { X, Printer } from 'lucide-react';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useCruise } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';
import { CATEGORY_CONFIG } from '@/types';
import type { CruiseEvent } from '@/types';
import { formatTimeRange } from '@/utils/time';

interface ExportPDFProps {
  onClose: () => void;
}

// Category color map for inline styles in print window
const CAT_COLORS: Record<string, string> = {
  dining: '#f59e0b',
  entertainment: '#a855f7',
  excursion: '#10b981',
  'kids-club': '#f472b6',
  reservation: '#3b82f6',
  personal: '#6366f1',
  reminder: '#ef4444',
};

export function ExportPDF({ onClose }: ExportPDFProps) {
  const events = useAllCruiseEvents();
  const members = useFamily();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const cruise = useCruise(activeCruiseId);

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
        const hasExcursion = sorted.some((e) => e.category === 'excursion');
        return { date, dayNum, isSeaDay: !hasExcursion, events: sorted };
      });
  }, [events, cruise]);

  const stats = useMemo(() => {
    const totalPhotos = events.reduce((sum, e) => sum + (e.photos?.length ?? 0), 0);
    const favorites = events.filter((e) => e.isFavorite).length;
    const uniqueDates = new Set(events.map((e) => e.date)).size;
    const excursions = events.filter((e) => e.category === 'excursion').length;
    return { events: events.length, photos: totalPhotos, favorites, days: uniqueDates, excursions };
  }, [events]);

  const dateRange = cruise?.startDate && cruise?.endDate
    ? `${format(parse(cruise.startDate, 'yyyy-MM-dd', new Date()), 'MMMM d')} - ${format(parse(cruise.endDate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}`
    : '';

  const handlePrint = () => {
    // Build newsletter HTML for each day
    const dayPages = memoryDays.map(({ date, dayNum, isSeaDay, events: dayEvents }) => {
      const dateLabel = format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d');
      const dayType = isSeaDay ? 'Sea Day' : 'Port Day';

      const eventsHtml = dayEvents.map((event) => {
        const catColor = CAT_COLORS[event.category] ?? '#6366f1';
        const eventMembers = members.filter((m) => event.memberIds.includes(m.id));
        const photos = event.photos ?? [];

        const photoGrid = photos.length > 0 ? `
          <div class="photo-grid photo-grid-${Math.min(photos.length, 3)}">
            ${photos.slice(0, 6).map((p) => `
              <div class="photo-item">
                <img src="${p.dataUrl}" alt="${p.caption || ''}" />
                ${p.caption ? `<span class="photo-cap">${p.caption}</span>` : ''}
              </div>
            `).join('')}
            ${photos.length > 6 ? `<div class="photo-more">+${photos.length - 6} more</div>` : ''}
          </div>
        ` : '';

        return `
          <div class="event-card">
            <div class="event-accent" style="background:${catColor}"></div>
            <div class="event-body">
              <div class="event-header">
                <div class="event-cat" style="color:${catColor}">${CATEGORY_CONFIG[event.category].label}</div>
                <div class="event-time">${formatTimeRange(event.startTime, event.endTime)}</div>
              </div>
              <h3 class="event-title">
                ${event.isFavorite ? '<span class="fav-star">&#9733;</span>' : ''}
                ${event.title}
                ${event.mood ? `<span class="mood">${event.mood}</span>` : ''}
              </h3>
              ${event.venue ? `<div class="event-venue">${event.venue}${event.deck != null ? ` &middot; Deck ${event.deck}` : ''}</div>` : ''}
              ${eventMembers.length > 0 ? `
                <div class="event-crew">
                  ${eventMembers.map((m) => `<span class="crew-chip" style="background:${m.color}20;color:${m.color};border:1px solid ${m.color}40">${m.emoji} ${m.name}</span>`).join('')}
                </div>
              ` : ''}
              ${event.notes ? `<div class="event-notes">${event.notes}</div>` : ''}
              ${photoGrid}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="day-section">
          <div class="day-banner">
            <div class="day-badge">${dayNum ? `Day ${dayNum}` : dateLabel}</div>
            <div class="day-type">${dayType}</div>
          </div>
          <h2 class="day-date">${dateLabel}</h2>
          ${eventsHtml}
        </div>
      `;
    }).join('<div class="page-break"></div>');

    const html = `<!DOCTYPE html>
<html>
<head>
<title>${cruise?.name ?? 'Cruise'} - Travel Journal</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a2e; background: #fff; }

  /* ===== COVER PAGE ===== */
  .cover {
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 50%, #38bdf8 100%);
    color: white; text-align: center; padding: 60px 40px;
    position: relative; overflow: hidden;
  }
  .cover::before {
    content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
    background: radial-gradient(circle at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(circle at 70% 30%, rgba(255,255,255,0.05) 0%, transparent 40%);
  }
  .cover-inner { position: relative; z-index: 1; }
  .cover-icon { font-size: 48px; margin-bottom: 16px; }
  .cover h1 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 52px; font-weight: 900; letter-spacing: -1px;
    line-height: 1.1; margin-bottom: 8px;
  }
  .cover .ship-name {
    font-size: 18px; font-weight: 300; opacity: 0.85;
    letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px;
  }
  .cover .date-range {
    font-size: 16px; opacity: 0.7; font-weight: 300;
  }
  .cover .divider {
    width: 60px; height: 3px; background: rgba(255,255,255,0.4);
    margin: 28px auto; border-radius: 2px;
  }
  .cover .stats-row {
    display: flex; justify-content: center; gap: 40px; margin-top: 8px;
  }
  .cover .stat { text-align: center; }
  .cover .stat-val { font-size: 36px; font-weight: 700; display: block; }
  .cover .stat-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.7; }

  .cover .tagline {
    margin-top: 32px; font-size: 13px; opacity: 0.5;
    font-style: italic; letter-spacing: 1px;
  }

  /* ===== GENERAL ===== */
  .page-break { page-break-before: always; }

  /* ===== DAY SECTIONS ===== */
  .day-section { padding: 40px 36px 20px; }
  .day-banner {
    display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
  }
  .day-badge {
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white; font-size: 11px; font-weight: 600;
    padding: 4px 14px; border-radius: 20px;
    text-transform: uppercase; letter-spacing: 1.5px;
  }
  .day-type {
    font-size: 11px; color: #94a3b8; text-transform: uppercase;
    letter-spacing: 1.5px; font-weight: 500;
  }
  .day-date {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28px; font-weight: 700; color: #0c4a6e;
    margin-bottom: 24px; padding-bottom: 16px;
    border-bottom: 2px solid #e2e8f0;
  }

  /* ===== EVENT CARDS ===== */
  .event-card {
    display: flex; gap: 0; margin-bottom: 24px;
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
    border: 1px solid #f1f5f9;
    page-break-inside: avoid;
  }
  .event-accent { width: 5px; flex-shrink: 0; }
  .event-body { flex: 1; padding: 16px 20px; }
  .event-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .event-cat { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .event-time { font-size: 12px; color: #94a3b8; }
  .event-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 20px; font-weight: 700; color: #1e293b;
    margin-bottom: 4px; line-height: 1.3;
  }
  .fav-star { color: #f59e0b; margin-right: 4px; }
  .mood { font-size: 18px; margin-left: 6px; }
  .event-venue { font-size: 13px; color: #64748b; margin-bottom: 8px; }
  .event-crew { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .crew-chip {
    font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 500;
  }
  .event-notes {
    font-size: 14px; line-height: 1.6; color: #475569;
    padding: 12px 16px; background: #f8fafc;
    border-radius: 8px; border-left: 3px solid #e2e8f0;
    margin-top: 8px; margin-bottom: 8px;
    white-space: pre-wrap; font-style: italic;
  }

  /* ===== PHOTO GRIDS ===== */
  .photo-grid {
    display: grid; gap: 8px; margin-top: 12px;
  }
  .photo-grid-1 { grid-template-columns: 1fr; }
  .photo-grid-2 { grid-template-columns: 1fr 1fr; }
  .photo-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .photo-item { position: relative; border-radius: 8px; overflow: hidden; }
  .photo-item img {
    width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block;
    border-radius: 8px;
  }
  .photo-grid-1 .photo-item img { aspect-ratio: 16/9; }
  .photo-cap {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    color: white; font-size: 11px; padding: 16px 10px 6px;
  }
  .photo-more {
    display: flex; align-items: center; justify-content: center;
    background: #f1f5f9; border-radius: 8px; color: #94a3b8;
    font-size: 13px; font-weight: 500;
  }

  /* ===== FOOTER ===== */
  .journal-footer {
    text-align: center; padding: 40px 20px;
    border-top: 1px solid #e2e8f0; margin-top: 20px;
    color: #94a3b8; font-size: 11px;
  }
  .journal-footer .brand {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 14px; color: #64748b; font-weight: 600;
    margin-bottom: 4px;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cover { min-height: auto; padding: 80px 40px; }
    .event-card { break-inside: avoid; }
    .page-break { break-before: page; }
  }
</style>
</head>
<body>
  <!-- Cover -->
  <div class="cover">
    <div class="cover-inner">
      <div class="cover-icon">&#9875;</div>
      <h1>${cruise?.name ?? 'My Cruise'}</h1>
      ${cruise?.shipName ? `<div class="ship-name">${cruise.shipName}</div>` : ''}
      ${dateRange ? `<div class="date-range">${dateRange}</div>` : ''}
      <div class="divider"></div>
      <div class="stats-row">
        <div class="stat"><span class="stat-val">${stats.days}</span><span class="stat-lbl">Days</span></div>
        <div class="stat"><span class="stat-val">${stats.events}</span><span class="stat-lbl">Events</span></div>
        <div class="stat"><span class="stat-val">${stats.photos}</span><span class="stat-lbl">Photos</span></div>
        <div class="stat"><span class="stat-val">${stats.favorites}</span><span class="stat-lbl">Favorites</span></div>
      </div>
      <div class="tagline">A CruiseFlow Travel Journal</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Day Pages -->
  ${dayPages}

  <!-- Footer -->
  <div class="journal-footer">
    <div class="brand">CruiseFlow</div>
    <div>Created with CruiseFlow &middot; Your Cruise Command Center</div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-cruise-bg flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-cruise-border bg-cruise-bg">
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

      {/* Newsletter Preview */}
      <div className="flex-1 overflow-y-auto">
        {/* Cover Preview */}
        <div className="bg-gradient-to-br from-ocean-800 via-ocean-500 to-ocean-400 text-white text-center py-12 px-6 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-4xl mb-3">&#9875;</p>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ fontFamily: 'Georgia, serif' }}>
              {cruise?.name ?? 'My Cruise'}
            </h1>
            {cruise?.shipName && (
              <p className="text-xs tracking-[3px] uppercase opacity-80 mb-1">{cruise.shipName}</p>
            )}
            {dateRange && <p className="text-sm opacity-60">{dateRange}</p>}

            <div className="w-12 h-0.5 bg-white/30 mx-auto my-5 rounded" />

            <div className="flex justify-center gap-8">
              {[
                { val: stats.days, lbl: 'Days' },
                { val: stats.events, lbl: 'Events' },
                { val: stats.photos, lbl: 'Photos' },
                { val: stats.favorites, lbl: 'Favorites' },
              ].map(({ val, lbl }) => (
                <div key={lbl} className="text-center">
                  <p className="text-2xl font-bold">{val}</p>
                  <p className="text-[9px] uppercase tracking-[2px] opacity-60">{lbl}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] italic opacity-40 mt-6 tracking-wider">A CruiseFlow Travel Journal</p>
          </div>
        </div>

        {/* Day Previews */}
        {memoryDays.map(({ date, dayNum, isSeaDay, events: dayEvents }) => (
          <div key={date} className="px-4 py-6 border-t border-cruise-border">
            {/* Day header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold tracking-[1.5px] uppercase bg-ocean-500 text-white px-3 py-1 rounded-full">
                {dayNum ? `Day ${dayNum}` : format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM d')}
              </span>
              <span className="text-[10px] text-cruise-muted uppercase tracking-[1.5px]">
                {isSeaDay ? 'Sea Day' : 'Port Day'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-ocean-300 mb-4 pb-3 border-b border-cruise-border" style={{ fontFamily: 'Georgia, serif' }}>
              {format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d')}
            </h2>

            {/* Event cards */}
            <div className="flex flex-col gap-4">
              {dayEvents.map((event) => {
                const config = CATEGORY_CONFIG[event.category];
                const eventMembers = members.filter((m) => event.memberIds.includes(m.id));
                const photos = event.photos ?? [];

                return (
                  <div key={event.id} className="flex rounded-xl overflow-hidden border border-cruise-border shadow-sm">
                    <div className="w-1.5 shrink-0" style={{ backgroundColor: config.color }} />
                    <div className="flex-1 p-3 bg-cruise-card">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>
                          {config.label}
                        </span>
                        <span className="text-[10px] text-cruise-muted">
                          {formatTimeRange(event.startTime, event.endTime)}
                        </span>
                      </div>
                      <h3 className="font-bold text-cruise-text" style={{ fontFamily: 'Georgia, serif' }}>
                        {event.isFavorite && <span className="text-amber-400 mr-1">&#9733;</span>}
                        {event.title}
                        {event.mood && <span className="ml-1.5 text-sm">{event.mood}</span>}
                      </h3>
                      {event.venue && (
                        <p className="text-xs text-cruise-muted mt-0.5">
                          {event.venue}{event.deck != null && ` · Deck ${event.deck}`}
                        </p>
                      )}
                      {eventMembers.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {eventMembers.map((m) => (
                            <span
                              key={m.id}
                              className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${m.color}20`, color: m.color, border: `1px solid ${m.color}40` }}
                            >
                              {m.emoji} {m.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {event.notes && (
                        <p className="text-xs text-cruise-muted/80 mt-2 p-2 bg-cruise-surface rounded-lg border-l-2 border-cruise-border italic whitespace-pre-wrap">
                          {event.notes}
                        </p>
                      )}
                      {photos.length > 0 && (
                        <div className={`grid gap-1.5 mt-2 ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {photos.slice(0, 6).map((photo) => (
                            <div key={photo.id} className="relative rounded-lg overflow-hidden">
                              <img
                                src={photo.dataUrl}
                                alt={photo.caption || ''}
                                className={`w-full object-cover rounded-lg ${photos.length === 1 ? 'aspect-video' : 'aspect-[4/3]'}`}
                              />
                              {photo.caption && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-1">
                                  <p className="text-[9px] text-white/90">{photo.caption}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="text-center py-8 border-t border-cruise-border">
          <p className="text-sm text-cruise-muted/60" style={{ fontFamily: 'Georgia, serif' }}>CruiseFlow</p>
          <p className="text-[10px] text-cruise-muted/40 mt-1">Your Cruise Command Center</p>
        </div>
      </div>
    </div>
  );
}
