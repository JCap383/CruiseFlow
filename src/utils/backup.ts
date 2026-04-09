import { platform } from '@/platform';
import type { Cruise, CruiseEvent, FamilyMember } from '@/types';

const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  appVersion: string;
  cruises: Cruise[];
  members: FamilyMember[];
  events: CruiseEvent[];
}

/**
 * Export all user data (cruises, members, events) as a JSON backup.
 * Excludes venue seed data since it's auto-generated.
 */
export async function createBackup(): Promise<BackupData> {
  const data = await platform.db.exportAll();

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    ...data,
  };
}

/**
 * Download backup as a .json file.
 */
export async function downloadBackup(): Promise<void> {
  const backup = await createBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `cruiseflow-backup-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate a backup file and return parsed data or an error message.
 */
export function validateBackup(data: unknown): { valid: true; backup: BackupData } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid file format.' };
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
    return { valid: false, error: 'Missing backup version. This may not be a CruiseFlow backup.' };
  }

  if (obj.version > BACKUP_VERSION) {
    return { valid: false, error: `Backup version ${obj.version} is newer than this app supports (v${BACKUP_VERSION}). Please update CruiseFlow first.` };
  }

  if (!Array.isArray(obj.cruises)) {
    return { valid: false, error: 'No cruise data found in backup.' };
  }

  if (!Array.isArray(obj.members)) {
    return { valid: false, error: 'No member data found in backup.' };
  }

  if (!Array.isArray(obj.events)) {
    return { valid: false, error: 'No event data found in backup.' };
  }

  return { valid: true, backup: obj as unknown as BackupData };
}

/**
 * Read and parse a backup file selected by the user.
 */
export function readBackupFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        resolve(data);
      } catch {
        reject(new Error('Could not parse file. Make sure it is a valid CruiseFlow backup (.json).'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

/**
 * Restore data from a validated backup. Replaces all existing data.
 */
export async function restoreBackup(backup: BackupData): Promise<{ cruises: number; members: number; events: number }> {
  await platform.db.importAll({
    cruises: backup.cruises,
    members: backup.members,
    events: backup.events,
  });

  return {
    cruises: backup.cruises.length,
    members: backup.members.length,
    events: backup.events.length,
  };
}
