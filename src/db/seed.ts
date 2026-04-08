import type { Venue } from '@/types';
import { db } from './database';

// Oasis of the Seas — accurate deck/venue data
const DEFAULT_VENUES: Omit<Venue, 'id'>[] = [
  // ── Dining — Complimentary ────────────────────────────────────────
  { name: 'Opus Dining Room', deck: 3, category: 'dining', isDefault: true },
  { name: 'Cafe Promenade', deck: 5, category: 'dining', isDefault: true },
  { name: "Sorrento's Pizza", deck: 5, category: 'dining', isDefault: true },
  { name: 'Park Cafe', deck: 8, category: 'dining', isDefault: true },
  { name: 'Windjammer Marketplace', deck: 16, category: 'dining', isDefault: true },
  { name: 'Solarium Bistro', deck: 15, category: 'dining', isDefault: true },
  { name: 'El Loco Fresh', deck: 15, category: 'dining', isDefault: true },
  { name: 'Boardwalk Dog House', deck: 6, category: 'dining', isDefault: true },
  { name: 'Coastal Kitchen', deck: 17, category: 'dining', isDefault: true },
  // ── Dining — Specialty ────────────────────────────────────────────
  { name: '150 Central Park', deck: 8, category: 'dining', isDefault: true },
  { name: 'Chops Grille', deck: 8, category: 'dining', isDefault: true },
  { name: "Giovanni's Italian Kitchen", deck: 8, category: 'dining', isDefault: true },
  { name: 'Izumi Hibachi & Sushi', deck: 4, category: 'dining', isDefault: true },
  { name: 'Johnny Rockets', deck: 6, category: 'dining', isDefault: true },
  { name: 'Portside BBQ', deck: 15, category: 'dining', isDefault: true },
  { name: 'Playmakers Sports Bar & Arcade', deck: 6, category: 'dining', isDefault: true },
  { name: "Chef's Table", deck: 8, category: 'dining', isDefault: true },
  // ── Bars ──────────────────────────────────────────────────────────
  { name: 'Boleros', deck: 5, category: 'bar', isDefault: true },
  { name: 'Globe & Atlas Pub', deck: 5, category: 'bar', isDefault: true },
  { name: 'Rising Tide Bar', deck: 5, category: 'bar', isDefault: true },
  { name: 'Bionic Bar', deck: 5, category: 'bar', isDefault: true },
  { name: 'Schooner Bar', deck: 6, category: 'bar', isDefault: true },
  { name: 'Vintages Wine Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'Trellis Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'Music Hall', deck: 8, category: 'bar', isDefault: true },
  { name: 'The Lime & Coconut', deck: 15, category: 'bar', isDefault: true },
  { name: 'Solarium Bar', deck: 16, category: 'bar', isDefault: true },
  { name: 'Wipeout Bar', deck: 16, category: 'bar', isDefault: true },
  { name: 'Casino Bar', deck: 4, category: 'bar', isDefault: true },
  { name: 'Suite Lounge', deck: 17, category: 'bar', isDefault: true },
  { name: 'Suite Sun Deck Bar', deck: 17, category: 'bar', isDefault: true },
  { name: 'Starbucks', deck: 5, category: 'bar', isDefault: true },
  // ── Entertainment ─────────────────────────────────────────────────
  { name: 'Royal Theater', deck: 3, category: 'entertainment', isDefault: true },
  { name: 'Studio B', deck: 3, category: 'entertainment', isDefault: true },
  { name: 'AquaTheater', deck: 6, category: 'entertainment', isDefault: true },
  { name: 'Casino Royale', deck: 4, category: 'entertainment', isDefault: true },
  { name: 'Blaze Comedy Club', deck: 4, category: 'entertainment', isDefault: true },
  { name: 'Spotlight Karaoke', deck: 5, category: 'entertainment', isDefault: true },
  { name: 'Carousel', deck: 6, category: 'entertainment', isDefault: true },
  { name: 'Escape The Rubicon', deck: 14, category: 'entertainment', isDefault: true },
  // ── Kids ──────────────────────────────────────────────────────────
  { name: 'Adventure Ocean', deck: 14, category: 'kids', isDefault: true },
  { name: 'Nursery', deck: 14, category: 'kids', isDefault: true },
  { name: 'Teen Lounge', deck: 15, category: 'kids', isDefault: true },
  { name: 'Splashaway Bay', deck: 15, category: 'kids', isDefault: true },
  // ── Pools ─────────────────────────────────────────────────────────
  { name: 'Main Pool', deck: 15, category: 'pool', isDefault: true },
  { name: 'Sports Pool', deck: 15, category: 'pool', isDefault: true },
  { name: 'Beach Pool', deck: 15, category: 'pool', isDefault: true },
  { name: 'Solarium', deck: 15, category: 'pool', isDefault: true },
  { name: 'Whirlpools', deck: 16, category: 'pool', isDefault: true },
  // ── Activities ────────────────────────────────────────────────────
  { name: 'FlowRider', deck: 16, category: 'activity', isDefault: true },
  { name: 'Ultimate Abyss', deck: 16, category: 'activity', isDefault: true },
  { name: 'The Perfect Storm', deck: 15, category: 'activity', isDefault: true },
  { name: 'Sports Court', deck: 15, category: 'activity', isDefault: true },
  { name: 'Oasis Dunes Mini Golf', deck: 15, category: 'activity', isDefault: true },
  { name: 'Zip Line', deck: 16, category: 'activity', isDefault: true },
  { name: 'Rock Climbing Wall', deck: 16, category: 'activity', isDefault: true },
  { name: 'Running Track', deck: 5, category: 'activity', isDefault: true },
  // ── Spa ───────────────────────────────────────────────────────────
  { name: 'Vitality at Sea Spa', deck: 5, category: 'spa', isDefault: true },
  { name: 'Fitness Center', deck: 6, category: 'spa', isDefault: true },
  // ── Services ──────────────────────────────────────────────────────
  { name: 'Guest Services', deck: 5, category: 'service', isDefault: true },
  { name: 'Shore Excursions', deck: 6, category: 'service', isDefault: true },
  { name: 'Conference Center', deck: 3, category: 'service', isDefault: true },
  { name: 'Art Gallery', deck: 4, category: 'service', isDefault: true },
];

export async function seedVenues() {
  const count = await db.venues.count();
  if (count === 0) {
    const venues = DEFAULT_VENUES.map((v, i) => ({
      ...v,
      id: `venue-${i}`,
    }));
    await db.venues.bulkAdd(venues);
  }
}

// Force re-seed (used when upgrading venue data)
export async function reseedVenues() {
  await db.venues.clear();
  const venues = DEFAULT_VENUES.map((v, i) => ({
    ...v,
    id: `venue-${i}`,
  }));
  await db.venues.bulkAdd(venues);
}
