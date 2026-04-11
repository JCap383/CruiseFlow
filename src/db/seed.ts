import type { Venue } from '@/types';
import { db } from './database';
import { getAllShipNames, findShip } from './shipCatalog';

// ─── Per-ship venue data ──────────────────────────────────────────────
type VenueEntry = Omit<Venue, 'id'>;

// ── NCL Prima ─────────────────────────────────────────────────────────
//
// Comprehensive venue catalog cross-referenced from NCL.com, CruiseMapper
// (deck-by-deck plans), eatsleepcruise.com, and cruisecritic.com. Decks are
// the official ones used in NCL's published deck plans.
const NCL_PRIMA: Omit<VenueEntry, 'shipName'>[] = [
  // ── Dining — Complimentary main dining ────────────────────────────
  { name: "Hudson's", deck: 7, category: 'dining', isDefault: true },
  { name: 'The Commodore Room', deck: 6, category: 'dining', isDefault: true },
  { name: 'The Haven Restaurant', deck: 17, category: 'dining', isDefault: true },
  // ── Dining — Casual / complimentary ───────────────────────────────
  { name: 'Surfside Cafe & Grill', deck: 17, category: 'dining', isDefault: true },
  { name: 'The Local Bar & Grill', deck: 8, category: 'dining', isDefault: true },
  { name: 'The Local on Ocean Boulevard', deck: 8, category: 'dining', isDefault: true },
  { name: 'Indulge Food Hall', deck: 8, category: 'dining', isDefault: true },
  // Indulge Food Hall stations (each is its own walk-up counter)
  { name: 'Garden Kitchen', deck: 8, category: 'dining', isDefault: true },
  { name: 'Q Texas Smokehouse', deck: 8, category: 'dining', isDefault: true },
  { name: 'Tamara', deck: 8, category: 'dining', isDefault: true },
  { name: 'Latin Quarter', deck: 8, category: 'dining', isDefault: true },
  { name: 'Nudls', deck: 8, category: 'dining', isDefault: true },
  { name: 'Seaside Rotisserie', deck: 8, category: 'dining', isDefault: true },
  { name: 'Tapas', deck: 8, category: 'dining', isDefault: true },
  { name: 'Just Desserts', deck: 8, category: 'dining', isDefault: true },
  { name: 'Just Ice Cream', deck: 8, category: 'dining', isDefault: true },
  { name: "Coco's Crepes & Coffee", deck: 8, category: 'dining', isDefault: true },
  // ── Dining — Specialty (à la carte / package) ─────────────────────
  { name: 'Cagney\'s Steakhouse', deck: 6, category: 'dining', isDefault: true },
  { name: 'Le Bistro', deck: 7, category: 'dining', isDefault: true },
  { name: 'Hasuki', deck: 7, category: 'dining', isDefault: true },
  { name: 'Nama Sushi & Sashimi', deck: 7, category: 'dining', isDefault: true },
  { name: 'Onda by Scarpetta', deck: 8, category: 'dining', isDefault: true },
  { name: 'Los Lobos', deck: 8, category: 'dining', isDefault: true },
  { name: 'Palomar', deck: 17, category: 'dining', isDefault: true },
  { name: 'Food Republic', deck: 17, category: 'dining', isDefault: true },
  // ── Dining — Coffee & quick bites ─────────────────────────────────
  { name: 'Starbucks', deck: 7, category: 'dining', isDefault: true },
  { name: 'Observation Lounge Cafe', deck: 15, category: 'dining', isDefault: true },

  // ── Bars & Lounges ────────────────────────────────────────────────
  { name: 'Penrose Bar', deck: 6, category: 'bar', isDefault: true },
  { name: 'Belvedere Bar', deck: 6, category: 'bar', isDefault: true },
  { name: 'Whiskey Bar', deck: 6, category: 'bar', isDefault: true },
  { name: 'Metropolitan Bar', deck: 7, category: 'bar', isDefault: true },
  { name: "Syd Norman's Pour House", deck: 7, category: 'bar', isDefault: true },
  { name: 'Soleil Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'Luna Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'La Terraza', deck: 8, category: 'bar', isDefault: true },
  { name: 'Indulge Outdoor Lounge', deck: 8, category: 'bar', isDefault: true },
  { name: 'Observation Lounge & Bar', deck: 15, category: 'bar', isDefault: true },
  { name: 'The Haven Lounge', deck: 16, category: 'bar', isDefault: true },
  { name: 'Vibe Beach Club Bar', deck: 17, category: 'bar', isDefault: true },
  { name: 'Waves Pool Bar', deck: 17, category: 'bar', isDefault: true },
  { name: 'Prima Speedway Bar', deck: 18, category: 'bar', isDefault: true },

  // ── Entertainment ─────────────────────────────────────────────────
  { name: 'Prima Theater & Club', deck: 6, category: 'entertainment', isDefault: true },
  { name: 'The Improv at Sea', deck: 7, category: 'entertainment', isDefault: true },
  { name: 'Prima Casino', deck: 6, category: 'entertainment', isDefault: true },

  // ── Kids & Teens ──────────────────────────────────────────────────
  { name: 'Splash Academy', deck: 15, category: 'kids', isDefault: true },
  { name: 'Guppies Nursery', deck: 15, category: 'kids', isDefault: true },
  { name: "Kids' Aqua Park", deck: 15, category: 'kids', isDefault: true },
  { name: 'Entourage Teen Club', deck: 18, category: 'kids', isDefault: true },

  // ── Pools & Whirlpools ────────────────────────────────────────────
  { name: 'Infinity Beach (Port)', deck: 8, category: 'pool', isDefault: true },
  { name: 'Infinity Beach (Starboard)', deck: 8, category: 'pool', isDefault: true },
  { name: 'The Haven Pool', deck: 16, category: 'pool', isDefault: true },
  { name: 'Main Pool', deck: 17, category: 'pool', isDefault: true },
  { name: 'Vibe Beach Club', deck: 17, category: 'pool', isDefault: true },
  { name: 'Aqua Park Whirlpools', deck: 18, category: 'pool', isDefault: true },

  // ── Activities & Sports ───────────────────────────────────────────
  { name: 'Ocean Boulevard Walking Track', deck: 8, category: 'activity', isDefault: true },
  { name: 'Oceanwalk Glass Bridges', deck: 8, category: 'activity', isDefault: true },
  { name: 'The Concourse Sculpture Garden', deck: 8, category: 'activity', isDefault: true },
  { name: 'Galaxy Pavilion', deck: 17, category: 'activity', isDefault: true },
  { name: 'Tidal Wave Waterslide', deck: 17, category: 'activity', isDefault: true },
  { name: 'The Wave Waterslide', deck: 18, category: 'activity', isDefault: true },
  { name: 'Ocean Loop Waterslides', deck: 18, category: 'activity', isDefault: true },
  { name: 'The Drop', deck: 18, category: 'activity', isDefault: true },
  { name: 'The Rush', deck: 18, category: 'activity', isDefault: true },
  { name: 'The Stadium', deck: 18, category: 'activity', isDefault: true },
  { name: 'Tee Time Mini Golf', deck: 18, category: 'activity', isDefault: true },
  { name: "The Bull's Eye", deck: 18, category: 'activity', isDefault: true },
  { name: 'Prima Speedway (Lower)', deck: 18, category: 'activity', isDefault: true },
  { name: 'Prima Speedway (Upper)', deck: 19, category: 'activity', isDefault: true },
  { name: 'Speedway Viewing Deck', deck: 20, category: 'activity', isDefault: true },

  // ── Spa & Fitness ─────────────────────────────────────────────────
  { name: 'Mandara Spa & Salon', deck: 16, category: 'spa', isDefault: true },
  { name: 'Pulse Fitness Center', deck: 16, category: 'spa', isDefault: true },
  { name: 'Thermal Suite', deck: 16, category: 'spa', isDefault: true },
  { name: 'Vitality Pool', deck: 16, category: 'spa', isDefault: true },
  { name: 'Salt Room', deck: 16, category: 'spa', isDefault: true },
  { name: 'Aerobics Studio', deck: 16, category: 'spa', isDefault: true },

  // ── Services & Shopping ───────────────────────────────────────────
  { name: 'Guest Services', deck: 7, category: 'service', isDefault: true },
  { name: 'Shore Excursions', deck: 7, category: 'service', isDefault: true },
  { name: 'The Gateway Shops', deck: 7, category: 'service', isDefault: true },
  { name: 'Effy Jewelry', deck: 7, category: 'service', isDefault: true },
  { name: 'Art Gallery', deck: 7, category: 'service', isDefault: true },
  { name: 'I-Connect Internet Cafe', deck: 7, category: 'service', isDefault: true },
  { name: 'Roberto Coin', deck: 6, category: 'service', isDefault: true },
  { name: 'Pandora Jewelry', deck: 8, category: 'service', isDefault: true },
  { name: 'Tech@Sea', deck: 8, category: 'service', isDefault: true },
  { name: 'Perspectives Photo Studio', deck: 8, category: 'service', isDefault: true },
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
  { name: "Chef's Table", deck: 12, category: 'dining', isDefault: true },
  // Bars
  { name: 'Boleros', deck: 5, category: 'bar', isDefault: true },
  { name: 'Globe & Atlas Pub', deck: 5, category: 'bar', isDefault: true },
  { name: 'Rising Tide Bar', deck: 5, category: 'bar', isDefault: true },
  { name: 'Bionic Bar', deck: 5, category: 'bar', isDefault: true },
  { name: 'Schooner Bar', deck: 6, category: 'bar', isDefault: true },
  { name: 'Vintages Wine Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'Trellis Bar', deck: 8, category: 'bar', isDefault: true },
  { name: 'Music Hall', deck: 9, category: 'bar', isDefault: true },
  { name: 'The Lime & Coconut', deck: 15, category: 'bar', isDefault: true },
  { name: 'Solarium Bar', deck: 16, category: 'bar', isDefault: true },
  { name: 'Wipeout Bar', deck: 16, category: 'bar', isDefault: true },
  { name: 'Casino Bar', deck: 4, category: 'bar', isDefault: true },
  { name: 'Suite Lounge', deck: 17, category: 'bar', isDefault: true },
  { name: 'Suite Sun Deck Bar', deck: 17, category: 'bar', isDefault: true },
  { name: 'Starbucks', deck: 5, category: 'bar', isDefault: true },
  // Entertainment
  { name: 'Royal Theater', deck: 4, category: 'entertainment', isDefault: true },
  { name: 'Studio B', deck: 4, category: 'entertainment', isDefault: true },
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
  { name: 'Vitality at Sea Spa', deck: 6, category: 'spa', isDefault: true },
  { name: 'Fitness Center', deck: 6, category: 'spa', isDefault: true },
  // Services
  { name: 'Guest Services', deck: 5, category: 'service', isDefault: true },
  { name: 'Shore Excursions', deck: 5, category: 'service', isDefault: true },
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

/**
 * Get venue list for a ship. Falls back to empty if unknown ship.
 *
 * Accepts either the canonical name ("NCL Prima") or a known alias
 * ("Norwegian Prima") — the lookup first normalizes, and if no match is
 * found in SHIP_VENUES, falls back to resolving the alias through the
 * ship catalog.
 */
export function getVenuesForShip(shipName: string): Omit<VenueEntry, 'shipName'>[] {
  const key = normalizeShipName(shipName);
  const direct = SHIP_VENUES[key];
  if (direct) return direct;
  // Try to resolve alias via the catalog (e.g. "Norwegian Prima" → "NCL Prima").
  const canonical = findShip(shipName);
  if (canonical) {
    const canonicalKey = normalizeShipName(canonical.name);
    if (SHIP_VENUES[canonicalKey]) return SHIP_VENUES[canonicalKey];
  }
  return [];
}

/**
 * Get list of all known ship names.
 *
 * Delegates to the ship catalog so the create-cruise dropdown and other
 * ship-pickers always show the full fleet, not just the handful of ships
 * that have seeded venue data. Ships without venues still work — the
 * autocomplete just comes up empty.
 */
export function getKnownShips(): string[] {
  return getAllShipNames();
}

// Bump this whenever the seeded venue catalog changes so existing users
// automatically pick up the refreshed data on next launch. The previous
// seed produced ~53 NCL Prima venues; v2 expands that to ~85 with full
// deck-by-deck data sourced from NCL.com and CruiseMapper.
const VENUE_SEED_VERSION = 2;
const VENUE_SEED_VERSION_KEY = 'cruiseflow:venuesSeedVersion';

function getStoredSeedVersion(): number {
  try {
    const raw = localStorage.getItem(VENUE_SEED_VERSION_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function setStoredSeedVersion(v: number): void {
  try {
    localStorage.setItem(VENUE_SEED_VERSION_KEY, String(v));
  } catch {
    // Storage may be unavailable (private mode, etc.) — best-effort only.
  }
}

async function writeAllVenues(): Promise<void> {
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

/**
 * Count of venues we expect to find in IndexedDB for each canonical ship,
 * derived at module load from the bundled static catalog. Used as an
 * integrity tripwire by `seedVenues()` — if the persisted venue count
 * drifts below what the bundle ships, we force a re-seed even if the
 * localStorage version key says we're up to date.
 */
function expectedVenueCountForShip(shipName: string): number {
  const norm = normalizeShipName(shipName);
  // Canonical lookup first; then alias lookup through the catalog.
  const direct = SHIP_VENUES[norm];
  if (direct) return direct.length;
  const canonical = findShip(shipName);
  if (canonical) {
    const canonicalKey = normalizeShipName(canonical.name);
    return SHIP_VENUES[canonicalKey]?.length ?? 0;
  }
  return 0;
}

/**
 * Returns true if the persisted venue count for *any* known ship is lower
 * than what the bundle ships. This catches the case where a user's
 * localStorage got wiped (private mode, Safari eviction, "Clear site data")
 * but IndexedDB still holds a stale catalog — the version-key check alone
 * would incorrectly conclude "we're already at v2" and skip the migration.
 */
async function isVenueCatalogStale(): Promise<boolean> {
  // Only check ships we actually have seed data for. The canonical keys in
  // SHIP_VENUES correspond to unique display names after the alias dedup in
  // writeAllVenues().
  const checks: Array<[string, number]> = [
    ['NCL Prima', expectedVenueCountForShip('NCL Prima')],
    ['Oasis of the Seas', expectedVenueCountForShip('Oasis of the Seas')],
  ];
  for (const [name, expected] of checks) {
    if (expected === 0) continue;
    const persisted = await db.venues
      .where('shipName')
      .equals(name)
      .count();
    if (persisted < expected) return true;
  }
  return false;
}

export async function seedVenues() {
  const count = await db.venues.count();
  const storedVersion = getStoredSeedVersion();

  if (count === 0) {
    // Fresh install — seed everything.
    await writeAllVenues();
    setStoredSeedVersion(VENUE_SEED_VERSION);
    return;
  }

  // Version-key migration path: the normal happy-path upgrade from an
  // older catalog to the current version.
  if (storedVersion < VENUE_SEED_VERSION) {
    // Existing user on an older catalog — wipe and re-seed so they pick up
    // the refreshed data. User-created venues live on the cruise itself,
    // not in the venue table, so this is safe.
    await db.venues.clear();
    await writeAllVenues();
    setStoredSeedVersion(VENUE_SEED_VERSION);
    return;
  }

  // Integrity self-heal: even if the stored version says we're up to
  // date, verify that the persisted venue counts still match what the
  // bundle ships. This handles the case where localStorage got cleared
  // (private mode, Safari 7-day eviction, "Clear site data") after the
  // catalog was first seeded but IndexedDB kept its stale rows — the
  // version-key check would otherwise falsely conclude "already current".
  if (await isVenueCatalogStale()) {
    await db.venues.clear();
    await writeAllVenues();
    setStoredSeedVersion(VENUE_SEED_VERSION);
  }
}

// Force re-seed (used when upgrading venue data)
export async function reseedVenues() {
  await db.venues.clear();
  await writeAllVenues();
  setStoredSeedVersion(VENUE_SEED_VERSION);
}
