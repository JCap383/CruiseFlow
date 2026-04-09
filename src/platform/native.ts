/**
 * Native platform implementation — SQLite + CloudKit.
 *
 * Uses:
 *   - @capacitor-community/sqlite for persistent local storage
 *   - @capacitor/filesystem for photo file storage
 *   - @capacitor/camera for native camera access
 *   - @capacitor/preferences for migration state
 *   - Custom CloudKit Capacitor plugin for iCloud sync
 */

import { nanoid } from 'nanoid';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import type { Cruise, CruiseEvent, FamilyMember, EventPhoto, Venue } from '@/types';
import type {
  Platform,
  PlatformDatabase,
  PlatformPhotos,
  PlatformSync,
  PlatformMigration,
  MigrationInfo,
  SyncStatus,
} from './types';

// ---------------------------------------------------------------------------
// SQLite setup
// ---------------------------------------------------------------------------

const sqlite = new SQLiteConnection(CapacitorSQLite);
let dbConn: SQLiteDBConnection | null = null;

const DB_NAME = 'cruiseflow';
const MIGRATION_KEY = 'cruiseflow-migration-complete';
const PHOTOS_DIR = 'cruiseflow-photos';

async function getDb(): Promise<SQLiteDBConnection> {
  if (dbConn) return dbConn;

  const isConn = await sqlite.isConnection(DB_NAME, false);
  if (isConn.result) {
    dbConn = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    dbConn = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }

  await dbConn.open();
  await createTables(dbConn);
  return dbConn;
}

