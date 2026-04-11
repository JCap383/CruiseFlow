import { useMemo } from 'react';
import { parse, format, differenceInDays } from 'date-fns';
import type { Cruise, CruiseEvent, EventPhoto, FamilyMember } from '@/types';
import { useCruise } from '@/hooks/useCruise';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useFamily } from '@/hooks/useFamily';

/**
 * #96: End-of-cruise recap ("Your Cruise Story").
 *
 * This module is the pure data layer: it takes a cruise, its events, and its
 * family members, and produces an ordered list of `RecapCard`s ready to be
 * rendered by `RecapPlayer`. The renderer is intentionally dumb about the
 * algorithm — it just walks the card list.
 *
 * All selection logic is deterministic and offline: we score photos by the
 * signals the user already gave us (user-picked covers, captions, member
 * counts, favorites, moods) so the recap feels personal without any model
 * call, and replays are byte-identical across sessions.
 */

export type RecapCardType =
  | 'cover'
  | 'numbers'
  | 'first-photo'
  | 'day-by-day'
  | 'best-of'
  | 'who-was-there'
  | 'busiest-day'
  | 'last-photo'
  | 'closer';

interface BaseCard {
  id: string;
  type: RecapCardType;
}

export interface CoverCard extends BaseCard {
  type: 'cover';
  shipName: string;
  cruiseName: string;
  dateRange: string;
  totalDays: number;
  heroPhotoDataUrl: string | null;
}

export interface NumbersCard extends BaseCard {
  type: 'numbers';
  stats: {
    days: number;
    events: number;
    photos: number;
    travelers: number;
    categories: number;
  };
}

export interface PhotoCard extends BaseCard {
  type: 'first-photo' | 'last-photo';
  photoDataUrl: string;
  caption: string;
  dayLabel: string;
  subtitle: string;
}

export interface DayByDayCard extends BaseCard {
  type: 'day-by-day';
  days: { dayNum: number; dayLabel: string; photoDataUrl: string }[];
}

export interface BestOfCard extends BaseCard {
  type: 'best-of';
  photos: { id: string; dataUrl: string; caption: string }[];
}

export interface WhoWasThereCard extends BaseCard {
  type: 'who-was-there';
  travelers: {
    id: string;
    name: string;
    emoji: string;
    color: string;
    count: number;
  }[];
  top: { name: string; count: number };
}

export interface BusiestDayCard extends BaseCard {
  type: 'busiest-day';
  dayLabel: string;
  eventCount: number;
  photoCount: number;
  heroPhoto: string | null;
}

export interface CloserCard extends BaseCard {
  type: 'closer';
  shipName: string;
  totalPhotos: number;
}

export type RecapCard =
  | CoverCard
  | NumbersCard
  | PhotoCard
  | DayByDayCard
  | BestOfCard
  | WhoWasThereCard
  | BusiestDayCard
  | CloserCard;

/**
 * Pure builder — exported for testing and so callers can memoize with
 * whatever React strategy they like.
 */
