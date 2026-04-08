import type { Venue } from '@/types';
import { db } from './database';

const DEFAULT_VENUES: Omit<Venue, 'id'>[] = [
  { name: 'Windjammer Buffet', deck: 11, category: 'dining', isDefault: true },
  { name: 'Main Dining Room', deck: 3, category: 'dining', isDefault: true },
  { name: 'Coastal Kitchen', deck: 11, category: 'dining', isDefault: true },
  { name: 'Chops Grille', deck: 8, category: 'dining', isDefault: true },
  { name: 'Izumi', deck: 4, category: 'dining', isDefault: true },
  { name: 'Cafe Promenade', deck: 5, category: 'dining', isDefault: true },
  { name: 'Solarium Bistro', deck: 14, category: 'dining', isDefault: true },
  { name: 'Main Theater', deck: 3, category: 'entertainment', isDefault: true },
  { name: 'Two70', deck: 5, category: 'entertainment', isDefault: true },
  { name: 'Music Hall', deck: 3, category: 'entertainment', isDefault: true },
  { name: 'Casino Royale', deck: 4, category: 'entertainment', isDefault: true },
  { name: 'Adventure Ocean', deck: 12, category: 'kids', isDefault: true },
  { name: 'Teen Lounge', deck: 12, category: 'kids', isDefault: true },
  { name: 'Pool Deck', deck: 14, category: 'pool', isDefault: true },
  { name: 'Solarium', deck: 14, category: 'pool', isDefault: true },
  { name: 'FlowRider', deck: 15, category: 'activity', isDefault: true },
  { name: 'Rock Climbing Wall', deck: 15, category: 'activity', isDefault: true },
  { name: 'North Star', deck: 15, category: 'activity', isDefault: true },
  { name: 'Vitality Spa', deck: 5, category: 'spa', isDefault: true },
  { name: 'Fitness Center', deck: 14, category: 'activity', isDefault: true },
  { name: 'Sports Court', deck: 15, category: 'activity', isDefault: true },
  { name: 'Guest Services', deck: 4, category: 'service', isDefault: true },
  { name: 'Conference Center', deck: 4, category: 'service', isDefault: true },
  { name: 'Shore Excursion Desk', deck: 4, category: 'service', isDefault: true },
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
