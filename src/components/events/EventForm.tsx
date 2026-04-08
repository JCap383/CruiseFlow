import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Utensils,
  Music,
  Compass,
  Baby,
  Ticket,
  User,
  Bell,
  ChevronDown,
  MapPin,
  Wine,
  Waves,
  Dumbbell,
  Sparkles,
  Wrench,
} from 'lucide-react';
import type { CruiseEvent, EventCategory, FamilyMember } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, TextArea } from '@/components/ui/Input';
import { MemberAvatar } from '@/components/family/MemberAvatar';
import { db } from '@/db/database';

interface EventFormProps {
  initialData?: CruiseEvent;
  members: FamilyMember[];
  cruiseId: string;
  shipName: string;
  date: string;
  onSubmit: (data: Omit<CruiseEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const CATEGORY_ICONS: Record<EventCategory, typeof Utensils> = {
  dining: Utensils,
  entertainment: Music,
  excursion: Compass,
  'kids-club': Baby,
  reservation: Ticket,
  personal: User,
  reminder: Bell,
};

const VENUE_CATEGORY_ICONS: Record<string, typeof Utensils> = {
  dining: Utensils,
  bar: Wine,
  entertainment: Music,
  kids: Baby,
  pool: Waves,
  activity: Dumbbell,
  spa: Sparkles,
  service: Wrench,
};

const VENUE_CATEGORY_LABELS: Record<string, string> = {
  dining: 'Dining',
  bar: 'Bars',
  entertainment: 'Entertainment',
  kids: 'Kids',
  pool: 'Pools',
  activity: 'Activities',
  spa: 'Spa & Fitness',
  service: 'Services',
};

// Smart time defaults based on category
function getDefaultTimes(category: EventCategory): [string, string] {
  switch (category) {
    case 'dining':
      return ['18:00', '19:30'];
    case 'entertainment':
      return ['20:00', '21:30'];
    case 'excursion':
      return ['08:00', '12:00'];
    case 'kids-club':
      return ['09:00', '12:00'];
    case 'reservation':
      return ['14:00', '15:00'];
    case 'reminder':
      return ['12:00', '12:15'];
    default:
      return ['12:00', '13:00'];
  }
}

export function EventForm({
  initialData,
  members,
  cruiseId,
  shipName,
  date,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '12:00');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '13:00');
  const [category, setCategory] = useState<EventCategory>(
    initialData?.category ?? 'dining',
  );
  const [venue, setVenue] = useState(initialData?.venue ?? '');
  const [deck, setDeck] = useState<string>(
    initialData?.deck?.toString() ?? '',
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initialData?.memberIds ?? members.map((m) => m.id),
  );
  const [initialized, setInitialized] = useState(!!initialData);
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [venueFilter, setVenueFilter] = useState('');

  const venues = useLiveQuery(
    async () => {
      if (!shipName) return db.venues.toArray();
      const normalized = shipName.toLowerCase().trim();
      // Try exact match first
      const exact = await db.venues.where('shipName').equalsIgnoreCase(shipName).toArray();
      if (exact.length > 0) return exact;
      // Fuzzy: match if either contains the other
      const all = await db.venues.toArray();
      const fuzzy = all.filter((v) => {
        const vn = v.shipName.toLowerCase();
        return vn.includes(normalized) || normalized.includes(vn);
      });
      return fuzzy.length > 0 ? fuzzy : all;
    },
    [shipName],
    [],
  );

  // Group venues by category
  const groupedVenues = useMemo(() => {
    const groups: Record<string, { name: string; deck: number }[]> = {};
    const order = ['dining', 'bar', 'entertainment', 'kids', 'pool', 'activity', 'spa', 'service'];
    for (const cat of order) {
      groups[cat] = [];
    }
    for (const v of venues) {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category]!.push({ name: v.name, deck: v.deck });
    }
    return groups;
  }, [venues]);

