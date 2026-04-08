import type { Venue } from '@/types';
import { db } from './database';

// ─── Per-ship venue data ──────────────────────────────────────────────
type VenueEntry = Omit<Venue, 'id'>;

// ── NCL Prima ─────────────────────────────────────────────────────────
const NCL_PRIMA: Omit<VenueEntry, 'shipName'>[] = [
  // Dining — Complimentary
  { name: 'Hudson\'s', deck: 6, category: 'dining', isDefault: true },
  { name: 'The Commodore Room', deck: 6, category: 'dining', isDefault: true },
  { name: 'Surfside Cafe & Grill', deck: 17, category: 'dining', isDefault: true },
  { name: 'The Local Bar & Grill', deck: 8, category: 'dining', isDefault: true },
  { name: 'Indulge Food Hall', deck: 8, category: 'dining', isDefault: true },
  { name: 'Garden Cafe', deck: 16, category: 'dining', isDefault: true },
  { name: 'The Great Outdoors', deck: 16, category: 'dining', isDefault: true },
  // Dining — Specialty
  { name: 'Onda by Scarpetta', deck: 8, category: 'dining', isDefault: true },
  { name: 'Palomar', deck: 8, category: 'dining', isDefault: true },
  { name: 'Los Lobos', deck: 8, category: 'dining', isDefault: true },
  { name: 'Food Republic', deck: 8, category: 'dining', isDefault: true },
  { name: 'Hasuki', deck: 8, category: 'dining', isDefault: true },
  { name: 'Le Bistro', deck: 8, category: 'dining', isDefault: true },
  { name: 'Cagney\'s Steakhouse', deck: 8, category: 'dining', isDefault: true },
  { name: 'Q Texas Smokehouse', deck: 8, category: 'dining', isDefault: true },
  { name: 'Nama Sushi & Sashimi', deck: 8, category: 'dining', isDefault: true },
  // Bars
  { name: 'Penrose Bar', deck: 7, category: 'bar', isDefault: true },
  { name: 'Metropolitan Bar', deck: 6, category: 'bar', isDefault: true },
  { name: 'Belvedere Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'The Haven Lounge', deck: 18, category: 'bar', isDefault: true },
  { name: 'Vibe Beach Club Bar', deck: 17, category: 'bar', isDefault: true },
  { name: 'Waves Pool Bar', deck: 17, category: 'bar', isDefault: true },
  { name: 'The Lido Bar', deck: 16, category: 'bar', isDefault: true },
  { name: 'Whiskey Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'The Soleil Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'Starbucks', deck: 8, category: 'bar', isDefault: true },
  // Entertainment
  { name: 'Prima Theater & Club', deck: 6, category: 'entertainment', isDefault: true },
  { name: 'Improv at Sea', deck: 7, category: 'entertainment', isDefault: true },
  { name: 'The Stadium', deck: 17, category: 'entertainment', isDefault: true },
  { name: 'Casino', deck: 7, category: 'entertainment', isDefault: true },
  { name: 'Game Gallery', deck: 7, category: 'entertainment', isDefault: true },
  { name: 'Bull\'s Eye', deck: 7, category: 'entertainment', isDefault: true },
  { name: 'Syd Norman\'s Pour House', deck: 8, category: 'entertainment', isDefault: true },
  // Kids
  { name: 'Splash Academy', deck: 5, category: 'kids', isDefault: true },
  { name: 'Guppies Nursery', deck: 5, category: 'kids', isDefault: true },
  { name: 'Entourage Teen Club', deck: 5, category: 'kids', isDefault: true },
  // Pools
  { name: 'Main Pool', deck: 17, category: 'pool', isDefault: true },
  { name: 'Infinity Beach', deck: 8, category: 'pool', isDefault: true },
  { name: 'Vibe Beach Club', deck: 17, category: 'pool', isDefault: true },
  { name: 'Tidal Wave Waterslide', deck: 17, category: 'pool', isDefault: true },
  // Activities
  { name: 'The Drop', deck: 17, category: 'activity', isDefault: true },
  { name: 'Go-Kart Speedway', deck: 18, category: 'activity', isDefault: true },
  { name: 'The Rush', deck: 17, category: 'activity', isDefault: true },
  { name: 'Galaxy Pavilion', deck: 7, category: 'activity', isDefault: true },
  { name: 'Sports Court', deck: 17, category: 'activity', isDefault: true },
  { name: 'Running Track', deck: 17, category: 'activity', isDefault: true },
  { name: 'Mini Golf', deck: 17, category: 'activity', isDefault: true },
  // Spa
  { name: 'Mandara Spa', deck: 5, category: 'spa', isDefault: true },
  { name: 'Pulse Fitness Center', deck: 5, category: 'spa', isDefault: true },
  { name: 'Thermal Suite', deck: 5, category: 'spa', isDefault: true },
  // Services
  { name: 'Guest Services', deck: 6, category: 'service', isDefault: true },
  { name: 'Shore Excursions', deck: 7, category: 'service', isDefault: true },
  { name: 'Photo Gallery', deck: 7, category: 'service', isDefault: true },
  { name: 'Shops', deck: 8, category: 'service', isDefault: true },
];

// ── Oasis of the Seas ─────────────────────────────────────────────────
const OASIS_OF_THE_SEAS: Omit<VenueEntry, 'shipName'>[] = [
  // Dining — Complimentary
  { name: 'Opus Dining Room', deck: 3, category: 'dining', isDefault: true },
  { name: 'Cafe Promenade', deck: 5, category: 'dining', isDefault: true },
  { name: "Sorrento's Pizza", deck: 5, category: 'dining', isDefault: true },
  { name: 'Park Cafe', deck: 8, category: 'dining', isDefault: true },
  { name: 'Windjammer Marketplace', deck: 16, category: 'dining', isDefault: true },
  { name: 'Solarium Bistro', deck: 15, category: 'dining', isDefault: true },
  { name: 'El Loco Fresh', deck: 15, category: 'dining', isDefault: true },
  { name: 'Boardwalk Dog House', deck: 6, category: 'dining', isDefault: true },
  { name: 'Coastal Kitchen', deck: 17, category: 'dining', isDefault: true },
  // Dining — Specialty
  { name: '150 Central Park', deck: 8, category: 'dining', isDefault: true },
  { name: 'Chops Grille', deck: 8, category: 'dining', isDefault: true },
  { name: "Giovanni's Italian Kitchen", deck: 8, category: 'dining', isDefault: true },
  { name: 'Izumi Hibachi & Sushi', deck: 4, category: 'dining', isDefault: true },
  { name: 'Johnny Rockets', deck: 6, category: 'dining', isDefault: true },
  { name: 'Portside BBQ', deck: 15, category: 'dining', isDefault: true },
  { name: 'Playmakers Sports Bar & Arcade', deck: 6, category: 'dining', isDefault: true },
  { name: "Chef's Table", deck: 8, category: 'dining', isDefault: true },
  // Bars
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
  // Entertainment
  { name: 'Royal Theater', deck: 3, category: 'entertainment', isDefault: true },
  { name: 'Studio B', deck: 3, category: 'entertainment', isDefault: true },
  { name: 'AquaTheater', deck: 6, category: 'entertainment', isDefault: true },
  { name: 'Casino Royale', deck: 4, category: 'entertainment', isDefault: true },
  { name: 'Blaze Comedy Club', deck: 4, category: 'entertainment', isDefault: true },
  { name: 'Spotlight Karaoke', deck: 5, category: 'entertainment', isDefault: true },
  { name: 'Carousel', deck: 6, category: 'entertainment', isDefault: true },
  { name: 'Escape The Rubicon', deck: 14, category: 'entertainment', isDefault: true },
  // Kids
  { name: 'Adventure Ocean', deck: 14, category: 'kids', isDefault: true },
  { name: 'Nursery', deck: 14, category: 'kids', isDefault: true },
  { name: 'Teen Lounge', deck: 15, category: 'kids', isDefault: true },
  { name: 'Splashaway Bay', deck: 15, category: 'kids', isDefault: true },
  // Pools
  { name: 'Main Pool', deck: 15, category: 'pool', isDefault: true },
  { name: 'Sports Pool', deck: 15, category: 'pool', isDefault: true },
  { name: 'Beach Pool', deck: 15, category: 'pool', isDefault: true },
  { name: 'Solarium', deck: 15, category: 'pool', isDefault: true },
  { name: 'Whirlpools', deck: 16, category: 'pool', isDefault: true },
  // Activities
  { name: 'FlowRider', deck: 16, category: 'activity', isDefault: true },
  { name: 'Ultimate Abyss', deck: 16, category: 'activity', isDefault: true },
  { name: 'The Perfect Storm', deck: 15, category: 'activity', isDefault: true },
  { name: 'Sports Court', deck: 15, category: 'activity', isDefault: true },
  { name: 'Oasis Dunes Mini Golf', deck: 15, category: 'activity', isDefault: true },
  { name: 'Zip Line', deck: 16, category: 'activity', isDefault: true },
  { name: 'Rock Climbing Wall', deck: 16, category: 'activity', isDefault: true },
  { name: 'Running Track', deck: 5, category: 'activity', isDefault: true },
  // Spa
  { name: 'Vitality at Sea Spa', deck: 5, category: 'spa', isDefault: true },
  { name: 'Fitness Center', deck: 6, category: 'spa', isDefault: true },
  // Services
  { name: 'Guest Services', deck: 5, category: 'service', isDefault: true },
  { name: 'Shore Excursions', deck: 6, category: 'service', isDefault: true },
  { name: 'Conference Center', deck: 3, category: 'service', isDefault: true },
  { name: 'Art Gallery', deck: 4, category: 'service', isDefault: true },
];

// ── Ship registry ─────────────────────────────────────────────────────
const SHIP_VENUES: Record<string, Omit<VenueEntry, 'shipName'>[]> = {
  'ncl prima': NCL_PRIMA,
  'norwegian prima': NCL_PRIMA,
  'oasis of the seas': OASIS_OF_THE_SEAS,
};

/** Normalize ship name for lookup */
function normalizeShipName(name: string): string {
  return name.toLowerCase().trim();
}

/** Get venue list for a ship. Falls back to empty if unknown ship. */
export function getVenuesForShip(shipName: string): Omit<VenueEntry, 'shipName'>[] {
  return SHIP_VENUES[normalizeShipName(shipName)] ?? [];
}

/** Get list of all known ship names */
export function getKnownShips(): string[] {
  return ['NCL Prima', 'Oasis of the Seas'];
}

export async function seedVenues() {
  const count = await db.venues.count();
  if (count === 0) {
    // Seed all ships
    const allVenues: (Omit<VenueEntry, 'shipName'> & { shipName: string })[] = [];
    for (const [key, venues] of Object.entries(SHIP_VENUES)) {
      // Use the canonical display name
      const displayName = key === 'ncl prima' ? 'NCL Prima'
        : key === 'norwegian prima' ? 'NCL Prima'
        : key === 'oasis of the seas' ? 'Oasis of the Seas'
        : key;
      // Skip duplicates (norwegian prima = ncl prima)
      if (key === 'norwegian prima') continue;
      for (const v of venues) {
        allVenues.push({ ...v, shipName: displayName });
      }
    }
    const venues = allVenues.map((v, i) => ({
      ...v,
      id: `venue-${i}`,
    }));
    await db.venues.bulkAdd(venues);
  }
}

// Force re-seed (used when upgrading venue data)
export async function reseedVenues() {
  await db.venues.clear();
  await seedVenues();
}
