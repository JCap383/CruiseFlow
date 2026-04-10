import { useState, useEffect, useMemo } from 'react';
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
import { platform } from '@/platform';
import { usePlatformQuery } from '@/platform/usePlatformQuery';
import { timeToMinutes } from '@/utils/time';

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

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 5, label: '5 min before' },
  { value: 15, label: '15 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
];

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
  // Parse category-specific metadata out of notes on initial load
  const parseNotes = (raw: string) => {
    let base = raw;
    let bookingData = { status: '', confirmation: '', cost: '' };
    let diningData = { partySize: '', dressCode: '', specialRequest: '' };
    const bm = base.match(/\n?\[BOOKING:\s*([^\]]*)\]/);
    if (bm) {
      const parts = (bm[1] ?? '').split('|').map((s) => s.trim());
      bookingData = { status: parts[0] ?? '', confirmation: parts[1] ?? '', cost: parts[2] ?? '' };
      base = base.replace(bm[0], '').trim();
    }
    const dm = base.match(/\n?\[DINING:\s*([^\]]*)\]/);
    if (dm) {
      const parts = (dm[1] ?? '').split('|').map((s) => s.trim());
      diningData = { partySize: parts[0] ?? '', dressCode: parts[1] ?? '', specialRequest: parts[2] ?? '' };
      base = base.replace(dm[0], '').trim();
    }
    return { base, booking: bookingData, dining: diningData };
  };

  const initialParsed = useMemo(() => parseNotes(initialData?.notes ?? ''), [initialData]);

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
  const [notes, setNotes] = useState(initialParsed.base);
  const [bookingStatus, setBookingStatus] = useState(initialParsed.booking.status);
  const [bookingConfirmation, setBookingConfirmation] = useState(initialParsed.booking.confirmation);
  const [bookingCost, setBookingCost] = useState(initialParsed.booking.cost);
  const [partySize, setPartySize] = useState(initialParsed.dining.partySize);
  const [dressCode, setDressCode] = useState(initialParsed.dining.dressCode);
  const [specialRequest, setSpecialRequest] = useState(initialParsed.dining.specialRequest);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initialData?.memberIds ?? members.map((m) => m.id),
  );
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(
    initialData?.reminderMinutes ?? null,
  );
  const [initialized, setInitialized] = useState(!!initialData);
  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [venueFilter, setVenueFilter] = useState('');
  const [errors, setErrors] = useState<{ title?: string; time?: string; deck?: string }>({});

  const venues = usePlatformQuery(
    async () => {
      if (!shipName) {
        return platform.db.getVenuesForShip('');
      }
      const normalized = shipName.toLowerCase().trim();
      const exact = await platform.db.getVenuesForShip(shipName);
      if (exact.length > 0) return exact;
      const all = await platform.db.getVenuesForShip('');
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

  const filteredVenues = useMemo(() => {
    if (!venueFilter) return null;
    const q = venueFilter.toLowerCase();
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q),
    );
  }, [venues, venueFilter]);

  useEffect(() => {
    if (initialData && !initialized) {
      setTitle(initialData.title);
      setStartTime(initialData.startTime);
      setEndTime(initialData.endTime);
      setCategory(initialData.category);
      setVenue(initialData.venue);
      setDeck(initialData.deck?.toString() ?? '');
      const parsed = parseNotes(initialData.notes ?? '');
      setNotes(parsed.base);
      setBookingStatus(parsed.booking.status);
      setBookingConfirmation(parsed.booking.confirmation);
      setBookingCost(parsed.booking.cost);
      setPartySize(parsed.dining.partySize);
      setDressCode(parsed.dining.dressCode);
      setSpecialRequest(parsed.dining.specialRequest);
      setSelectedMembers(initialData.memberIds);
      setReminderMinutes(initialData.reminderMinutes ?? null);
      setInitialized(true);
    }
  }, [initialData, initialized]);

  const selectVenue = (name: string, venueDeck: number) => {
    setVenue(name);
    setDeck(venueDeck.toString());
    setShowVenuePicker(false);
    setVenueFilter('');
    if (!title) {
      setTitle(name);
    }
  };

  const selectCategory = (cat: EventCategory) => {
    setCategory(cat);
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

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'Event title is required';
    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      newErrors.time = 'End time must be after start time';
    }
    if (deck) {
      const deckNum = parseInt(deck, 10);
      if (isNaN(deckNum) || deckNum < 1 || deckNum > 30) {
        newErrors.deck = 'Deck must be a number between 1 and 30';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Assemble notes with tagged metadata
    let finalNotes = notes.trim();
    if (category === 'excursion' || category === 'reservation') {
      if (bookingStatus || bookingConfirmation || bookingCost) {
        finalNotes += `${finalNotes ? '\n' : ''}[BOOKING: ${bookingStatus} | ${bookingConfirmation} | ${bookingCost}]`;
      }
    }
    if (category === 'dining') {
      if (partySize || dressCode || specialRequest) {
        finalNotes += `${finalNotes ? '\n' : ''}[DINING: ${partySize} | ${dressCode} | ${specialRequest}]`;
      }
    }

    onSubmit({
      cruiseId,
      title: title.trim(),
      date,
      startTime,
      endTime,
      category,
      venue,
      deck: deck ? parseInt(deck, 10) : null,
      notes: finalNotes,
      memberIds: selectedMembers,
      reminderMinutes,
      photos: initialData?.photos ?? [],
      isFavorite: initialData?.isFavorite ?? false,
      mood: initialData?.mood ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* ── Category chips ─────────────────────────────────────────── */}
      <div>
        <span className="text-sm text-cruise-muted block mb-2">Category</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="radiogroup" aria-label="Event category">
          {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = CATEGORY_ICONS[cat];
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
                  active
                    ? 'text-white scale-[1.02]'
                    : 'bg-cruise-card border border-cruise-border text-cruise-muted'
                }`}
                style={active ? { backgroundColor: config.color } : undefined}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
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
            aria-label="Select venue"
          >
            <MapPin className="w-4 h-4 text-cruise-muted shrink-0" aria-hidden="true" />
            <span className={venue ? 'text-cruise-text' : 'text-cruise-muted/50'}>
              {venue || 'Select a venue...'}
            </span>
            {venue && deck && (
              <span className="text-xs text-cruise-muted ml-auto">Deck {deck}</span>
            )}
            <ChevronDown className="w-4 h-4 text-cruise-muted shrink-0 ml-auto" aria-hidden="true" />
          </button>
        ) : (
          <div className="rounded-xl bg-cruise-card border border-cruise-border overflow-hidden">
            <div className="p-2 border-b border-cruise-border">
              <input
                type="text"
                placeholder="Search venues..."
                value={venueFilter}
                onChange={(e) => setVenueFilter(e.target.value)}
                autoFocus
                className="w-full bg-cruise-surface rounded-lg px-3 py-2 text-sm text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none"
                aria-label="Search venues"
              />
            </div>

            <div className="max-h-64 overflow-y-auto">
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
                Object.entries(groupedVenues).map(([cat, catVenues]) => {
                  if (catVenues.length === 0) return null;
                  const CatIcon = VENUE_CATEGORY_ICONS[cat] ?? MapPin;
                  return (
                    <div key={cat}>
                      <div className="px-4 py-2 bg-cruise-surface flex items-center gap-2 sticky top-0">
                        <CatIcon className="w-3.5 h-3.5 text-cruise-muted" aria-hidden="true" />
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
      <div>
        <Input
          id="title"
          label="Event title"
          placeholder="e.g. Dinner, Ice show, Pool time..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({ ...errors, title: undefined });
          }}
          required
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-xs text-red-400 mt-1" role="alert">{errors.title}</p>
        )}
      </div>

      {/* ── Deck override ──────────────────────────────────────────── */}
      {venue && !showVenuePicker && (
        <div>
          <Input
            id="deck"
            label="Deck (optional)"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            placeholder="e.g. 7"
            value={deck}
            onChange={(e) => {
              setDeck(e.target.value);
              if (errors.deck) setErrors({ ...errors, deck: undefined });
            }}
            aria-invalid={!!errors.deck}
            aria-describedby={errors.deck ? 'deck-error' : undefined}
          />
          {errors.deck && (
            <p id="deck-error" className="text-xs text-red-400 mt-1" role="alert">{errors.deck}</p>
          )}
        </div>
      )}

      {/* ── Time ───────────────────────────────────────────────────── */}
      <div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="startTime"
            label="Start"
            type="time"
            value={startTime}
            onChange={(e) => {
              const newStart = e.target.value;
              setStartTime(newStart);
              // Auto-set end time to start + 1 hour
              const [h, m] = newStart.split(':').map(Number);
              const endH = Math.min((h ?? 0) + 1, 23);
              setEndTime(`${endH.toString().padStart(2, '0')}:${(m ?? 0).toString().padStart(2, '0')}`);
              if (errors.time) setErrors({ ...errors, time: undefined });
            }}
          />
          <Input
            id="endTime"
            label="End"
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              if (errors.time) setErrors({ ...errors, time: undefined });
            }}
            aria-invalid={!!errors.time}
            aria-describedby={errors.time ? 'time-error' : undefined}
          />
        </div>
        {errors.time && (
          <p id="time-error" className="text-xs text-red-400 mt-1" role="alert">{errors.time}</p>
        )}
      </div>

      {/* ── Reminder ───────────────────────────────────────────────── */}
      <div>
        <label htmlFor="reminder" className="text-sm text-cruise-muted block mb-1.5">
          Reminder
        </label>
        <select
          id="reminder"
          value={reminderMinutes ?? ''}
          onChange={(e) => setReminderMinutes(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-cruise-text focus:outline-none focus:border-ocean-500 transition-colors"
        >
          {REMINDER_OPTIONS.map((opt) => (
            <option key={opt.label} value={opt.value ?? ''}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Excursion / Reservation booking details ────────────────── */}
      {(category === 'excursion' || category === 'reservation') && (
        <div className="flex flex-col gap-3 p-3 rounded-xl bg-cruise-card/50 border border-cruise-border">
          <span className="text-xs font-semibold text-cruise-muted uppercase tracking-wider">
            Booking details
          </span>
          <div>
            <label htmlFor="bookingStatus" className="text-sm text-cruise-muted block mb-1.5">
              Status
            </label>
            <select
              id="bookingStatus"
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value)}
              className="w-full rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-cruise-text focus:outline-none focus:border-ocean-500 transition-colors"
            >
              <option value="">Not set</option>
              <option value="planned">Planned</option>
              <option value="booked">Booked</option>
              <option value="waitlist">Waitlisted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <Input
            id="confirmation"
            label="Confirmation #"
            placeholder="e.g. BX12345"
            value={bookingConfirmation}
            onChange={(e) => setBookingConfirmation(e.target.value)}
          />
          <Input
            id="cost"
            label="Cost (optional)"
            placeholder="e.g. $150"
            value={bookingCost}
            onChange={(e) => setBookingCost(e.target.value)}
          />
        </div>
      )}

      {/* ── Dining reservation details ─────────────────────────────── */}
      {category === 'dining' && (
        <div className="flex flex-col gap-3 p-3 rounded-xl bg-cruise-card/50 border border-cruise-border">
          <span className="text-xs font-semibold text-cruise-muted uppercase tracking-wider">
            Dining details
          </span>
          <Input
            id="partySize"
            label="Party size"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            placeholder="e.g. 4"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
          />
          <div>
            <label htmlFor="dressCode" className="text-sm text-cruise-muted block mb-1.5">
              Dress code
            </label>
            <select
              id="dressCode"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              className="w-full rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-cruise-text focus:outline-none focus:border-ocean-500 transition-colors"
            >
              <option value="">Not set</option>
              <option value="casual">Casual</option>
              <option value="smart-casual">Smart casual</option>
              <option value="formal">Formal</option>
              <option value="themed">Themed night</option>
            </select>
          </div>
          <Input
            id="specialRequest"
            label="Special request"
            placeholder="e.g. Window table, allergies"
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
          />
        </div>
      )}

      {/* ── Family member selector ─────────────────────────────────── */}
      {members.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-cruise-muted">Who's going?</span>
          <div className="flex gap-2 flex-wrap" role="group" aria-label="Select attendees">
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

      {/* ── Notes ──────────────────────────────────────────────────── */}
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
