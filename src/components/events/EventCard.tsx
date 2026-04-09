import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, AlertTriangle, CheckCircle, Camera, Timer, Star } from 'lucide-react';
import type { CruiseEvent, FamilyMember } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { formatTimeRange, isCurrentlyActive, isPast, formatTime } from '@/utils/time';
import { MemberChip } from '@/components/family/MemberAvatar';
import type { ReminderInfo } from '@/hooks/useReminders';

interface EventCardProps {
  event: CruiseEvent;
  members: FamilyMember[];
  hasConflict?: boolean;
  reminder?: ReminderInfo;
}

export function EventCard({ event, members, hasConflict, reminder }: EventCardProps) {
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
              {event.isFavorite && <Star className="w-3.5 h-3.5 inline text-amber-400 fill-amber-400 mr-1" />}
              {event.title}
              {event.mood && <span className="ml-1.5 text-sm">{event.mood}</span>}
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

          {/* Status badges */}
          {active && (
            <div className="mt-2">
              <span className="text-xs font-medium text-ocean-400 bg-ocean-400/10 px-2 py-0.5 rounded-full">
                Happening now
              </span>
            </div>
          )}
          {!active && !past && reminder && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full">
                <Timer className="w-3 h-3" />
                {reminder.minutesUntil != null
                  ? `Starts in ${reminder.minutesUntil} min`
                  : 'Starting soon'}
              </span>
              {reminder.leaveByTime && reminder.travelMinutes && (
                <span className="text-xs text-cruise-muted">
                  Leave by {formatTime(reminder.leaveByTime)} (~{reminder.travelMinutes} min travel)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
