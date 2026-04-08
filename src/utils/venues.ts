import { db } from '@/db/database';

export async function getVenuesByCategory(): Promise<
  Record<string, { name: string; deck: number }[]>
> {
  const venues = await db.venues.toArray();
  const grouped: Record<string, { name: string; deck: number }[]> = {};
  for (const v of venues) {
    if (!grouped[v.category]) grouped[v.category] = [];
    grouped[v.category]!.push({ name: v.name, deck: v.deck });
  }
  return grouped;
}

export async function findVenueDeck(venueName: string): Promise<number | null> {
  const venue = await db.venues.filter((v) => v.name === venueName).first();
  return venue?.deck ?? null;
}
