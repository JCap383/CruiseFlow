import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { Plus, Clock, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { useEventsForDay } from '@/hooks/useEvents';
import { useAppStore } from '@/stores/appStore';
import { MemberAvatar } from '@/components/family/MemberAvatar';
import { CATEGORY_CONFIG } from '@/types';
import type { CruiseEvent } from '@/types';
import {
  formatTime,
  formatTimeRange,
  isCurrentlyActive,
  isUpcoming,
  isPast,
  timeToMinutes,
} from '@/utils/time';

export function FamilyDashboard() {
  const navigate = useNavigate();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const members = useFamily();
  const events = useEventsForDay();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dateLabel = format(
    parse(selectedDate, 'yyyy-MM-dd', new Date()),
    'EEEE, MMM d',
  );

  const memberStatus = useMemo(() => {
    return members.map((member) => {
      const myEvents = events
        .filter((e) => e.memberIds.includes(member.id))
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      const current = myEvents.find((e) =>
        isCurrentlyActive(e.date, e.startTime, e.endTime),
      );
      const upcoming = myEvents.filter((e) =>
        isUpcoming(e.date, e.startTime),
      );
      const past = myEvents.filter((e) => isPast(e.date, e.endTime));
      return { member, current, upcoming, past, all: myEvents, totalEvents: myEvents.length };
    });
  }, [members, events]);

  const toggleExpanded = (memberId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const renderEventRow = (event: CruiseEvent, isPastEvent = false) => {
    const config = CATEGORY_CONFIG[event.category];
    return (
      <button
        key={event.id}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/event/${event.id}`);
        }}
        className={`w-full flex items-start gap-2 text-left py-1.5 ${
          isPastEvent ? 'opacity-50' : ''
        }`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: config.color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isPastEvent ? 'text-cruise-muted line-through' : 'text-cruise-text'} truncate`}>
            {event.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-cruise-muted">
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {formatTimeRange(event.startTime, event.endTime)}
            </span>
            {event.venue && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{event.venue}</span>
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-2 pb-2 border-b border-cruise-border">
        <h1 className="text-lg font-bold">Family</h1>
        <p className="text-sm text-cruise-muted mt-0.5">
          {dateLabel}
        </p>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ocean-500/10 mb-4">
            <Users className="w-8 h-8 text-ocean-400" aria-hidden="true" />
          </div>
          <p className="text-cruise-text font-semibold">No family members yet</p>
          <p className="text-cruise-muted text-sm mt-1 max-w-xs mx-auto">
            Add members so you can see who&apos;s where and keep everyone on the same page.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="mt-5 inline-flex items-center gap-1.5 bg-ocean-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Add family members
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {memberStatus.map(({ member, current, upcoming, past, totalEvents }) => {
            const isExpanded = expanded.has(member.id);
            const visibleUpcoming = isExpanded ? upcoming : upcoming.slice(0, 2);
            const remainingUpcoming = upcoming.length - visibleUpcoming.length;
            return (
              <div
                key={member.id}
                className="bg-cruise-card border border-cruise-border rounded-2xl p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <MemberAvatar member={member} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-cruise-text">
                      {member.name}
                    </h3>
                    <p className="text-xs text-cruise-muted">
                      {totalEvents} event{totalEvents !== 1 ? 's' : ''} today
                      {member.isChild && ' · Child'}
                    </p>
                  </div>
                </div>

                {/* Current activity */}
                {current ? (
                  <div className="bg-ocean-500/10 border border-ocean-500/20 rounded-xl p-3 mb-2">
                    <span className="text-xs font-medium text-ocean-400">
                      Now
                    </span>
                    <p className="font-medium text-cruise-text mt-0.5">
                      {current.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-cruise-muted">
                      {current.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {current.venue}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        until {formatTime(current.endTime)}
                      </span>
                    </div>
                  </div>
                ) : totalEvents === 0 ? (
                  <div className="bg-cruise-surface rounded-xl p-3 mb-2">
                    <span className="text-xs text-cruise-muted">Nothing scheduled today</span>
                  </div>
                ) : upcoming.length === 0 ? (
                  <div className="bg-cruise-surface rounded-xl p-3 mb-2">
                    <span className="text-xs text-cruise-muted">All done for today</span>
                  </div>
                ) : (
                  <div className="bg-cruise-surface rounded-xl p-3 mb-2">
                    <span className="text-xs text-cruise-muted">Free right now</span>
                  </div>
                )}

                {/* Upcoming list */}
                {upcoming.length > 0 && (
                  <div className="border-t border-cruise-border/50 pt-2">
                    <span className="text-xs font-semibold text-cruise-muted uppercase tracking-wider">
                      Up next
                    </span>
                    <div className="mt-1">
                      {visibleUpcoming.map((e) => renderEventRow(e))}
                    </div>
                    {remainingUpcoming > 0 && (
                      <button
                        onClick={() => toggleExpanded(member.id)}
                        className="mt-1 text-xs text-ocean-400 flex items-center gap-1"
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown className="w-3 h-3" aria-hidden="true" />
                        Show {remainingUpcoming} more
                      </button>
                    )}
                    {isExpanded && upcoming.length > 2 && (
                      <button
                        onClick={() => toggleExpanded(member.id)}
                        className="mt-1 text-xs text-ocean-400 flex items-center gap-1"
                        aria-expanded={isExpanded}
                      >
                        <ChevronUp className="w-3 h-3" aria-hidden="true" />
                        Show less
                      </button>
                    )}
                  </div>
                )}

                {/* Past list (expanded only) */}
                {isExpanded && past.length > 0 && (
                  <div className="border-t border-cruise-border/50 mt-2 pt-2">
                    <span className="text-xs font-semibold text-cruise-muted uppercase tracking-wider">
                      Earlier today
                    </span>
                    <div className="mt-1">
                      {past.map((e) => renderEventRow(e, true))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/event/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-ocean-500 text-white rounded-full shadow-lg shadow-ocean-500/30 flex items-center justify-center active:scale-95 transition-transform z-30"
        aria-label="Add new event"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
