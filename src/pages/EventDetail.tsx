import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useEvent, useEventsForDay, deleteEvent } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';
import { useEventConflicts } from '@/hooks/useConflicts';
import { CATEGORY_CONFIG } from '@/types';
import { formatTimeRange } from '@/utils/time';
import { MemberChip } from '@/components/family/MemberAvatar';
import { Button } from '@/components/ui/Button';

export function EventDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const event = useEvent(id);
  const members = useFamily();
  const dayEvents = useEventsForDay(event?.date);
  const conflicts = useEventConflicts(id ?? '', dayEvents);

  if (!event) {
    return (
      <div className="p-6 text-center text-cruise-muted">
        Event not found
      </div>
    );
  }

  const config = CATEGORY_CONFIG[event.category];
  const assignedMembers = members.filter((m) =>
    event.memberIds.includes(m.id),
  );

  const handleDelete = async () => {
    await deleteEvent(event.id);
    navigate(-1);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-cruise-border">
        <button onClick={() => navigate(-1)} className="text-cruise-muted p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Event Details</h1>
        <button
          onClick={() => navigate(`/event/${event.id}/edit`)}
          className="text-ocean-400 p-1"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>

        <h2 className="text-xl font-bold">{event.title}</h2>

        {/* Time */}
        <div className="flex items-center gap-2 text-cruise-muted">
          <Clock className="w-4 h-4" />
          <span>{formatTimeRange(event.startTime, event.endTime)}</span>
        </div>

        {/* Venue */}
        {event.venue && (
          <div className="flex items-center gap-2 text-cruise-muted">
            <MapPin className="w-4 h-4" />
            <span>
              {event.venue}
              {event.deck != null && ` · Deck ${event.deck}`}
            </span>
          </div>
        )}

        {/* Members */}
        {assignedMembers.length > 0 && (
          <div>
            <span className="text-sm text-cruise-muted block mb-2">
              Attendees
            </span>
            <div className="flex flex-wrap gap-2">
              {assignedMembers.map((m) => (
                <MemberChip key={m.id} member={m} />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <div>
            <span className="text-sm text-cruise-muted block mb-1">Notes</span>
            <p className="text-cruise-text bg-cruise-card rounded-xl p-3 border border-cruise-border">
              {event.notes}
            </p>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">
                Schedule Conflict
              </span>
            </div>
            {conflicts.map((c, i) => {
              const other =
                c.eventA.id === event.id ? c.eventB : c.eventA;
              const conflictMembers = members.filter((m) =>
                c.memberIds.includes(m.id),
              );
              return (
                <p key={i} className="text-sm text-amber-200/80 mt-1">
                  Overlaps with "{other.title}" for{' '}
                  {conflictMembers.map((m) => m.name).join(', ')}
                </p>
              );
            })}
          </div>
        )}

        {/* Delete button */}
        <Button variant="danger" onClick={handleDelete} className="mt-4">
          <span className="flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Event
          </span>
        </Button>
      </div>
    </div>
  );
}
