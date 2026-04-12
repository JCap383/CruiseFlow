/**
 * #97: Demo cruise seed data.
 *
 * A realistic 7-night Caribbean cruise aboard NCL Prima with the Carter
 * family (4 members). Contains ~40 events across all categories, with
 * photos attached to roughly a third of them. All photo data uses small
 * placeholder SVGs (< 2 KB each) so the bundle stays tiny.
 *
 * Dates are computed relative to `today` by the seed function so that the
 * cruise always appears as recently-ended, which triggers the recap promo.
 */

import type { EventCategory, MoodRating } from '@/types';

// ---------------------------------------------------------------------------
// Placeholder photo generator
// ---------------------------------------------------------------------------

const PHOTO_PALETTES: [string, string, string][] = [
  ['#0ea5e9', '#0284c7', '#0369a1'], // ocean blue
  ['#f97316', '#ea580c', '#c2410c'], // sunset orange
  ['#10b981', '#059669', '#047857'], // tropical green
  ['#8b5cf6', '#7c3aed', '#6d28d9'], // twilight purple
  ['#f43f5e', '#e11d48', '#be123c'], // coral pink
  ['#eab308', '#ca8a04', '#a16207'], // golden
  ['#06b6d4', '#0891b2', '#0e7490'], // teal
  ['#ec4899', '#db2777', '#be185d'], // magenta
];