export function buildRecap(
  cruise: Cruise,
  events: CruiseEvent[],
  members: FamilyMember[],
): RecapCard[] {
  const cards: RecapCard[] = [];

  const sorted = [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  // Flatten every photo into a chronological list — used for first/last
  // photo cards and as the working set for scoring.
  const allPhotos: { photo: EventPhoto; event: CruiseEvent }[] = [];
  for (const e of sorted) {
    for (const p of e.photos ?? []) {
      allPhotos.push({ photo: p, event: e });
    }
  }
  allPhotos.sort((a, b) => {
    if (a.event.date !== b.event.date) {
      return a.event.date.localeCompare(b.event.date);
    }
    return (a.photo.addedAt ?? 0) - (b.photo.addedAt ?? 0);
  });

  const start = parse(cruise.startDate, 'yyyy-MM-dd', new Date());
  const end = parse(cruise.endDate, 'yyyy-MM-dd', new Date());
  const totalDays = Math.max(1, differenceInDays(end, start) + 1);
  const dayNumOf = (iso: string) =>
    differenceInDays(parse(iso, 'yyyy-MM-dd', new Date()), start) + 1;

  // Format "April 2–9, 2026" when the month is the same, otherwise fall
  // back to "Mar 28 – Apr 4, 2026" so cross-month trips still read well.
  const startMonth = format(start, 'MMMM');
  const endMonth = format(end, 'MMMM');
  const sameMonth = startMonth === endMonth;
  const sameYear = format(start, 'yyyy') === format(end, 'yyyy');
  let dateRange: string;
  if (sameMonth && sameYear) {
    dateRange = `${format(start, 'MMMM d')}–${format(end, 'd, yyyy')}`;
  } else if (sameYear) {
    dateRange = `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  } else {
    dateRange = `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
  }

  // A first-photo-ish hero for the cover card — prefer an explicit cover
  // from day 1, then any explicit cover, then the first photo overall.
  const coverEntries = Object.entries(cruise.coverPhotos ?? {}).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const day1Cover = cruise.coverPhotos?.[cruise.startDate];
  const anyCover = coverEntries[0]?.[1];
  const firstPhoto = allPhotos[0]?.photo.dataUrl;
  const coverHero = day1Cover ?? anyCover ?? firstPhoto ?? null;

  // --- Card: Cover -------------------------------------------------------
  cards.push({
    id: 'cover',
    type: 'cover',
    shipName: cruise.shipName,
    cruiseName: cruise.name,
    dateRange,
    totalDays,
    heroPhotoDataUrl: coverHero,
  });

  // --- Card: By the numbers ---------------------------------------------
  // Even a zero-photo cruise can show its day count + traveler count, but
  // skip the card entirely if *nothing* meaningful happened.
  const distinctCategories = new Set(sorted.map((e) => e.category));
  if (sorted.length > 0 || allPhotos.length > 0) {
    cards.push({
      id: 'numbers',
      type: 'numbers',
      stats: {
        days: totalDays,
        events: sorted.length,
        photos: allPhotos.length,
        travelers: members.length,
        categories: distinctCategories.size,
      },
    });
  }

  // --- Card: First photo ------------------------------------------------
  if (allPhotos.length > 0) {
    const first = allPhotos[0]!;
    cards.push({
      id: 'first-photo',
      type: 'first-photo',
      photoDataUrl: first.photo.dataUrl,
      caption: first.photo.caption || '',
      dayLabel: `Day ${dayNumOf(first.event.date)}`,
      subtitle: first.event.title,
    });
  }

  // Per-day bucket used by day-by-day + busiest-day cards
  const dayMap = new Map<
    string,
    { events: CruiseEvent[]; photos: EventPhoto[] }
  >();
  for (const e of sorted) {
    const bucket = dayMap.get(e.date) ?? { events: [], photos: [] };
    bucket.events.push(e);
    for (const p of e.photos ?? []) bucket.photos.push(p);
    dayMap.set(e.date, bucket);
  }

  // --- Card: Day by day --------------------------------------------------
  // Only show when the trip is long enough to benefit from a per-day
  // grid — a 2-day trip with 2 hero photos already gets covered by the
  // first/last photo cards.
  const dayHeroes: { dayNum: number; dayLabel: string; photoDataUrl: string }[] = [];
  for (const [date, bucket] of [...dayMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (bucket.photos.length === 0) continue;
    const cover = cruise.coverPhotos?.[date];
    const stable = [...bucket.photos].sort(
      (a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0),
    )[0];
    const hero = cover ?? stable?.dataUrl;
    if (!hero) continue;
    dayHeroes.push({
      dayNum: dayNumOf(date),
      dayLabel: format(parse(date, 'yyyy-MM-dd', new Date()), 'EEE'),
      photoDataUrl: hero,
    });
  }
  if (totalDays >= 4 && dayHeroes.length >= 3) {
    cards.push({ id: 'day-by-day', type: 'day-by-day', days: dayHeroes });
  }

  // --- Card: Best of -----------------------------------------------------
  // Score each photo using user signals. No ML — the user already told us
  // what mattered via covers / captions / favorites / moods / members.
  const coverUrls = new Set(Object.values(cruise.coverPhotos ?? {}));
  const scored = allPhotos.map(({ photo, event }) => {
    let score = 0;
    if (coverUrls.has(photo.dataUrl)) score += 100;
    if ((photo.caption ?? '').trim().length > 0) score += 30;
    score += (event.memberIds?.length ?? 0) * 5;
    if (event.isFavorite) score += 20;
    if (event.mood === '🤩') score += 15;
    if (event.mood === '😊') score += 8;
    return { photo, event, score };
  });
  scored.sort((a, b) => b.score - a.score);

  // Dedupe by id while preserving order, cap to 9 for the 3×3 grid.
  const seenIds = new Set<string>();
  const topNine: { id: string; dataUrl: string; caption: string }[] = [];
  for (const s of scored) {
    if (seenIds.has(s.photo.id)) continue;
    seenIds.add(s.photo.id);
    topNine.push({
      id: s.photo.id,
      dataUrl: s.photo.dataUrl,
      caption: s.photo.caption,
    });
    if (topNine.length >= 9) break;
  }
  if (topNine.length >= 3) {
    cards.push({ id: 'best-of', type: 'best-of', photos: topNine });
  }

  // --- Card: Who was there -----------------------------------------------
  if (members.length > 1) {
    const memberCounts = new Map<string, number>();
    for (const m of members) memberCounts.set(m.id, 0);
    for (const e of sorted) {
      for (const mid of e.memberIds ?? []) {
        memberCounts.set(mid, (memberCounts.get(mid) ?? 0) + 1);
      }
    }
    const travelers = members
      .map((m) => ({
        id: m.id,
        name: m.name,
        emoji: m.emoji,
        color: m.color,
        count: memberCounts.get(m.id) ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
    const top = travelers[0];
    if (top && top.count > 0) {
      cards.push({
        id: 'who-was-there',
        type: 'who-was-there',
        travelers,
        top: { name: top.name, count: top.count },
      });
    }
  }

  // --- Card: Busiest day -------------------------------------------------
  if (dayMap.size >= 2) {
    let best: { date: string; events: number; photos: number; score: number } | null = null;
    for (const [date, bucket] of dayMap.entries()) {
      const s = bucket.events.length * 2 + bucket.photos.length;
      if (!best || s > best.score) {
        best = {
          date,
          events: bucket.events.length,
          photos: bucket.photos.length,
          score: s,
        };
      }
    }
    // Only show if the "busiest" day is actually busy — otherwise it
    // undermines the card's promise. A day with 1 event and 0 photos
    // isn't interesting.
    if (best && (best.events >= 3 || best.photos >= 5)) {
      const d = parse(best.date, 'yyyy-MM-dd', new Date());
      const dayNum = dayNumOf(best.date);
      const dayName = format(d, 'EEEE');
      const bucket = dayMap.get(best.date)!;
      const stable = [...bucket.photos].sort(
        (a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0),
      )[0];
      const hero = cruise.coverPhotos?.[best.date] ?? stable?.dataUrl ?? null;
      cards.push({
        id: 'busiest-day',
        type: 'busiest-day',
        dayLabel: `Day ${dayNum} · ${dayName}`,
        eventCount: best.events,
        photoCount: best.photos,
        heroPhoto: hero,
      });
    }
  }

  // --- Card: Last photo --------------------------------------------------
  // Only include if it's a distinct photo from the "first photo" card —
  // otherwise a 1-photo trip would show the same image twice.
  if (allPhotos.length >= 2) {
    const last = allPhotos[allPhotos.length - 1]!;
    cards.push({
      id: 'last-photo',
      type: 'last-photo',
      photoDataUrl: last.photo.dataUrl,
      caption: last.photo.caption || '',
      dayLabel: `Day ${dayNumOf(last.event.date)}`,
      subtitle: last.event.title,
    });
  }

  // --- Card: Closer ------------------------------------------------------
  cards.push({
    id: 'closer',
    type: 'closer',
    shipName: cruise.shipName,
    totalPhotos: allPhotos.length,
  });

  return cards;
}

/**
 * React hook: loads a cruise + its events + members and memoizes the
 * computed recap. Returns `{ cruise, cards, isReady }`.
 */
export function useCruiseRecap(cruiseId: string | null) {
  const cruise = useCruise(cruiseId);
  const events = useAllCruiseEvents(cruiseId);
  const members = useFamily(cruiseId);

  const cards = useMemo<RecapCard[]>(() => {
    if (!cruise) return [];
    return buildRecap(cruise, events, members);
  }, [cruise, events, members]);

  return {
    cruise: cruise ?? null,
    cards,
    isReady: cruise !== undefined,
  };
}
