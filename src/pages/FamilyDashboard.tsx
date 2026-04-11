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

  // #87: copy must reflect *which day* the dashboard is showing — saying
  // "today" while browsing a future shore day was just confusing.
  const today = format(new Date(), 'yyyy-MM-dd');
  const isViewingToday = selectedDate === today;
  const isViewingFuture = selectedDate > today;
  const dayWord = isViewingToday
    ? 'today'
    : isViewingFuture
      ? 'this day'
      : 'this day';
  const dayWordCap = isViewingToday ? 'Today' : 'This day';

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
        className={`w-full flex items-start gap-2 text-left py-1.5 press ${
          isPastEvent ? 'opacity-50' : ''
        }`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: config.color }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm truncate ${isPastEvent ? 'line-through' : ''}`}
            style={{
              color: isPastEvent ? 'var(--fg-muted)' : 'var(--fg-default)',
            }}
          >
            {event.title}
          </p>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--fg-muted)' }}
          >
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
      <div
        className="px-4 pt-2 pb-2"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <h1 className="text-lg font-bold">Family</h1>
        <p
          className="text-sm mt-0.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          {dateLabel}
        </p>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--accent-soft)' }}
          >
            <Users
              className="w-8 h-8"
              style={{ color: 'var(--accent)' }}
              aria-hidden="true"
            />
          </div>
          <p
            className="font-semibold"
            style={{ color: 'var(--fg-default)' }}
          >
            No family members yet
          </p>
          <p
            className="text-sm mt-1 max-w-xs mx-auto"
            style={{ color: 'var(--fg-muted)' }}
          >
            Add members so you can see who&apos;s where and keep everyone on the same page.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium press"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-fg)',
            }}
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
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <MemberAvatar member={member} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold"
                      style={{ color: 'var(--fg-default)' }}
                    >
                      {member.name}
                    </h3>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {totalEvents} event{totalEvents !== 1 ? 's' : ''} {dayWord}
                      {member.isChild && ' · Child'}
                    </p>
                  </div>
                </div>

                {/* Current activity */}
                {current ? (
                  <div
                    className="rounded-xl p-3 mb-2"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      border: '1px solid var(--accent)',
                    }}
                  >
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--accent)' }}
                    >
                      Now
                    </span>
                    <p
                      className="font-medium mt-0.5"
                      style={{ color: 'var(--fg-default)' }}
                    >
                      {current.title}
                    </p>
                    <div
                      className="flex items-center gap-3 mt-1 text-xs"
                      style={{ color: 'var(--fg-muted)' }}
                    >
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
                  <div
                    className="rounded-xl p-3 mb-2"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Nothing scheduled {dayWord}
                    </span>
                  </div>
                ) : upcoming.length === 0 && isViewingToday ? (
                  <div
                    className="rounded-xl p-3 mb-2"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      All done for today
                    </span>
                  </div>
                ) : isViewingToday && upcoming.length > 0 ? (
                  <div
                    className="rounded-xl p-3 mb-2"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Free right now
                    </span>
                  </div>
                ) : (
                  // Browsing a non-today day: avoid stale "now/free" copy.
                  <div
                    className="rounded-xl p-3 mb-2"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {dayWordCap}&apos;s plan
                    </span>
                  </div>
                )}

                {/* Upcoming list */}
                {upcoming.length > 0 && (
                  <div
                    className="pt-2"
                    style={{ borderTop: '1px solid var(--border-default)' }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {isViewingToday ? 'Up next' : 'Planned'}
                    </span>
                    <div className="mt-1">
                      {visibleUpcoming.map((e) => renderEventRow(e))}
                    </div>
                    {remainingUpcoming > 0 && (
                      <button
                        onClick={() => toggleExpanded(member.id)}
                        className="mt-1 text-xs flex items-center gap-1 press"
                        style={{ color: 'var(--accent)' }}
                        aria-expanded={isExpanded}
                      >
                        <ChevronDown className="w-3 h-3" aria-hidden="true" />
                        Show {remainingUpcoming} more
                      </button>
                    )}
                    {isExpanded && upcoming.length > 2 && (
                      <button
                        onClick={() => toggleExpanded(member.id)}
                        className="mt-1 text-xs flex items-center gap-1 press"
                        style={{ color: 'var(--accent)' }}
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
                  <div
                    className="mt-2 pt-2"
                    style={{ borderTop: '1px solid var(--border-default)' }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {isViewingToday ? 'Earlier today' : 'Earlier'}
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
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center press z-30"
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-fg)',
          boxShadow: 'var(--shadow-fab)',
        }}
        aria-label="Add new event"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
