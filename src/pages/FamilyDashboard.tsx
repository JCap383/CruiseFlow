import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { Plus, Clock, MapPin } from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { useEventsForDay } from '@/hooks/useEvents';
import { useAppStore } from '@/stores/appStore';
import { MemberAvatar } from '@/components/family/MemberAvatar';
import { CATEGORY_CONFIG } from '@/types';
import {
  formatTime,
  isCurrentlyActive,
  isUpcoming,
  timeToMinutes,
} from '@/utils/time';

export function FamilyDashboard() {
  const navigate = useNavigate();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const members = useFamily();
  const events = useEventsForDay();

  const dateLabel = format(
    parse(selectedDate, 'yyyy-MM-dd', new Date()),
    'EEEE, MMM d',
  );

  const memberStatus = useMemo(() => {
    return members.map((member) => {
      const myEvents = events.filter((e) => e.memberIds.includes(member.id));
      const current = myEvents.find((e) =>
        isCurrentlyActive(e.date, e.startTime, e.endTime),
      );
      const upcoming = myEvents
        .filter((e) => isUpcoming(e.date, e.startTime))
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];

      return { member, current, upcoming, totalEvents: myEvents.length };
    });
  }, [members, events]);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-cruise-border">
        <h1 className="text-lg font-bold">Family</h1>
        <p className="text-sm text-cruise-muted mt-0.5">
          {dateLabel}
        </p>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-cruise-muted">No family members yet</p>
          <p className="text-cruise-muted/60 text-xs mt-1">
            Add members in Settings
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {memberStatus.map(({ member, current, upcoming, totalEvents }) => (
            <div
              key={member.id}
              className="bg-cruise-card border border-cruise-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <MemberAvatar member={member} size="lg" />
                <div>
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
                        <MapPin className="w-3 h-3" />
                        {current.venue}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      until {formatTime(current.endTime)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-cruise-surface rounded-xl p-3 mb-2">
                  <span className="text-xs text-cruise-muted">Free right now</span>
                </div>
              )}

              {/* Upcoming */}
              {upcoming && (
                <div className="flex items-center gap-2 text-sm text-cruise-muted">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_CONFIG[upcoming.category].color,
                    }}
                  />
                  <span>
                    Next: {upcoming.title} at {formatTime(upcoming.startTime)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/event/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-ocean-500 text-white rounded-full shadow-lg shadow-ocean-500/30 flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
