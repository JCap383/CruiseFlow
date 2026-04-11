import Dexie, { type EntityTable } from 'dexie';
import type { Cruise, CruiseEvent, FamilyMember, Venue } from '@/types';

const db = new Dexie('CruiseFlowDB') as Dexie & {
  cruises: EntityTable<Cruise, 'id'>;
  members: EntityTable<FamilyMember, 'id'>;
  events: EntityTable<CruiseEvent, 'id'>;
  venues: EntityTable<Venue, 'id'>;
};

db.version(1).stores({
  cruises: 'id, startDate',
  members: 'id, cruiseId',
  events: 'id, cruiseId, date, startTime, [cruiseId+date]',
  venues: 'id, deck, category',
});

// v2: re-seed with accurate Oasis of the Seas venue data
db.version(2).stores({
  cruises: 'id, startDate',
  members: 'id, cruiseId',
  events: 'id, cruiseId, date, startTime, [cruiseId+date]',
  venues: 'id, deck, category',
}).upgrade(async (tx) => {
  await tx.table('venues').clear();
});

// v3: add shipName index to venues for per-ship filtering, add photos to events
db.version(3).stores({
  cruises: 'id, startDate',
  members: 'id, cruiseId',
  events: 'id, cruiseId, date, startTime, [cruiseId+date]',
  venues: 'id, shipName, deck, category, [shipName+category]',
}).upgrade(async (tx) => {
  // Clear venues to re-seed with ship-specific data
  await tx.table('venues').clear();
  // Add empty photos array to existing events
  await tx.table('events').toCollection().modify((event: CruiseEvent) => {
    if (!event.photos) {
      event.photos = [];
    }
  });
});

// v4: fix NCL Prima venue data (remove Garden Cafe, fix deck numbers)
db.version(4).stores({
  cruises: 'id, startDate',
  members: 'id, cruiseId',
  events: 'id, cruiseId, date, startTime, [cruiseId+date]',
  venues: 'id, shipName, deck, category, [shipName+category]',
}).upgrade(async (tx) => {
  await tx.table('venues').clear();
});

// v5: add isFavorite, mood to events; coverPhotos to cruises
db.version(5).stores({
  cruises: 'id, startDate',
  members: 'id, cruiseId',
  events: 'id, cruiseId, date, startTime, [cruiseId+date]',
  venues: 'id, shipName, deck, category, [shipName+category]',
}).upgrade(async (tx) => {
  await tx.table('events').toCollection().modify((event: Record<string, unknown>) => {
    if (event.isFavorite === undefined) event.isFavorite = false;
    if (event.mood === undefined) event.mood = null;
  });
  await tx.table('cruises').toCollection().modify((cruise: Record<string, unknown>) => {
    if (!cruise.coverPhotos) cruise.coverPhotos = {};
  });
});

// v6 (#95): add dailyBulletins map to cruises. Backfill with an empty
// object so downstream code can safely do `cruise.dailyBulletins?.[date]`
// without worrying about undefined vs. empty map.
db.version(6).stores({
  cruises: 'id, startDate',
  members: 'id, cruiseId',
  events: 'id, cruiseId, date, startTime, [cruiseId+date]',
  venues: 'id, shipName, deck, category, [shipName+category]',
}).upgrade(async (tx) => {
  await tx.table('cruises').toCollection().modify((cruise: Record<string, unknown>) => {
    if (!cruise.dailyBulletins) cruise.dailyBulletins = {};
  });
});

export { db };