async function createTables(conn: SQLiteDBConnection): Promise<void> {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS cruises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shipName TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      coverPhotos TEXT NOT NULL DEFAULT '{}',
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      cruiseId TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      emoji TEXT NOT NULL,
      isChild INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_members_cruise ON members(cruiseId);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      cruiseId TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      category TEXT NOT NULL,
      venue TEXT NOT NULL DEFAULT '',
      deck INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      memberIds TEXT NOT NULL DEFAULT '[]',
      reminderMinutes INTEGER,
      photos TEXT NOT NULL DEFAULT '[]',
      isFavorite INTEGER NOT NULL DEFAULT 0,
      mood TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_cruise ON events(cruiseId);
    CREATE INDEX IF NOT EXISTS idx_events_cruise_date ON events(cruiseId, date);

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY,
      shipName TEXT NOT NULL,
      name TEXT NOT NULL,
      deck INTEGER NOT NULL,
      category TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_venues_ship ON venues(shipName);

    CREATE TABLE IF NOT EXISTS _sync_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tableName TEXT NOT NULL,
      recordId TEXT NOT NULL,
      changeType TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sync_pending ON _sync_changes(synced, timestamp);
  `);
}

// ---------------------------------------------------------------------------
// Change notification
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function trackChange(tableName: string, recordId: string, changeType: 'insert' | 'update' | 'delete') {
  const conn = await getDb();
  await conn.run(
    'INSERT INTO _sync_changes (tableName, recordId, changeType, timestamp, synced) VALUES (?, ?, ?, ?, 0)',
    [tableName, recordId, changeType, Date.now()],
  );
}

// ---------------------------------------------------------------------------
// Row ↔ Model helpers
// ---------------------------------------------------------------------------

function rowToCruise(row: Record<string, unknown>): Cruise {
  return {
    id: row.id as string,
    name: row.name as string,
    shipName: row.shipName as string,
    startDate: row.startDate as string,
    endDate: row.endDate as string,
    coverPhotos: JSON.parse((row.coverPhotos as string) || '{}'),
    createdAt: row.createdAt as number,
  };
}

function rowToEvent(row: Record<string, unknown>): CruiseEvent {
  return {
    id: row.id as string,
    cruiseId: row.cruiseId as string,
    title: row.title as string,
    date: row.date as string,
    startTime: row.startTime as string,
    endTime: row.endTime as string,
    category: row.category as CruiseEvent['category'],
    venue: row.venue as string,
    deck: row.deck as number | null,
    notes: row.notes as string,
    memberIds: JSON.parse((row.memberIds as string) || '[]'),
    reminderMinutes: row.reminderMinutes as number | null,
    photos: JSON.parse((row.photos as string) || '[]'),
    isFavorite: !!(row.isFavorite as number),
    mood: (row.mood as CruiseEvent['mood']) || null,
    createdAt: row.createdAt as number,
    updatedAt: row.updatedAt as number,
  };
}

function rowToMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: row.id as string,
    cruiseId: row.cruiseId as string,
    name: row.name as string,
    color: row.color as string,
    emoji: row.emoji as string,
    isChild: !!(row.isChild as number),
  };
}

function rowToVenue(row: Record<string, unknown>): Venue {
  return {
    id: row.id as string,
    shipName: row.shipName as string,
    name: row.name as string,
    deck: row.deck as number,
    category: row.category as string,
    isDefault: !!(row.isDefault as number),
  };
}

// ---------------------------------------------------------------------------
// Database implementation
// ---------------------------------------------------------------------------

const nativeDb: PlatformDatabase = {
  // -- Cruises ---------------------------------------------------------------

  async getCruises() {
    const conn = await getDb();
    const result = await conn.query('SELECT * FROM cruises ORDER BY createdAt DESC');
    return (result.values || []).map(rowToCruise);
  },

  async getCruise(id) {
    const conn = await getDb();
    const result = await conn.query('SELECT * FROM cruises WHERE id = ?', [id]);
    return result.values?.[0] ? rowToCruise(result.values[0]) : undefined;
  },

  async createCruise(cruise) {
    const conn = await getDb();
    const id = nanoid();
    const now = Date.now();
    await conn.run(
      'INSERT INTO cruises (id, name, shipName, startDate, endDate, coverPhotos, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, cruise.name, cruise.shipName, cruise.startDate, cruise.endDate, JSON.stringify(cruise.coverPhotos ?? {}), now],
    );
    await trackChange('cruises', id, 'insert');
    notify();
    return id;
  },

  async updateCruise(id, changes) {
    const conn = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (changes.name !== undefined) { sets.push('name = ?'); vals.push(changes.name); }
    if (changes.shipName !== undefined) { sets.push('shipName = ?'); vals.push(changes.shipName); }
    if (changes.startDate !== undefined) { sets.push('startDate = ?'); vals.push(changes.startDate); }
    if (changes.endDate !== undefined) { sets.push('endDate = ?'); vals.push(changes.endDate); }
    if (changes.coverPhotos !== undefined) { sets.push('coverPhotos = ?'); vals.push(JSON.stringify(changes.coverPhotos)); }
    if (sets.length === 0) return;
    vals.push(id);
    await conn.run(`UPDATE cruises SET ${sets.join(', ')} WHERE id = ?`, vals);
    await trackChange('cruises', id, 'update');
    notify();
  },

  async deleteCruise(id) {
    const conn = await getDb();
    await conn.run('DELETE FROM events WHERE cruiseId = ?', [id]);
    await conn.run('DELETE FROM members WHERE cruiseId = ?', [id]);
    await conn.run('DELETE FROM cruises WHERE id = ?', [id]);
    await trackChange('cruises', id, 'delete');
    notify();
  },

  // -- Events ----------------------------------------------------------------

  async getEventsForDay(cruiseId, date) {
    const conn = await getDb();
    const result = await conn.query(
      'SELECT * FROM events WHERE cruiseId = ? AND date = ? ORDER BY startTime',
      [cruiseId, date],
    );
    return (result.values || []).map(rowToEvent);
  },

  async getAllCruiseEvents(cruiseId) {
    const conn = await getDb();
    const result = await conn.query(
      'SELECT * FROM events WHERE cruiseId = ? ORDER BY date, startTime',
      [cruiseId],
    );
    return (result.values || []).map(rowToEvent);
  },

  async getEvent(id) {
    const conn = await getDb();
    const result = await conn.query('SELECT * FROM events WHERE id = ?', [id]);
    return result.values?.[0] ? rowToEvent(result.values[0]) : undefined;
  },

  async addEvent(event) {
    const conn = await getDb();
    const id = nanoid();
    const now = Date.now();
    await conn.run(
      `INSERT INTO events (id, cruiseId, title, date, startTime, endTime, category, venue, deck, notes, memberIds, reminderMinutes, photos, isFavorite, mood, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, event.cruiseId, event.title, event.date, event.startTime, event.endTime,
        event.category, event.venue, event.deck, event.notes,
        JSON.stringify(event.memberIds), event.reminderMinutes,
        JSON.stringify(event.photos), event.isFavorite ? 1 : 0, event.mood,
        now, now,
      ],
    );
    await trackChange('events', id, 'insert');
    notify();
    return id;
  },

  async updateEvent(id, changes) {
    const conn = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];

    const stringFields = ['cruiseId', 'title', 'date', 'startTime', 'endTime', 'category', 'venue', 'notes', 'mood'] as const;
    for (const f of stringFields) {
      if ((changes as Record<string, unknown>)[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push((changes as Record<string, unknown>)[f]);
      }
    }
    if (changes.deck !== undefined) { sets.push('deck = ?'); vals.push(changes.deck); }
    if (changes.memberIds !== undefined) { sets.push('memberIds = ?'); vals.push(JSON.stringify(changes.memberIds)); }
    if (changes.reminderMinutes !== undefined) { sets.push('reminderMinutes = ?'); vals.push(changes.reminderMinutes); }
    if (changes.photos !== undefined) { sets.push('photos = ?'); vals.push(JSON.stringify(changes.photos)); }
    if (changes.isFavorite !== undefined) { sets.push('isFavorite = ?'); vals.push(changes.isFavorite ? 1 : 0); }

    sets.push('updatedAt = ?');
    vals.push(Date.now());
    vals.push(id);

    await conn.run(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`, vals);
    await trackChange('events', id, 'update');
    notify();
  },

  async deleteEvent(id) {
    const conn = await getDb();
    await conn.run('DELETE FROM events WHERE id = ?', [id]);
    await trackChange('events', id, 'delete');
    notify();
  },

  // -- Family members --------------------------------------------------------

  async getMembers(cruiseId) {
    const conn = await getDb();
    const result = await conn.query('SELECT * FROM members WHERE cruiseId = ?', [cruiseId]);
    return (result.values || []).map(rowToMember);
  },

  async getMember(id) {
    const conn = await getDb();
    const result = await conn.query('SELECT * FROM members WHERE id = ?', [id]);
    return result.values?.[0] ? rowToMember(result.values[0]) : undefined;
  },

  async addMember(member) {
    const conn = await getDb();
    const id = nanoid();
    await conn.run(
      'INSERT INTO members (id, cruiseId, name, color, emoji, isChild) VALUES (?, ?, ?, ?, ?, ?)',
      [id, member.cruiseId, member.name, member.color, member.emoji, member.isChild ? 1 : 0],
    );
    await trackChange('members', id, 'insert');
    notify();
    return id;
  },

  async updateMember(id, changes) {
    const conn = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (changes.name !== undefined) { sets.push('name = ?'); vals.push(changes.name); }
    if (changes.color !== undefined) { sets.push('color = ?'); vals.push(changes.color); }
    if (changes.emoji !== undefined) { sets.push('emoji = ?'); vals.push(changes.emoji); }
    if (changes.isChild !== undefined) { sets.push('isChild = ?'); vals.push(changes.isChild ? 1 : 0); }
    if (changes.cruiseId !== undefined) { sets.push('cruiseId = ?'); vals.push(changes.cruiseId); }
    if (sets.length === 0) return;
    vals.push(id);
    await conn.run(`UPDATE members SET ${sets.join(', ')} WHERE id = ?`, vals);
    await trackChange('members', id, 'update');
    notify();
  },

  async deleteMember(id) {
    const conn = await getDb();
    // Remove member from all events
    const eventsResult = await conn.query('SELECT id, memberIds FROM events');
    for (const row of eventsResult.values || []) {
      const memberIds: string[] = JSON.parse((row.memberIds as string) || '[]');
      if (memberIds.includes(id)) {
        const updated = memberIds.filter((m) => m !== id);
        await conn.run('UPDATE events SET memberIds = ? WHERE id = ?', [JSON.stringify(updated), row.id as string]);
      }
    }
    await conn.run('DELETE FROM members WHERE id = ?', [id]);
    await trackChange('members', id, 'delete');
    notify();
  },

  // -- Venues ----------------------------------------------------------------

  async getVenuesByCategory() {
    const conn = await getDb();
    const result = await conn.query('SELECT * FROM venues ORDER BY category, name');
    const grouped: Record<string, { name: string; deck: number }[]> = {};
    for (const row of result.values || []) {
      const cat = row.category as string;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat]!.push({ name: row.name as string, deck: row.deck as number });
    }
    return grouped;
  },

  async findVenueDeck(venueName) {
    const conn = await getDb();
    const result = await conn.query('SELECT deck FROM venues WHERE name = ? LIMIT 1', [venueName]);
    return result.values?.[0] ? (result.values[0].deck as number) : null;
  },

  async getVenuesForShip(shipName) {
    const conn = await getDb();
    if (!shipName) {
      const result = await conn.query('SELECT * FROM venues ORDER BY name');
      return (result.values || []).map(rowToVenue);
    }
    const result = await conn.query('SELECT * FROM venues WHERE shipName = ? ORDER BY name', [shipName]);
    return (result.values || []).map(rowToVenue);
  },

  // -- Backup / restore ------------------------------------------------------

  async exportAll() {
    const conn = await getDb();
    const [cruisesRes, membersRes, eventsRes] = await Promise.all([
      conn.query('SELECT * FROM cruises'),
      conn.query('SELECT * FROM members'),
      conn.query('SELECT * FROM events'),
    ]);
    return {
      cruises: (cruisesRes.values || []).map(rowToCruise),
      members: (membersRes.values || []).map(rowToMember),
      events: (eventsRes.values || []).map(rowToEvent),
    };
  },

  async importAll(data) {
    const conn = await getDb();
    await conn.execute('DELETE FROM events; DELETE FROM members; DELETE FROM cruises;');
    for (const c of data.cruises) {
      await conn.run(
        'INSERT INTO cruises (id, name, shipName, startDate, endDate, coverPhotos, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.shipName, c.startDate, c.endDate, JSON.stringify(c.coverPhotos), c.createdAt],
      );
    }
    for (const m of data.members) {
      await conn.run(
        'INSERT INTO members (id, cruiseId, name, color, emoji, isChild) VALUES (?, ?, ?, ?, ?, ?)',
        [m.id, m.cruiseId, m.name, m.color, m.emoji, m.isChild ? 1 : 0],
      );
    }
    for (const e of data.events) {
      await conn.run(
        `INSERT INTO events (id, cruiseId, title, date, startTime, endTime, category, venue, deck, notes, memberIds, reminderMinutes, photos, isFavorite, mood, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.id, e.cruiseId, e.title, e.date, e.startTime, e.endTime,
          e.category, e.venue, e.deck, e.notes,
          JSON.stringify(e.memberIds), e.reminderMinutes,
          JSON.stringify(e.photos), e.isFavorite ? 1 : 0, e.mood,
          e.createdAt, e.updatedAt,
        ],
      );
    }
    notify();
  },

  // -- Change subscription ----------------------------------------------------

  onChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};

