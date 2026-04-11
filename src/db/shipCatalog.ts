/**
 * Ship + cruise-line reference catalog.
 *
 * This is the canonical, offline-first directory of cruise lines and their
 * ships. It's used by:
 *   - the Create Cruise flow to populate a grouped ship dropdown
 *   - the venue seeder in `./seed.ts` to associate venues with ships
 *   - anywhere else in the app that needs to display "ship belongs to what line"
 *
 * Designed to expand to additional cruise lines later (add a new CruiseLineId
 * constant, add to `CRUISE_LINES`, and add ships under a new key in
 * `SHIPS_BY_LINE`).
 *
 * NOTE: This catalog is reference data only. User cruises may reference any
 * free-text ship name, including ones not in this catalog — such cruises
 * still work, they just don't get venue autocomplete. Never delete a user's
 * cruise just because its ship isn't listed here.
 */

// ─── Cruise lines ─────────────────────────────────────────────────────

export type CruiseLineId = 'ncl' | 'royal-caribbean';

export interface CruiseLine {
  id: CruiseLineId;
  /** Display name — used in the UI. */
  name: string;
  /** Short code for badges. */
  shortName: string;
}

export const CRUISE_LINES: readonly CruiseLine[] = [
  { id: 'ncl', name: 'Norwegian Cruise Line', shortName: 'NCL' },
  { id: 'royal-caribbean', name: 'Royal Caribbean', shortName: 'Royal Caribbean' },
] as const;

// ─── Ships ────────────────────────────────────────────────────────────

export interface Ship {
  /** Canonical display name, used as the stored `cruise.shipName`. */
  name: string;
  cruiseLineId: CruiseLineId;
  /** Optional aliases accepted for lookup (e.g. "Norwegian Prima" → "NCL Prima"). */
  aliases?: readonly string[];
}

/**
 * Every ship we know about, grouped by cruise line.
 *
 * When adding ships, keep the `name` consistent with the `shipName` used in
 * `./seed.ts` so that venue lookups work without extra mapping.
 */
export const SHIPS_BY_LINE: Record<CruiseLineId, readonly Ship[]> = {
  ncl: [
    { name: 'NCL Prima', cruiseLineId: 'ncl', aliases: ['Norwegian Prima'] },
    { name: 'Norwegian Viva', cruiseLineId: 'ncl' },
    { name: 'Norwegian Encore', cruiseLineId: 'ncl' },
    { name: 'Norwegian Joy', cruiseLineId: 'ncl' },
    { name: 'Norwegian Bliss', cruiseLineId: 'ncl' },
    { name: 'Norwegian Escape', cruiseLineId: 'ncl' },
    { name: 'Norwegian Epic', cruiseLineId: 'ncl' },
    { name: 'Norwegian Getaway', cruiseLineId: 'ncl' },
    { name: 'Norwegian Breakaway', cruiseLineId: 'ncl' },
    { name: 'Norwegian Aqua', cruiseLineId: 'ncl' },
  ],
  'royal-caribbean': [
    { name: 'Icon of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Star of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Utopia of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Wonder of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Symphony of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Harmony of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Allure of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Oasis of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Odyssey of the Seas', cruiseLineId: 'royal-caribbean' },
    { name: 'Anthem of the Seas', cruiseLineId: 'royal-caribbean' },
  ],
};

// ─── Lookups ──────────────────────────────────────────────────────────

/** Flat list of every ship in the catalog. */
export function getAllShips(): Ship[] {
  return CRUISE_LINES.flatMap((line) => [...SHIPS_BY_LINE[line.id]]);
}

/** Get all ship names (canonical). */
export function getAllShipNames(): string[] {
  return getAllShips().map((s) => s.name);
}

/**
 * Find a ship by its canonical name, alias, or a distinctive fragment
 * (case-insensitive).
 *
 * Resolution order:
 *   1. Exact canonical match  — "NCL Prima" → NCL Prima
 *   2. Exact alias match      — "Norwegian Prima" → NCL Prima
 *   3. Token-subsequence match — "Prima" → NCL Prima, provided the
 *      fragment uniquely identifies one ship in the catalog.
 *
 * Step 3 exists to heal legacy cruises created before the ShipPicker
 * shipped, where users stored short free-text names like "Prima" or
 * "Breakaway" in `cruise.shipName`. Without it, a backup restored from
 * that era shows no venues, no cruise-line badge, and no ship metadata
 * because every downstream consumer goes through this function.
 *
 * The token match deliberately requires a *unique* hit — ambiguous
 * fragments like "Norwegian" (matches every NCL ship) or "of the Seas"
 * (matches every Royal Caribbean ship) return undefined rather than
 * silently picking an arbitrary one.
 */
export function findShip(name: string): Ship | undefined {
  if (!name) return undefined;
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;

  const ships = getAllShips();

  // 1. Exact canonical match.
  for (const ship of ships) {
    if (ship.name.toLowerCase() === needle) return ship;
  }

  // 2. Exact alias match.
  for (const ship of ships) {
    if (ship.aliases?.some((a) => a.toLowerCase() === needle)) return ship;
  }

  // 3. Distinctive-fragment match. Tokenize both sides and check for a
  //    contiguous token subsequence, then only return if exactly one
  //    ship matches.
  const tokenize = (s: string): string[] =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0);

  const needleTokens = tokenize(needle);
  if (needleTokens.length === 0) return undefined;

  const containsSubseq = (hay: string[], need: string[]): boolean => {
    if (need.length === 0 || need.length > hay.length) return false;
    outer: for (let i = 0; i <= hay.length - need.length; i++) {
      for (let j = 0; j < need.length; j++) {
        if (hay[i + j] !== need[j]) continue outer;
      }
      return true;
    }
    return false;
  };

  const fragmentHits: Ship[] = [];
  for (const ship of ships) {
    const candidates = [tokenize(ship.name), ...(ship.aliases?.map(tokenize) ?? [])];
    if (candidates.some((tok) => containsSubseq(tok, needleTokens))) {
      fragmentHits.push(ship);
    }
  }
  if (fragmentHits.length === 1) return fragmentHits[0];

  return undefined;
}

/** Get the cruise line for a given ship name, or undefined if unknown. */
export function getCruiseLineForShip(shipName: string): CruiseLine | undefined {
  const ship = findShip(shipName);
  if (!ship) return undefined;
  return CRUISE_LINES.find((l) => l.id === ship.cruiseLineId);
}

/** Grouped shape convenient for dropdowns. */
export interface GroupedShips {
  line: CruiseLine;
  ships: readonly Ship[];
}

export function getGroupedShips(): GroupedShips[] {
  return CRUISE_LINES.map((line) => ({
    line,
    ships: SHIPS_BY_LINE[line.id],
  }));
}
