/**
 * Native platform implementation — placeholder for Phase 3+.
 *
 * This file will eventually use:
 *   - @capacitor-community/sqlite for local storage
 *   - A custom Capacitor plugin for CKSyncEngine / CloudKit
 *
 * For now it throws so we detect accidental use before it's ready.
 */

import type { Platform, PlatformDatabase, PlatformSync, SyncStatus } from './types';

function notReady(): never {
  throw new Error(
    'Native platform is not yet implemented. SQLite + CloudKit support is coming in Phase 3-5.',
  );
}

const nativeDb: PlatformDatabase = {
  getCruises: () => notReady(),
  getCruise: () => notReady(),
  createCruise: () => notReady(),
  updateCruise: () => notReady(),
  deleteCruise: () => notReady(),
  getEventsForDay: () => notReady(),
  getAllCruiseEvents: () => notReady(),
  getEvent: () => notReady(),
  addEvent: () => notReady(),
  updateEvent: () => notReady(),
  deleteEvent: () => notReady(),
  getMembers: () => notReady(),
  getMember: () => notReady(),
  addMember: () => notReady(),
  updateMember: () => notReady(),
  deleteMember: () => notReady(),
  getVenuesByCategory: () => notReady(),
  findVenueDeck: () => notReady(),
  getVenuesForShip: () => notReady(),
  exportAll: () => notReady(),
  importAll: () => notReady(),
  onChange: () => notReady(),
};

const nativeSync: PlatformSync = {
  getStatus(): SyncStatus {
    return 'unavailable';
  },
  onStatusChange() {
    return () => {};
  },
  async sync() {
    // No-op until CloudKit plugin is built
  },
};

export const nativePlatform: Platform = {
  name: 'native',
  db: nativeDb,
  sync: nativeSync,
};
