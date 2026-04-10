import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, AlertTriangle, CheckCircle, Camera, Timer, Star } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { CruiseEvent, FamilyMember } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { formatTimeRange, isCurrentlyActive, isPast, formatTime } from '@/utils/time';
import { MemberChip } from '@/components/family/MemberAvatar';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { haptics } from '@/utils/haptics';
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

  const ariaLabel = [
    event.title,
    formatTimeRange(event.startTime, event.endTime),
    event.venue ? `at ${event.venue}` : '',
    hasConflict ? '. Schedule conflict' : '',
    active ? '. Happening now' : '',
    past ? '. Completed' : '',
  ].filter(Boolean).join(', ');

  const cardStyle: CSSProperties = hasConflict
    ? {
        backgroundColor: 'var(--warning-soft)',
        border: '1.5px solid var(--warning)',
        boxShadow: '0 0 0 3px color-mix(in srgb, var(--warning) 14%, transparent)',
      }
    : active
      ? {
          backgroundColor: 'var(--accent-soft)',
          border: '1.5px solid var(--accent)',
        }
      : past
        ? {
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            opacity: 0.72,
          }
        : {
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
          };

  return (
    <button
      onClick={() => {
        void haptics.tap();
        navigate(`/event/${event.id}`);
      }}
      aria-label={ariaLabel}
      className="w-full text-left rounded-2xl p-4 press"
      style={cardStyle}
    >
      <div className="flex items-start gap-3">
        {/* Category color bar */}
        <div
          className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: config.color, opacity: past ? 0.5 : 1 }}
          aria-hidden="true"
        />

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              {event.isFavorite && (
                <Star className="w-4 h-4 shrink-0" style={{ color: 'var(--warning)', fill: 'var(--warning)' }} aria-hidden="true" />
              )}
              <Text
                variant="headline"
                as="h3"
                truncate
                tone={past ? 'muted' : 'default'}
                className={past ? 'line-through' : ''}
              >
                {event.title}
              </Text>
              {event.mood && <span className="text-body shrink-0">{event.mood}</span>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {photoCount > 0 && (
                <Camera className="w-4 h-4" style={{ color: 'var(--accent)' }} aria-label={`${photoCount} photos`} />
              )}
              {hasConflict && (
                <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} aria-hidden="true" />
              )}
              {past && (
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--success)' }} aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Time row */}
          <div className="flex items-center gap-1.5 mt-1.5 text-subhead" style={{ color: 'var(--fg-muted)' }}>
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{formatTimeRange(event.startTime, event.endTime)}</span>
          </div>

          {/* Venue */}
          {event.venue && (
            <div className="flex items-center gap-1.5 mt-0.5 text-subhead" style={{ color: 'var(--fg-muted)' }}>
              <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{event.venue}</span>
              {event.deck != null && (
                <span className="text-caption" style={{ color: 'var(--fg-subtle)' }}>
                  · Deck {event.deck}
                </span>
              )}
            </div>
          )}

          {/* Members */}
          {assignedMembers.length > 0 && !past && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {assignedMembers.map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          )}

          {/* Status badges */}
          <div className="flex flex-wrap gap-1.5 mt-2.5 empty:hidden">
            {hasConflict && (
              <Badge tone="warning" icon={<AlertTriangle className="w-3 h-3" />}>
                Schedule conflict
              </Badge>
            )}
            {active && (
              <Badge tone="accent">
                <span className="inline-flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: 'var(--accent)' }}
                    aria-hidden="true"
                  />
                  Happening now
                </span>
              </Badge>
            )}
            {!active && !past && reminder && (
              <>
                <Badge tone="warning" icon={<Timer className="w-3 h-3" />}>
                  {reminder.minutesUntil != null
                    ? `Starts in ${reminder.minutesUntil} min`
                    : 'Starting soon'}
                </Badge>
                {reminder.leaveByTime && reminder.travelMinutes && (
                  <Badge tone="neutral">
                    Leave by {formatTime(reminder.leaveByTime)} (~{reminder.travelMinutes} min)
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
