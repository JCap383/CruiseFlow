export type EventCategory =
  | 'dining'
  | 'entertainment'
  | 'excursion'
  | 'kids-club'
  | 'reservation'
  | 'personal'
  | 'reminder';

export type MoodRating = '🤩' | '😊' | '😐' | '😴' | null;

export const MOOD_OPTIONS: { emoji: MoodRating; label: string }[] = [
  { emoji: '🤩', label: 'Amazing' },
  { emoji: '😊', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😴', label: 'Meh' },
];

export interface Cruise {
  id: string;
  name: string;
  shipName: string;
  startDate: string; // ISO date "2026-07-10"
  endDate: string;
  coverPhotos: Record<string, string>; // date -> photoDataUrl
  createdAt: number;
}

export interface FamilyMember {
  id: string;
  cruiseId: string;
  name: string;
  color: string;
  emoji: string;
  isChild: boolean;
}

export interface EventPhoto {
  id: string;
  dataUrl: string; // base64 data URL
  caption: string;
  addedAt: number;
}

export interface CruiseEvent {
  id: string;
  cruiseId: string;
  title: string;
  date: string; // ISO date
  startTime: string; // "14:30" (24h)
  endTime: string;
  category: EventCategory;
  venue: string;
  deck: number | null;
  notes: string;
  memberIds: string[];
  reminderMinutes: number | null;
  photos: EventPhoto[];
  isFavorite: boolean;
  mood: MoodRating;
  createdAt: number;
  updatedAt: number;
}

export interface Venue {
  id: string;
  shipName: string;
  name: string;
  deck: number;
  category: string;
  isDefault: boolean;
}

export const CATEGORY_CONFIG: Record<
  EventCategory,
  { label: string; color: string }
> = {
  dining: { label: 'Dining', color: 'var(--color-cat-dining)' },
  entertainment: {
    label: 'Entertainment',
    color: 'var(--color-cat-entertainment)',
  },
  excursion: { label: 'Excursion', color: 'var(--color-cat-excursion)' },
  'kids-club': { label: 'Kids Club', color: 'var(--color-cat-kids-club)' },
  reservation: { label: 'Reservation', color: 'var(--color-cat-reservation)' },
  personal: { label: 'Personal', color: 'var(--color-cat-personal)' },
  reminder: { label: 'Reminder', color: 'var(--color-cat-reminder)' },
};

export const MEMBER_COLORS = [
  '#38bdf8',
  '#f472b6',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#fb923c',
  '#f87171',
  '#2dd4bf',
];

export const MEMBER_EMOJIS = [
  '👨', '👩', '👦', '👧', '👶', '🧑', '👴', '👵',
];