function makePlaceholderPhoto(
  label: string,
  paletteIdx: number,
): string {
  const [c1, c2, c3] = PHOTO_PALETTES[paletteIdx % PHOTO_PALETTES.length]!;
  // Encode a tiny SVG with a gradient + centered label. The viewBox is 4:3
  // so it looks like a landscape photo.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${c1}"/>
<stop offset="50%" stop-color="${c2}"/>
<stop offset="100%" stop-color="${c3}"/>
</linearGradient></defs>
<rect width="400" height="300" fill="url(#g)"/>
<text x="200" y="155" text-anchor="middle" fill="white" font-family="system-ui" font-size="20" font-weight="600" opacity="0.9">${escSvgText(label)}</text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function escSvgText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Family members
// ---------------------------------------------------------------------------

export interface DemoMember {
  name: string;
  emoji: string;
  color: string;
  isChild: boolean;
}

export const DEMO_MEMBERS: DemoMember[] = [
  { name: 'Josh', emoji: '👨', color: '#38bdf8', isChild: false },
  { name: 'Sarah', emoji: '👩', color: '#f472b6', isChild: false },
  { name: 'Emma', emoji: '👧', color: '#a78bfa', isChild: true },
  { name: 'Liam', emoji: '👦', color: '#34d399', isChild: true },
];

// ---------------------------------------------------------------------------
// Events (day offset 0 = embark day, 6 = last day, 7 = disembark)
// ---------------------------------------------------------------------------

export interface DemoEvent {
  dayOffset: number;
  title: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  venue: string;
  deck: number | null;
  notes: string;
  /** Indices into DEMO_MEMBERS to tag */
  memberIndices: number[];
  isFavorite: boolean;
  mood: MoodRating;
  /** Photo specs: [label, paletteIndex] */
  photos: [string, number][];
}

export const DEMO_EVENTS: DemoEvent[] = [
  // ── Day 0: Embark (Miami) ─────────────────────────────────────────
  {
    dayOffset: 0,
    title: 'Board the Ship',
    startTime: '14:00',
    endTime: '15:00',
    category: 'personal',
    venue: 'Embarkation Terminal',
    deck: 5,
    notes: 'Muster drill at 4 PM — don\'t be late!',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Boarding Day!', 0]],
  },
  {
    dayOffset: 0,
    title: 'Sail-Away Party',
    startTime: '17:00',
    endTime: '18:00',
    category: 'entertainment',
    venue: 'Pool Deck',
    deck: 17,
    notes: 'Live DJ and drinks on the pool deck',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Miami Skyline', 3], ['Sail Away!', 5]],
  },
  {
    dayOffset: 0,
    title: 'Welcome Dinner',
    startTime: '19:30',
    endTime: '21:00',
    category: 'dining',
    venue: 'Hudson\'s',
    deck: 6,
    notes: 'Dress code: smart casual',
    memberIndices: [0, 1, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [['First Dinner', 5]],
  },

  // ── Day 1: Sea Day ────────────────────────────────────────────────
  {
    dayOffset: 1,
    title: 'Sunrise Yoga',
    startTime: '07:00',
    endTime: '08:00',
    category: 'personal',
    venue: 'Sports Deck',
    deck: 18,
    notes: 'Bring a towel from the cabin',
    memberIndices: [1],
    isFavorite: false,
    mood: '😊',
    photos: [],
  },
  {
    dayOffset: 1,
    title: 'Splash Academy',
    startTime: '09:00',
    endTime: '11:30',
    category: 'kids-club',
    venue: 'Splash Academy',
    deck: 5,
    notes: 'Arts & crafts + pool games',
    memberIndices: [2, 3],
    isFavorite: false,
    mood: '🤩',
    photos: [['Kids Club', 2]],
  },
  {
    dayOffset: 1,
    title: 'Poolside Lunch',
    startTime: '12:00',
    endTime: '13:00',
    category: 'dining',
    venue: 'Surfside Cafe',
    deck: 17,
    notes: 'Burgers and milkshakes!',
    memberIndices: [0, 1, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [],
  },
  {
    dayOffset: 1,
    title: 'Waterslide Races',
    startTime: '14:00',
    endTime: '15:30',
    category: 'entertainment',
    venue: 'Aqua Park',
    deck: 18,
    notes: 'The Drop slide was insane!',
    memberIndices: [0, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Water Slides', 0], ['Pool Day', 6]],
  },
  {
    dayOffset: 1,
    title: 'Comedy Show',
    startTime: '20:00',
    endTime: '21:30',
    category: 'entertainment',
    venue: 'Social Comedy Club',
    deck: 7,
    notes: '',
    memberIndices: [0, 1],
    isFavorite: false,
    mood: '😊',
    photos: [],
  },

  // ── Day 2: Cozumel, Mexico ────────────────────────────────────────
  {
    dayOffset: 2,
    title: 'Snorkeling Excursion',
    startTime: '08:30',
    endTime: '12:00',
    category: 'excursion',
    venue: 'Cozumel Reef',
    deck: null,
    notes: 'Incredible coral reef — saw a sea turtle!',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Coral Reef', 0], ['Sea Turtle!', 6], ['Snorkeling', 2]],
  },
  {
    dayOffset: 2,
    title: 'Tacos on the Beach',
    startTime: '12:30',
    endTime: '14:00',
    category: 'dining',
    venue: 'Playa del Carmen',
    deck: null,
    notes: 'Best fish tacos we\'ve ever had',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Beach Tacos', 1]],
  },
  {
    dayOffset: 2,
    title: 'Shopping in Town',
    startTime: '14:00',
    endTime: '16:00',
    category: 'personal',
    venue: 'Cozumel Town Center',
    deck: null,
    notes: 'Picked up a hand-painted vase',
    memberIndices: [0, 1],
    isFavorite: false,
    mood: '😊',
    photos: [['Cozumel Town', 1]],
  },
  {
    dayOffset: 2,
    title: 'Formal Night Dinner',
    startTime: '19:00',
    endTime: '21:00',
    category: 'dining',
    venue: 'Hudson\'s',
    deck: 6,
    notes: 'Captain\'s table! Everyone dressed up nicely.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Formal Night', 7]],
  },

  // ── Day 3: Roatán, Honduras ───────────────────────────────────────
  {
    dayOffset: 3,
    title: 'Zip Line Adventure',
    startTime: '09:00',
    endTime: '12:00',
    category: 'excursion',
    venue: 'Gumbalimba Park',
    deck: null,
    notes: 'Flew over the jungle canopy — Emma screamed the whole time 😂',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Zip Line!', 2], ['Jungle Canopy', 2]],
  },
  {
    dayOffset: 3,
    title: 'West Bay Beach',
    startTime: '13:00',
    endTime: '16:00',
    category: 'personal',
    venue: 'West Bay',
    deck: null,
    notes: 'Crystal clear water. Liam built the most epic sandcastle.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['West Bay Beach', 0], ['Sandcastle', 5]],
  },
  {
    dayOffset: 3,
    title: 'Teppanyaki Dinner',
    startTime: '19:00',
    endTime: '20:30',
    category: 'reservation',
    venue: 'Teppanyaki',
    deck: 8,
    notes: 'The chef threw shrimp into Liam\'s mouth!',
    memberIndices: [0, 1, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [['Teppanyaki Show', 1]],
  },
  {
    dayOffset: 3,
    title: 'Stargazing',
    startTime: '22:00',
    endTime: '23:00',
    category: 'personal',
    venue: 'Forward Observation',
    deck: 19,
    notes: 'Could see the Milky Way out at sea',
    memberIndices: [0, 1],
    isFavorite: true,
    mood: '🤩',
    photos: [['Night Sky', 3]],
  },

  // ── Day 4: Sea Day ────────────────────────────────────────────────
  {
    dayOffset: 4,
    title: 'Ropes Course',
    startTime: '10:00',
    endTime: '11:30',
    category: 'entertainment',
    venue: 'Adventure Deck',
    deck: 19,
    notes: 'Made it all the way across the plank!',
    memberIndices: [0, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [['Ropes Course', 2]],
  },
  {
    dayOffset: 4,
    title: 'Spa Morning',
    startTime: '10:00',
    endTime: '12:00',
    category: 'reservation',
    venue: 'Mandara Spa',
    deck: 16,
    notes: 'Hot stone massage. Sarah said best birthday gift ever.',
    memberIndices: [1],
    isFavorite: true,
    mood: '🤩',
    photos: [],
  },
  {
    dayOffset: 4,
    title: 'Trivia Tournament',
    startTime: '14:00',
    endTime: '15:00',
    category: 'entertainment',
    venue: 'Atrium Bar',
    deck: 6,
    notes: 'Our team "The Sea Legs" came in 2nd!',
    memberIndices: [0, 1],
    isFavorite: false,
    mood: '😊',
    photos: [],
  },
  {
    dayOffset: 4,
    title: 'Movie Under the Stars',
    startTime: '20:30',
    endTime: '22:30',
    category: 'entertainment',
    venue: 'Pool Deck',
    deck: 17,
    notes: 'Watched Finding Nemo with hot cocoa',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '😊',
    photos: [['Movie Night', 3]],
  },

  // ── Day 5: Costa Maya, Mexico ─────────────────────────────────────
  {
    dayOffset: 5,
    title: 'Mayan Ruins Tour',
    startTime: '08:00',
    endTime: '13:00',
    category: 'excursion',
    venue: 'Chacchoben Ruins',
    deck: null,
    notes: 'Incredible history. Guide was amazing with the kids.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Mayan Ruins', 1], ['Ancient Temple', 5], ['Jungle Path', 2]],
  },
  {
    dayOffset: 5,
    title: 'Port Shopping',
    startTime: '13:30',
    endTime: '15:00',
    category: 'personal',
    venue: 'Costa Maya Port Village',
    deck: null,
    notes: 'Got matching family bracelets',
    memberIndices: [0, 1, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [['Port Village', 1]],
  },
  {
    dayOffset: 5,
    title: 'Cagney\'s Steakhouse',
    startTime: '19:00',
    endTime: '21:00',
    category: 'reservation',
    venue: 'Cagney\'s Steakhouse',
    deck: 8,
    notes: 'Celebrated being halfway through the trip!',
    memberIndices: [0, 1],
    isFavorite: false,
    mood: '😊',
    photos: [['Steakhouse', 7]],
  },
  {
    dayOffset: 5,
    title: 'Splash Academy Evening',
    startTime: '19:00',
    endTime: '21:30',
    category: 'kids-club',
    venue: 'Splash Academy',
    deck: 5,
    notes: 'Pajama party and glow stick dance',
    memberIndices: [2, 3],
    isFavorite: false,
    mood: '🤩',
    photos: [],
  },

  // ── Day 6: Sea Day (last full day) ────────────────────────────────
  {
    dayOffset: 6,
    title: 'Family Photo Shoot',
    startTime: '09:00',
    endTime: '09:45',
    category: 'personal',
    venue: 'Atrium',
    deck: 6,
    notes: 'Professional photos! Will pick them up at the gallery.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Family Portrait', 7], ['Silly Poses', 4]],
  },
  {
    dayOffset: 6,
    title: 'Go-Kart Racing',
    startTime: '10:30',
    endTime: '11:30',
    category: 'entertainment',
    venue: 'Speedway',
    deck: 19,
    notes: 'Liam won three races straight. Future F1 driver?',
    memberIndices: [0, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Go-Karts!', 4]],
  },
  {
    dayOffset: 6,
    title: 'Farewell Lunch',
    startTime: '12:30',
    endTime: '14:00',
    category: 'dining',
    venue: 'The Local Bar & Grill',
    deck: 8,
    notes: 'Had one last round of desserts. Liam ate three brownies.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [],
  },
  {
    dayOffset: 6,
    title: 'Sunset at Sea',
    startTime: '18:00',
    endTime: '19:00',
    category: 'personal',
    venue: 'Aft Observation',
    deck: 17,
    notes: 'The most beautiful sunset of the trip. Didn\'t want it to end.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [['Last Sunset', 1], ['Golden Hour', 5]],
  },
  {
    dayOffset: 6,
    title: 'Broadway Show',
    startTime: '20:00',
    endTime: '21:30',
    category: 'entertainment',
    venue: 'Prima Theater',
    deck: 6,
    notes: 'Incredible finale show. Standing ovation.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: true,
    mood: '🤩',
    photos: [],
  },
  {
    dayOffset: 6,
    title: 'Pack Luggage',
    startTime: '22:00',
    endTime: '23:00',
    category: 'reminder',
    venue: 'Cabin',
    deck: null,
    notes: 'Set bags outside door by 11 PM',
    memberIndices: [0, 1],
    isFavorite: false,
    mood: '😐',
    photos: [],
  },

  // ── Day 7: Disembark ──────────────────────────────────────────────
  {
    dayOffset: 7,
    title: 'Final Breakfast',
    startTime: '07:00',
    endTime: '08:00',
    category: 'dining',
    venue: 'Hudson\'s',
    deck: 6,
    notes: 'Last buffet run. Already missing ship life.',
    memberIndices: [0, 1, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [],
  },
  {
    dayOffset: 7,
    title: 'Disembark',
    startTime: '09:00',
    endTime: '10:00',
    category: 'personal',
    venue: 'Miami Terminal',
    deck: null,
    notes: 'Until next time! 🚢',
    memberIndices: [0, 1, 2, 3],
    isFavorite: false,
    mood: '😊',
    photos: [['Goodbye Ship!', 0]],
  },
];

// ---------------------------------------------------------------------------
// Cover photos — one per day (except disembark day)
// ---------------------------------------------------------------------------

export const DEMO_COVER_PHOTOS: { dayOffset: number; label: string; palette: number }[] = [
  { dayOffset: 0, label: 'Embark Day', palette: 0 },
  { dayOffset: 1, label: 'Sea Day Fun', palette: 6 },
  { dayOffset: 2, label: 'Cozumel', palette: 2 },
  { dayOffset: 3, label: 'Roatán', palette: 2 },
  { dayOffset: 4, label: 'Sea Day', palette: 3 },
  { dayOffset: 5, label: 'Costa Maya', palette: 1 },
  { dayOffset: 6, label: 'Last Day', palette: 5 },
];

// ---------------------------------------------------------------------------
// Export the photo generator for use by seedDemoCruise
// ---------------------------------------------------------------------------

export { makePlaceholderPhoto };