  // Filtered venues for search
  const filteredVenues = useMemo(() => {
    if (!venueFilter) return null;
    const q = venueFilter.toLowerCase();
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q),
    );
  }, [venues, venueFilter]);

  // Sync form state when initialData loads asynchronously (edit mode)
  useEffect(() => {
    if (initialData && !initialized) {
      setTitle(initialData.title);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setCategory(initialData.category);
      setVenue(initialData.venue);
      setDeck(initialData.deck?.toString() ?? '');
      setNotes(initialData.notes);
      setSelectedMembers(initialData.memberIds);
      setInitialized(true);
    }
  }, [initialData, initialized]);

  const selectVenue = (name: string, venueDeck: number) => {
    setVenue(name);
    setDeck(venueDeck.toString());
    setShowVenuePicker(false);
    setVenueFilter('');
    // Auto-fill title if empty
    if (!title) {
      setTitle(name);
    }
  };

  const selectCategory = (cat: EventCategory) => {
    setCategory(cat);
    // Update times if user hasn't manually changed them yet, and this is a new event
    if (!initialData) {
      const [s, e] = getDefaultTimes(cat);
      setStartTime(s);
      setEndTime(e);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      cruiseId,
      title: title.trim(),
      date,
      startTime,
      endTime,
      category,
      venue,
      deck: deck ? parseInt(deck, 10) : null,
      notes,
      memberIds: selectedMembers,
      reminderMinutes: null,
      photos: initialData?.photos ?? [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* ── Category chips ─────────────────────────────────────────── */}
      <div>
        <span className="text-sm text-cruise-muted block mb-2">Category</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = CATEGORY_ICONS[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => selectCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? 'text-white scale-[1.02]'
                    : 'bg-cruise-card border border-cruise-border text-cruise-muted'
                }`}
                style={active ? { backgroundColor: config.color } : undefined}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Venue picker ───────────────────────────────────────────── */}
      <div>
        <span className="text-sm text-cruise-muted block mb-2">Venue</span>
        {!showVenuePicker ? (
          <button
            type="button"
            onClick={() => setShowVenuePicker(true)}
            className="w-full flex items-center gap-2 rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-left transition-colors"
          >
            <MapPin className="w-4 h-4 text-cruise-muted shrink-0" />
            <span className={venue ? 'text-cruise-text' : 'text-cruise-muted/50'}>
              {venue || 'Select a venue...'}
            </span>
            {venue && deck && (
              <span className="text-xs text-cruise-muted ml-auto">Deck {deck}</span>
            )}
            <ChevronDown className="w-4 h-4 text-cruise-muted shrink-0 ml-auto" />
          </button>
        ) : (
          <div className="rounded-xl bg-cruise-card border border-cruise-border overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-cruise-border">
              <input
                type="text"
                placeholder="Search venues..."
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                autoFocus
                className="w-full bg-cruise-surface rounded-lg px-3 py-2 text-sm text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none"
              />
            </div>

            {/* Venue list */}
            <div className="max-h-64 overflow-y-auto">
              {/* Custom input option */}
              {venueFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setVenue(venueFilter);
                    setShowVenuePicker(false);
                    setVenueFilter('');
                    if (!title) setTitle(venueFilter);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-ocean-400 border-b border-cruise-border hover:bg-cruise-surface"
                >
                  Use "{venueFilter}" as venue
                </button>
              )}

              {filteredVenues ? (
                // Search results
                filteredVenues.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-cruise-muted">
                    No venues match "{venueFilter}"
                  </div>
                ) : (
                  filteredVenues.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVenue(v.name, v.deck)}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-cruise-surface active:bg-cruise-border transition-colors"
                    >
                      <span className="text-cruise-text">{v.name}</span>
                      <span className="text-xs text-cruise-muted">Deck {v.deck}</span>
                    </button>
                  ))
                )
              ) : (
                // Grouped by category
                Object.entries(groupedVenues).map(([cat, catVenues]) => {
                  if (catVenues.length === 0) return null;
                  const CatIcon = VENUE_CATEGORY_ICONS[cat] ?? MapPin;
                  return (
                    <div key={cat}>
                      <div className="px-4 py-2 bg-cruise-surface flex items-center gap-2 sticky top-0">
                        <CatIcon className="w-3.5 h-3.5 text-cruise-muted" />
                        <span className="text-xs font-medium text-cruise-muted uppercase tracking-wider">
                          {VENUE_CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      </div>
                      {catVenues.map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => selectVenue(v.name, v.deck)}
                          className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-cruise-surface active:bg-cruise-border transition-colors"
                        >
                          <span className="text-cruise-text">{v.name}</span>
                          <span className="text-xs text-cruise-muted">
                            Deck {v.deck}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  setShowVenuePicker(false);
                  setVenueFilter('');
                }}
                className="w-full text-center py-2.5 text-sm text-cruise-muted border-t border-cruise-border"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Title ──────────────────────────────────────────────────── */}
      <Input
        id="title"
        label="Event title"
        placeholder="e.g. Dinner, Ice show, Pool time..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      {/* ── Time ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="startTime"
          label="Start"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <Input
          id="endTime"
          label="End"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>

      {/* ── Family member selector ─────────────────────────────────── */}
      {members.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-cruise-muted">Who's going?</span>
          <div className="flex gap-2 flex-wrap">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1">
                <MemberAvatar
                  member={m}
                  selected={selectedMembers.includes(m.id)}
                  onClick={() => toggleMember(m.id)}
                />
                <span className="text-xs text-cruise-muted">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notes (collapsed by default) ───────────────────────────── */}
      <TextArea
        id="notes"
        label="Notes (optional)"
        placeholder="Dress code, confirmation #, etc."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* ── Actions ────────────────────────────────────────────────── */}
      <div className="flex gap-3 mt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={!title.trim()}>
          {initialData ? 'Update' : 'Add Event'}
        </Button>
      </div>
    </form>
  );
}