// ---------------------------------------------------------------------------
// Photos (native — file system storage)
// ---------------------------------------------------------------------------

const nativePhotos: PlatformPhotos = {
  async savePhoto(dataUrl) {
    // Strip the data URL prefix to get pure base64
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const fileName = `${PHOTOS_DIR}/${nanoid()}.jpg`;

    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents,
    });

    // Return the file path as the URI
    return fileName;
  },

  async getPhotoSrc(uri) {
    // If it's already a data URL (legacy/migrated data), pass through
    if (uri.startsWith('data:')) return uri;

    try {
      const result = await Filesystem.readFile({
        path: uri,
        directory: Directory.Documents,
      });
      // readFile returns base64 data
      return `data:image/jpeg;base64,${result.data}`;
    } catch {
      // File missing — return empty placeholder
      return '';
    }
  },

  async deletePhoto(uri) {
    if (uri.startsWith('data:')) return; // Legacy inline photo, nothing to delete

    try {
      await Filesystem.deleteFile({
        path: uri,
        directory: Directory.Documents,
      });
    } catch {
      // File already gone — no-op
    }
  },

  async captureFromCamera() {
    try {
      const image = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1200,
        height: 1200,
        correctOrientation: true,
      });

      if (!image.base64String) return null;

      const fileName = `${PHOTOS_DIR}/${nanoid()}.jpg`;
      await Filesystem.writeFile({
        path: fileName,
        data: image.base64String,
        directory: Directory.Documents,
      });

      return fileName;
    } catch {
      // User cancelled or camera unavailable
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// CloudKit sync
// ---------------------------------------------------------------------------

// The CloudKit plugin bridge — calls into the Swift CruiseFlowCloudKit plugin.
// When the native plugin isn't registered yet, all calls are safe no-ops.

const CLOUDKIT_PLUGIN = 'CruiseFlowCloudKit';

type PluginCallback = (data: Record<string, unknown>) => void;

interface CloudKitPluginBridge {
  getStatus(): Promise<{ status: string }>;
  getLastSyncTime(): Promise<{ timestamp: number | null }>;
  sync(): Promise<void>;
  isAvailable(): Promise<{ available: boolean }>;
  shareCruise(options: { cruiseId: string }): Promise<void>;
  addListener(event: string, callback: PluginCallback): Promise<{ remove: () => void }>;
}

function getCloudKitPlugin(): CloudKitPluginBridge | null {
  try {
    // Capacitor registers native plugins on the global Capacitor.Plugins object
    const cap = (window as unknown as Record<string, unknown>).Capacitor as Record<string, unknown> | undefined;
    const plugins = cap?.Plugins as Record<string, unknown> | undefined;
    return (plugins?.[CLOUDKIT_PLUGIN] as CloudKitPluginBridge) ?? null;
  } catch {
    return null;
  }
}

const statusListeners = new Set<(status: SyncStatus) => void>();
const dataChangedListeners = new Set<() => void>();

// Set up CloudKit event listeners once
let cloudKitListenersInitialized = false;

function initCloudKitListeners() {
  if (cloudKitListenersInitialized) return;
  cloudKitListenersInitialized = true;

  const plugin = getCloudKitPlugin();
  if (!plugin) return;

  plugin.addListener('syncStatusChanged', (data) => {
    const status = data.status as SyncStatus;
    statusListeners.forEach((fn) => fn(status));
  });

  plugin.addListener('remoteDataChanged', () => {
    dataChangedListeners.forEach((fn) => fn());
    // Also notify the database listeners so queries re-run
    notify();
  });
}

const nativeSync: PlatformSync = {
  getStatus() {
    // Synchronous fallback — real status comes via listeners
    return 'offline';
  },

  getLastSyncTime() {
    const raw = localStorage.getItem('cruiseflow-last-sync');
    return raw ? parseInt(raw, 10) : null;
  },

  onStatusChange(callback) {
    initCloudKitListeners();
    statusListeners.add(callback);
    // Fetch current status async
    const plugin = getCloudKitPlugin();
    if (plugin) {
      plugin.getStatus().then((r) => callback(r.status as SyncStatus)).catch(() => {});
    }
    return () => statusListeners.delete(callback);
  },

  onDataChanged(callback) {
    initCloudKitListeners();
    dataChangedListeners.add(callback);
    return () => dataChangedListeners.delete(callback);
  },

  async sync() {
    const plugin = getCloudKitPlugin();
    if (!plugin) return;
    await plugin.sync();
    localStorage.setItem('cruiseflow-last-sync', String(Date.now()));
  },

  async isAvailable() {
    const plugin = getCloudKitPlugin();
    if (!plugin) return false;
    try {
      const result = await plugin.isAvailable();
      return result.available;
    } catch {
      return false;
    }
  },

  async shareCruise(cruiseId: string) {
    const plugin = getCloudKitPlugin();
    if (!plugin) return;
    await plugin.shareCruise({ cruiseId });
  },
};

// ---------------------------------------------------------------------------
// Migration (IndexedDB → SQLite)
// ---------------------------------------------------------------------------

const nativeMigration: PlatformMigration = {
  async checkMigration(): Promise<MigrationInfo> {
    const { value } = await Preferences.get({ key: MIGRATION_KEY });
    if (value === 'true') {
      return { needed: false, sourceRecordCount: 0, description: 'Already migrated' };
    }

    // Check if IndexedDB has data by trying to open the Dexie database
    try {
      const { db: dexieDb } = await import('@/db/database');
      const cruises = await dexieDb.cruises.count();
      const events = await dexieDb.events.count();
      const members = await dexieDb.members.count();
      const total = cruises + events + members;

      if (total === 0) {
        // No data to migrate — mark complete
        await Preferences.set({ key: MIGRATION_KEY, value: 'true' });
        return { needed: false, sourceRecordCount: 0, description: 'No data to migrate' };
      }

      return {
        needed: true,
        sourceRecordCount: total,
        description: `Found ${cruises} cruise(s), ${members} member(s), ${events} event(s) to migrate`,
      };
    } catch {
      // IndexedDB not available or empty
      return { needed: false, sourceRecordCount: 0, description: 'No IndexedDB data found' };
    }
  },

  async runMigration(onProgress) {
    onProgress(0);

    // 1. Read all data from IndexedDB
    const { db: dexieDb } = await import('@/db/database');
    const cruises = await dexieDb.cruises.toArray();
    onProgress(10);
    const members = await dexieDb.members.toArray();
    onProgress(20);
    const events = await dexieDb.events.toArray();
    onProgress(30);

    const total = cruises.length + members.length + events.length;
    let migrated = 0;

    // 2. Write cruises to SQLite
    for (const cruise of cruises) {
      const conn = await getDb();
      await conn.run(
        'INSERT OR REPLACE INTO cruises (id, name, shipName, startDate, endDate, coverPhotos, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [cruise.id, cruise.name, cruise.shipName, cruise.startDate, cruise.endDate, JSON.stringify(cruise.coverPhotos), cruise.createdAt],
      );
      migrated++;
      onProgress(30 + Math.floor((migrated / total) * 50));
    }

    // 3. Write members
    for (const member of members) {
      const conn = await getDb();
      await conn.run(
        'INSERT OR REPLACE INTO members (id, cruiseId, name, color, emoji, isChild) VALUES (?, ?, ?, ?, ?, ?)',
        [member.id, member.cruiseId, member.name, member.color, member.emoji, member.isChild ? 1 : 0],
      );
      migrated++;
      onProgress(30 + Math.floor((migrated / total) * 50));
    }

    // 4. Write events (including migrating inline photos to files)
    for (const event of events) {
      const migratedPhotos: EventPhoto[] = [];
      for (const photo of event.photos) {
        if (photo.dataUrl.startsWith('data:')) {
          // Migrate base64 photo to file
          const filePath = await nativePhotos.savePhoto(photo.dataUrl);
          migratedPhotos.push({ ...photo, dataUrl: filePath });
        } else {
          migratedPhotos.push(photo);
        }
      }

      const conn = await getDb();
      await conn.run(
        `INSERT OR REPLACE INTO events (id, cruiseId, title, date, startTime, endTime, category, venue, deck, notes, memberIds, reminderMinutes, photos, isFavorite, mood, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id, event.cruiseId, event.title, event.date, event.startTime, event.endTime,
          event.category, event.venue, event.deck, event.notes,
          JSON.stringify(event.memberIds), event.reminderMinutes,
          JSON.stringify(migratedPhotos), event.isFavorite ? 1 : 0, event.mood,
          event.createdAt, event.updatedAt,
        ],
      );
      migrated++;
      onProgress(30 + Math.floor((migrated / total) * 50));
    }

    // 5. Migrate cover photos to files
    for (const cruise of cruises) {
      if (cruise.coverPhotos && Object.keys(cruise.coverPhotos).length > 0) {
        const migratedCovers: Record<string, string> = {};
        for (const [date, dataUrl] of Object.entries(cruise.coverPhotos)) {
          if (dataUrl.startsWith('data:')) {
            migratedCovers[date] = await nativePhotos.savePhoto(dataUrl);
          } else {
            migratedCovers[date] = dataUrl;
          }
        }
        const conn = await getDb();
        await conn.run('UPDATE cruises SET coverPhotos = ? WHERE id = ?', [JSON.stringify(migratedCovers), cruise.id]);
      }
    }

    onProgress(90);

    // 6. Seed venues into SQLite
    try {
      const seed = await import('@/db/seed');
      const conn = await getDb();
      const venueCount = await conn.query('SELECT COUNT(*) as count FROM venues');
      if ((venueCount.values?.[0]?.count as number) === 0) {
        const ships = seed.getKnownShips();
        for (const ship of ships) {
          const venues = seed.getVenuesForShip(ship);
          for (const v of venues) {
            await conn.run(
              'INSERT INTO venues (id, shipName, name, deck, category, isDefault) VALUES (?, ?, ?, ?, ?, 1)',
              [nanoid(), ship, v.name, v.deck, v.category],
            );
          }
        }
      }
    } catch {
      // Venue seeding is non-critical
    }

    onProgress(100);
  },

  async markComplete() {
    await Preferences.set({ key: MIGRATION_KEY, value: 'true' });
  },
};

// ---------------------------------------------------------------------------
// Ensure photos directory exists
// ---------------------------------------------------------------------------

async function ensurePhotosDir() {
  try {
    await Filesystem.mkdir({
      path: PHOTOS_DIR,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch {
    // Directory may already exist
  }
}

// Initialize on load
ensurePhotosDir();

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const nativePlatform: Platform = {
  name: 'native',
  db: nativeDb,
  photos: nativePhotos,
  sync: nativeSync,
  migration: nativeMigration,
};
