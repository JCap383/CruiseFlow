/**
 * Platform abstraction interfaces.
 *
 * All data access goes through these interfaces so the app can run on:
 *   - Web (Dexie / IndexedDB)         — current implementation
 *   - Native iOS (SQLite + CloudKit)   — native implementation
 */

import type { Cruise, CruiseEvent, FamilyMember, Venue } from '@/types';

// ---------------------------------------------------------------------------
// Database interface
// ---------------------------------------------------------------------------

export interface PlatformDatabase {
  // Cruises
  getCruises(): Promise<Cruise[]>;
  getCruise(id: string): Promise<Cruise | undefined>;
  createCruise(cruise: Omit<Cruise, 'id' | 'createdAt'>): Promise<string>;
  updateCruise(id: string, changes: Partial<Omit<Cruise, 'id' | 'createdAt'>>): Promise<void>;
  deleteCruise(id: string): Promise<void>;

  // Events
  getEventsForDay(cruiseId: string, date: string): Promise<CruiseEvent[]>;
  getAllCruiseEvents(cruiseId: string): Promise<CruiseEvent[]>;
  getEvent(id: string): Promise<CruiseEvent | undefined>;
  addEvent(event: Omit<CruiseEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
  updateEvent(id: string, changes: Partial<Omit<CruiseEvent, 'id' | 'createdAt'>>): Promise<void>;
  deleteEvent(id: string): Promise<void>;

  // Family members
  getMembers(cruiseId: string): Promise<FamilyMember[]>;
  getMember(id: string): Promise<FamilyMember | undefined>;
  addMember(member: Omit<FamilyMember, 'id'>): Promise<string>;
  updateMember(id: string, changes: Partial<Omit<FamilyMember, 'id'>>): Promise<void>;
  deleteMember(id: string): Promise<void>;

  // Venues
  getVenuesByCategory(): Promise<Record<string, { name: string; deck: number }[]>>;
  findVenueDeck(venueName: string): Promise<number | null>;
  getVenuesForShip(shipName: string): Promise<Venue[]>;

  // Backup / restore
  exportAll(): Promise<{ cruises: Cruise[]; members: FamilyMember[]; events: CruiseEvent[] }>;
  importAll(data: { cruises: Cruise[]; members: FamilyMember[]; events: CruiseEvent[] }): Promise<void>;

  /**
   * Subscribe to data changes. Called whenever any table is mutated.
   * Returns an unsubscribe function.
   */
  onChange(callback: () => void): () => void;
}

// ---------------------------------------------------------------------------
// Photo storage interface
// ---------------------------------------------------------------------------

export interface PlatformPhotos {
  /**
   * Store a photo and return a URI/path that can be used to display it.
   * On web: returns the base64 dataUrl as-is (stored inline in IndexedDB).
   * On native: writes compressed JPEG to device storage, returns file:// path.
   */
  savePhoto(dataUrl: string): Promise<string>;

  /**
   * Read a photo by its stored URI. Returns a displayable src string.
   * On web: returns the dataUrl as-is.
   * On native: reads from Filesystem and returns a web-viewable URI.
   */
  getPhotoSrc(uri: string): Promise<string>;

  /**
   * Delete a stored photo by its URI.
   * On web: no-op (photos are inline in IndexedDB).
   * On native: deletes the file from device storage.
   */
  deletePhoto(uri: string): Promise<void>;

  /**
   * Capture a photo using the device camera (native only).
   * On web: returns null (use HTML file input instead).
   * On native: launches the native camera, returns the saved photo URI.
   */
  captureFromCamera(): Promise<string | null>;
}

// ---------------------------------------------------------------------------
// Sync interface (for CloudKit)
// ---------------------------------------------------------------------------

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'unavailable';

export interface SyncEvent {
  type: 'status-change' | 'data-changed' | 'error';
  status?: SyncStatus;
  error?: string;
  timestamp: number;
}

export interface PlatformSync {
  getStatus(): SyncStatus;
  getLastSyncTime(): number | null;
  onStatusChange(callback: (status: SyncStatus) => void): () => void;
  onDataChanged(callback: () => void): () => void;
  /** Force a sync attempt. */
  sync(): Promise<void>;
  /** Check if iCloud is available on this device. */
  isAvailable(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Migration interface
// ---------------------------------------------------------------------------

export interface MigrationInfo {
  needed: boolean;
  sourceRecordCount: number;
  description: string;
}

export interface PlatformMigration {
  /**
   * Check if migration from IndexedDB to SQLite is needed.
   */
  checkMigration(): Promise<MigrationInfo>;

  /**
   * Run the migration. Calls onProgress with 0-100 values.
   */
  runMigration(onProgress: (percent: number) => void): Promise<void>;

  /**
   * Mark migration as complete.
   */
  markComplete(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Platform bundle
// ---------------------------------------------------------------------------

export interface Platform {
  name: 'web' | 'native';
  db: PlatformDatabase;
  photos: PlatformPhotos;
  sync: PlatformSync | null; // null on web
  migration: PlatformMigration | null; // null on web
}
