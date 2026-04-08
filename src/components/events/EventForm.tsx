import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { CruiseEvent, EventCategory, FamilyMember } from '@/types';
import { CATEGORY_CONFIG } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input, TextArea, Select } from '@/components/ui/Input';
import { MemberAvatar } from '@/components/family/MemberAvatar';
import { db } from '@/db/database';

interface EventFormProps {
  initialData?: CruiseEvent;
  members: FamilyMember[];
  cruiseId: string;
  date: string;
  onSubmit: (data: Omit<CruiseEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_CONFIG).map(([value, c]) => ({
  value,
  label: c.label,
}));

export function EventForm({
  initialData,
  members,
  cruiseId,
  date,
  onSubmit,
  onCancel,
}: EventFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '12:00');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '13:00');
  const [category, setCategory] = useState<EventCategory>(
    initialData?.category ?? 'personal',
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

  const venues = useLiveQuery(() => db.venues.toArray(), [], []);

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

  // Auto-fill deck when venue is selected from known list
  useEffect(() => {
    if (venue && initialized) {
      const found = venues.find((v) => v.name === venue);
      if (found) setDeck(found.deck.toString());
    }
  }, [venue, venues, initialized]);

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
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="title"
        label="Event title"
        placeholder="e.g. Dinner at Windjammer"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        required
      />

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

      <Select
        id="category"
        label="Category"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={(e) => setCategory(e.target.value as EventCategory)}
      />

      {/* Venue - datalist for autocomplete from known venues */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="venue" className="text-sm text-cruise-muted">
          Venue
        </label>
        <input
          id="venue"
          list="venue-list"
          className="rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none focus:border-ocean-500 transition-colors"
          placeholder="e.g. Main Dining Room"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
        <datalist id="venue-list">
          {venues.map((v) => (
            <option key={v.id} value={v.name}>
              Deck {v.deck}
            </option>
          ))}
        </datalist>
      </div>

      <Input
        id="deck"
        label="Deck"
        type="number"
        min="1"
        max="20"
        placeholder="e.g. 5"
        value={deck}
        onChange={(e) => setDeck(e.target.value)}
      />

      <TextArea
        id="notes"
        label="Notes"
        placeholder="Any details..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* Family member selector */}
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

      <div className="flex gap-3 mt-2">
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
