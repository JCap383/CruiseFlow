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
import { Input, TextArea, Select } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { MemberAvatar } from '@/components/family/MemberAvatar';
import { platform } from '@/platform';
import { usePlatformQuery } from '@/platform/usePlatformQuery';
import { timeToMinutes } from '@/utils/time';
import { haptics } from '@/utils/haptics';

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

const REMINDER_OPTIONS = [
  { value: '', label: 'None' },
  { value: '5', label: '5 min before' },
  { value: '15', label: '15 min before' },
  { value: '30', label: '30 min before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
];

function getDefaultTimes(category: EventCategory): [string, string] {
  switch (category) {
    case 'dining':       return ['18:00', '19:30'];
    case 'entertainment': return ['20:00', '21:30'];
    case 'excursion':    return ['08:00', '12:00'];
    case 'kids-club':    return ['09:00', '12:00'];
    case 'reservation':  return ['14:00', '15:00'];
    case 'reminder':     return ['12:00', '12:15'];
    default:             return ['12:00', '13:00'];
  }
}

type Section = 'basics' | 'timing' | 'details' | 'people';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'timing', label: 'Time' },
  { id: 'details', label: 'Details' },
  { id: 'people', label: 'People' },
];

export function EventForm({
  initialData,
  members,
  cruiseId,
  shipName,
  date,
  onSubmit,
  onCancel,
}: EventFormProps) {
  // Parse category-specific metadata out of notes
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

  const [section, setSection] = useState<Section>('basics');
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '12:00');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '13:00');
  const [category, setCategory] = useState<EventCategory>(
    initialData?.category ?? 'dining',
  );
  const [venue, setVenue] = useState(initialData?.venue ?? '');
  const [deck, setDeck] = useState<string>(initialData?.deck?.toString() ?? '');
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

  const groupedVenues = useMemo(() => {
    const groups: Record<string, { name: string; deck: number }[]> = {};
    const order = ['dining', 'bar', 'entertainment', 'kids', 'pool', 'activity', 'spa', 'service'];
    for (const cat of order) groups[cat] = [];
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
      (v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q),
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
    if (!title) setTitle(name);
    void haptics.tap();
  };

  const selectCategory = (cat: EventCategory) => {
    setCategory(cat);
    if (!initialData) {
      const [s, e] = getDefaultTimes(cat);
      setStartTime(s);
      setEndTime(e);
    }
    void haptics.tap();
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
    void haptics.tap();
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
    if (!validate()) {
      // Jump to first section with an error
      if (errors.title) setSection('basics');
      else if (errors.time) setSection('timing');
      else if (errors.deck) setSection('basics');
      void haptics.error();
      return;
    }

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

  const sectionHasError: Record<Section, boolean> = {
    basics: !!errors.title || !!errors.deck,
    timing: !!errors.time,
    details: false,
    people: false,
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      {/* Segmented control */}
      <div
        className="flex p-1 rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
        role="tablist"
        aria-label="Event form sections"
      >
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                void haptics.tap();
                setSection(s.id);
              }}
              className="flex-1 rounded-lg py-1.5 text-subhead font-semibold transition-colors"
              style={{
                backgroundColor: active ? 'var(--accent)' : 'transparent',
                color: active ? 'var(--accent-fg)' : sectionHasError[s.id] ? 'var(--danger)' : 'var(--fg-muted)',
              }}
            >
              {s.label}
              {sectionHasError[s.id] && !active && <span className="ml-1">•</span>}
            </button>
          );
        })}
      </div>

      {/* ── BASICS ───────────────────────────────────────────────── */}
      {section === 'basics' && (
        <div className="flex flex-col gap-5 animate-fade-slide-up">
          {/* Category chips */}
          <div>
            <Text variant="subhead" tone="muted" className="mb-2">Category</Text>
            <div
              className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
              role="radiogroup"
              aria-label="Event category"
            >
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-footnote font-medium whitespace-nowrap shrink-0 press"
                    style={{
                      backgroundColor: active ? config.color : 'var(--bg-card)',
                      color: active ? '#ffffff' : 'var(--fg-muted)',
                      border: `1px solid ${active ? 'transparent' : 'var(--border-default)'}`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
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
            error={errors.title}
          />

          {/* Venue picker */}
          <div>
            <Text variant="subhead" tone="muted" className="mb-2">Venue</Text>
            {!showVenuePicker ? (
              <button
                type="button"
                onClick={() => setShowVenuePicker(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left press"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  minHeight: 44,
                }}
                aria-label="Select venue"
              >
                <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-subtle)' }} aria-hidden="true" />
                <span className="text-body truncate" style={{ color: venue ? 'var(--fg-default)' : 'var(--fg-subtle)' }}>
                  {venue || 'Select a venue...'}
                </span>
                {venue && deck && (
                  <span className="text-footnote ml-auto" style={{ color: 'var(--fg-muted)' }}>
                    Deck {deck}
                  </span>
                )}
                <ChevronDown
                  className="w-4 h-4 shrink-0 ml-auto"
                  style={{ color: 'var(--fg-subtle)' }}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <div
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
              >
                <div className="p-2" style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <input
                    type="text"
                    placeholder="Search venues..."
                    value={venueFilter}
                    onChange={(e) => setVenueFilter(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg px-3 py-2 text-body focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--fg-default)',
                      border: '1px solid var(--border-default)',
                    }}
                    aria-label="Search venues"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {venueFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setVenue(venueFilter);
                        setShowVenuePicker(false);
                        setVenueFilter('');
                        if (!title) setTitle(venueFilter);
                      }}
                      className="w-full text-left px-4 py-2.5 text-subhead press"
                      style={{
                        color: 'var(--accent)',
                        borderBottom: '1px solid var(--border-default)',
                      }}
                    >
                      Use "{venueFilter}" as venue
                    </button>
                  )}
                  {filteredVenues ? (
                    filteredVenues.length === 0 ? (
                      <div className="px-4 py-3 text-subhead" style={{ color: 'var(--fg-muted)' }}>
                        No venues match "{venueFilter}"
                      </div>
                    ) : (
                      filteredVenues.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => selectVenue(v.name, v.deck)}
                          className="w-full text-left px-4 py-2.5 text-subhead flex items-center justify-between press"
                        >
                          <span style={{ color: 'var(--fg-default)' }}>{v.name}</span>
                          <span className="text-footnote" style={{ color: 'var(--fg-muted)' }}>
                            Deck {v.deck}
                          </span>
                        </button>
                      ))
                    )
                  ) : (
                    Object.entries(groupedVenues).map(([cat, catVenues]) => {
                      if (catVenues.length === 0) return null;
                      const CatIcon = VENUE_CATEGORY_ICONS[cat] ?? MapPin;
                      return (
                        <div key={cat}>
                          <div
                            className="px-4 py-2 flex items-center gap-2 sticky top-0"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          >
                            <CatIcon className="w-3.5 h-3.5" style={{ color: 'var(--fg-muted)' }} aria-hidden="true" />
                            <span className="text-caption font-semibold uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                              {VENUE_CATEGORY_LABELS[cat] ?? cat}
                            </span>
                          </div>
                          {catVenues.map((v) => (
                            <button
                              key={v.name}
                              type="button"
                              onClick={() => selectVenue(v.name, v.deck)}
                              className="w-full text-left px-4 py-2.5 text-subhead flex items-center justify-between press"
                            >
                              <span style={{ color: 'var(--fg-default)' }}>{v.name}</span>
                              <span className="text-footnote" style={{ color: 'var(--fg-muted)' }}>
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
                    onClick={() => { setShowVenuePicker(false); setVenueFilter(''); }}
                    className="w-full text-center py-2.5 text-subhead press"
                    style={{ color: 'var(--fg-muted)', borderTop: '1px solid var(--border-default)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Deck override */}
          {venue && !showVenuePicker && (
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
              error={errors.deck}
            />
          )}
        </div>
      )}

      {/* ── TIMING ───────────────────────────────────────────────── */}
      {section === 'timing' && (
        <div className="flex flex-col gap-5 animate-fade-slide-up">
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
                error={errors.time}
              />
            </div>
          </div>
          <Select
            id="reminder"
            label="Reminder"
            value={reminderMinutes?.toString() ?? ''}
            onChange={(e) => setReminderMinutes(e.target.value ? parseInt(e.target.value, 10) : null)}
            options={REMINDER_OPTIONS}
          />
        </div>
      )}

      {/* ── DETAILS ──────────────────────────────────────────────── */}
      {section === 'details' && (
        <div className="flex flex-col gap-4 animate-fade-slide-up">
          {(category === 'excursion' || category === 'reservation') && (
            <div
              className="flex flex-col gap-3 p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
              <Text variant="caption" tone="subtle" weight="semibold" className="uppercase tracking-wider">
                Booking details
              </Text>
              <Select
                id="bookingStatus"
                label="Status"
                value={bookingStatus}
                onChange={(e) => setBookingStatus(e.target.value)}
                options={[
                  { value: '', label: 'Not set' },
                  { value: 'planned', label: 'Planned' },
                  { value: 'booked', label: 'Booked' },
                  { value: 'waitlist', label: 'Waitlisted' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
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
          {category === 'dining' && (
            <div
              className="flex flex-col gap-3 p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
              <Text variant="caption" tone="subtle" weight="semibold" className="uppercase tracking-wider">
                Dining details
              </Text>
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
              <Select
                id="dressCode"
                label="Dress code"
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                options={[
                  { value: '', label: 'Not set' },
                  { value: 'casual', label: 'Casual' },
                  { value: 'smart-casual', label: 'Smart casual' },
                  { value: 'formal', label: 'Formal' },
                  { value: 'themed', label: 'Themed night' },
                ]}
              />
              <Input
                id="specialRequest"
                label="Special request"
                placeholder="e.g. Window table, allergies"
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
              />
            </div>
          )}
          <TextArea
            id="notes"
            label="Notes"
            placeholder="Anything else worth remembering..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}

      {/* ── PEOPLE ───────────────────────────────────────────────── */}
      {section === 'people' && (
        <div className="flex flex-col gap-3 animate-fade-slide-up">
          {members.length === 0 ? (
            <Text variant="callout" tone="muted">No family members yet. Add some in Settings.</Text>
          ) : (
            <>
              <Text variant="subhead" tone="muted">Who's going?</Text>
              <div className="flex gap-3 flex-wrap" role="group" aria-label="Select attendees">
                {members.map((m) => (
                  <div key={m.id} className="flex flex-col items-center gap-1">
                    <MemberAvatar
                      member={m}
                      selected={selectedMembers.includes(m.id)}
                      onClick={() => toggleMember(m.id)}
                    />
                    <Text variant="caption" tone="muted">{m.name}</Text>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        className="flex gap-3 pt-3"
        style={{ borderTop: '1px solid var(--border-default)' }}
      >
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
          Cancel
        </Button>
        <Button
          type="submit"
          fullWidth
          disabled={!title.trim()}
          haptic="success"
        >
          {initialData ? 'Update' : 'Add Event'}
        </Button>
      </div>
    </form>
  );
}
