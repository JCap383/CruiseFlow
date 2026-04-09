import { platform } from '@/platform';

export async function getVenuesByCategory(): Promise<
  Record<string, { name: string; deck: number }[]>
> {
  return platform.db.getVenuesByCategory();
}

export async function findVenueDeck(venueName: string): Promise<number | null> {
  return platform.db.findVenueDeck(venueName);
}
