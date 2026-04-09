/**
 * Web platform implementation — wraps current Dexie / IndexedDB layer.
 *
 * This preserves all existing behaviour while conforming to the
 * Platform interface so hooks can be backend-agnostic.
 */

import { nanoid } from 'nanoid';
import { db } from '@/db/database';
import type { Platform, PlatformDatabase, PlatformPhotos, PlatformSync, SyncStatus } from './types';

// ---------------------------------------------------------------------------
// Change notification
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const webDb: PlatformDatabase = {
  // -- Cruises ---------------------------------------------------------------

  async getCruises() {
    return db.cruises.toArray();
  },

  async getCruise(id) {
    return db.cruises.get(id);
  },

  async createCruise(cruise) {
    const id = nanoid();
    await db.cruises.add({ ...cruise, id, coverPhotos: cruise.coverPhotos ?? {}, createdAt: Date.now() });
    notify();
    return id;
  },

  async updateCruise(id, changes) {
    await db.cruises.update(id, changes);
    notify();
  },

  async deleteCruise(id) {
    await db.events.where('cruiseId').equals(id).delete();
    await db.members.where('cruiseId').equals(id).delete();
    await db.cruises.delete(id);
    notify();
  },

  // -- Events ----------------------------------------------------------------

  async getEventsForDay(cruiseId, date) {
    return db.events
      .where('[cruiseId+date]')
      .equals([cruiseId, date])
      .sortBy('startTime');
  },

  async getAllCruiseEvents(cruiseId) {
    return db.events.where('cruiseId').equals(cruiseId).toArray();
  },

  async getEvent(id) {
    return db.events.get(id);
  },

  async addEvent(event) {
    const now = Date.now();
    const id = nanoid();
    await db.events.add({ ...event, id, createdAt: now, updatedAt: now });
    notify();
    return id;
  },

  async updateEvent(id, changes) {
    await db.events.update(id, { ...changes, updatedAt: Date.now() });
    notify();
  },

  async deleteEvent(id) {
    await db.events.delete(id);
    notify();
  },

  // -- Family members --------------------------------------------------------

  async getMembers(cruiseId) {
    return db.members.where('cruiseId').equals(cruiseId).toArray();
  },

  async getMember(id) {
    return db.members.get(id);
  },

  async addMember(member) {
    const id = nanoid();
    await db.members.add({ ...member, id });
    notify();
    return id;
  },

  async updateMember(id, changes) {
    await db.members.update(id, changes);
    notify();
  },

  async deleteMember(id) {
    // Remove member from all events
    const events = await db.events.filter((e) => e.memberIds.includes(id)).toArray();
    await Promise.all(
      events.map((e) =>
        db.events.update(e.id, { memberIds: e.memberIds.filter((m) => m !== id) }),
      ),
    );
    await db.members.delete(id);
    notify();
  },

  // -- Venues ----------------------------------------------------------------

  async getVenuesByCategory() {
    const venues = await db.venues.toArray();
    const grouped: Record<string, { name: string; deck: number }[]> = {};
    for (const v of venues) {
      if (!grouped[v.category]) grouped[v.category] = [];
      grouped[v.category]!.push({ name: v.name, deck: v.deck });
    }
    return grouped;
  },

  async findVenueDeck(venueName) {
    const venue = await db.venues.filter((v) => v.name === venueName).first();
    return venue?.deck ?? null;
  },

  async getVenuesForShip(shipName) {
    if (!shipName) return db.venues.toArray();
    return db.venues.where('shipName').equals(shipName).toArray();
  },

  // -- Backup / restore ------------------------------------------------------

  async exportAll() {
    const [cruises, members, events] = await Promise.all([
      db.cruises.toArray(),
      db.members.toArray(),
      db.events.toArray(),
    ]);
    return { cruises, members, events };
  },

  async importAll(data) {
    await db.transaction('rw', db.cruises, db.members, db.events, async () => {
      await db.cruises.clear();
      await db.members.clear();
      await db.events.clear();
      if (data.cruises.length > 0) await db.cruises.bulkPut(data.cruises);
      if (data.members.length > 0) await db.members.bulkPut(data.members);
      if (data.events.length > 0) await db.events.bulkPut(data.events);
    });
    notify();
  },

  // -- Change subscription ----------------------------------------------------

  onChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};

// ---------------------------------------------------------------------------
// Photos (web — inline base64, no file system)
// ---------------------------------------------------------------------------

const webPhotos: PlatformPhotos = {
  async savePhoto(dataUrl) {
    // On web, photos are stored as inline base64 in IndexedDB.
    // Just pass through the dataUrl.
    return dataUrl;
  },

  async getPhotoSrc(uri) {
    // On web, the URI is already a displayable data URL.
    return uri;
  },

  async deletePhoto(_uri) {
    // On web, photos are embedded in event records — no separate cleanup.
  },

  async captureFromCamera() {
    // Web doesn't have native camera access via this API.
    // Components should use <input type="file" capture="environment"> instead.
    return null;
  },
};

// ---------------------------------------------------------------------------
// Sync stub (web has no iCloud sync)
// ---------------------------------------------------------------------------

const webSync: PlatformSync = {
  getStatus(): SyncStatus {
    return 'unavailable';
  },
  getLastSyncTime() {
    return null;
  },
  onStatusChange() {
    return () => {};
  },
  onDataChanged() {
    return () => {};
  },
  async sync() {
    // No-op on web
  },
  async isAvailable() {
    return false;
  },
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const webPlatform: Platform = {
  name: 'web',
  db: webDb,
  photos: webPhotos,
  sync: webSync,
  migration: null,
};
