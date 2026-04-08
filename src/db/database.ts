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

export { db };
