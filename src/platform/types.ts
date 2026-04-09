/**
 * Platform abstraction interfaces.
 *
 * All data access goes through these interfaces so the app can run on:
 *   - Web (Dexie / IndexedDB)      — current implementation
 *   - Native iOS (SQLite + CloudKit) — future implementation
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
// Sync interface (for CloudKit — Phase 5)
// ---------------------------------------------------------------------------

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'unavailable';

export interface PlatformSync {
  getStatus(): SyncStatus;
  onStatusChange(callback: (status: SyncStatus) => void): () => void;
  /** Force a sync attempt. */
  sync(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Platform bundle
// ---------------------------------------------------------------------------

export interface Platform {
  name: 'web' | 'native';
  db: PlatformDatabase;
  sync: PlatformSync | null; // null on web
}
