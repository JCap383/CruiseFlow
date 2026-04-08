import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, AlertTriangle, CheckCircle, Camera } from 'lucide-react';
import type { CruiseEvent, FamilyMember } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { formatTimeRange, isCurrentlyActive, isPast } from '@/utils/time';
import { MemberChip } from '@/components/family/MemberAvatar';

interface EventCardProps {
  event: CruiseEvent;
  members: FamilyMember[];
  hasConflict?: boolean;
}

export function EventCard({ event, members, hasConflict }: EventCardProps) {
  const navigate = useNavigate();
  const config = CATEGORY_CONFIG[event.category];
  const active = isCurrentlyActive(event.date, event.startTime, event.endTime);
  const past = isPast(event.date, event.endTime);
  const assignedMembers = members.filter((m) =>
    event.memberIds.includes(m.id),
  );
  const photoCount = event.photos?.length ?? 0;

  return (
    <button
      onClick={() => navigate(`/event/${event.id}`)}
      className={`w-full text-left rounded-2xl p-4 transition-colors active:scale-[0.98] ${
        active
          ? 'bg-ocean-500/15 border border-ocean-500/40'
          : past
            ? 'bg-cruise-card/50 border border-cruise-border/50 opacity-60'
            : 'bg-cruise-card border border-cruise-border'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Category color bar */}
        <div
          className={`w-1 self-stretch rounded-full shrink-0 mt-0.5 ${past ? 'opacity-50' : ''}`}
          style={{ backgroundColor: config.color }}
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-semibold truncate ${past ? 'text-cruise-muted line-through decoration-cruise-muted/30' : 'text-cruise-text'}`}>
              {event.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              {photoCount > 0 && (
                <Camera className="w-3.5 h-3.5 text-ocean-400" />
              )}
              {hasConflict && (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              {past && (
                <CheckCircle className="w-4 h-4 text-emerald-500/60" />
              )}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 mt-1 text-sm text-cruise-muted">
            <Clock className="w-3.5 h-3.5" />
            {formatTimeRange(event.startTime, event.endTime)}
          </div>

          {/* Venue */}
          {event.venue && (
            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-cruise-muted">
              <MapPin className="w-3.5 h-3.5" />
              {event.venue}
              {event.deck != null && (
                <span className="text-xs opacity-60">Deck {event.deck}</span>
              )}
            </div>
          )}

          {/* Members */}
          {assignedMembers.length > 0 && !past && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {assignedMembers.map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          )}

          {/* Active badge */}
          {active && (
            <div className="mt-2">
              <span className="text-xs font-medium text-ocean-400 bg-ocean-400/10 px-2 py-0.5 rounded-full">
                Happening now
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
