import { useState, useEffect } from 'react';
import { platform, type SyncStatus } from '@/platform';

/**
 * Hook to track the current sync status.
 * On web this always returns 'unavailable'.
 * On native it reflects CloudKit sync state.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(
    platform.sync?.getStatus() ?? 'unavailable',
  );

  useEffect(() => {
    if (!platform.sync) return;
    return platform.sync.onStatusChange(setStatus);
  }, []);

  return status;
}

/**
 * Hook to get the last successful sync timestamp.
 * Returns null if sync has never completed.
 */
export function useLastSyncTime(): number | null {
  const [time, setTime] = useState<number | null>(
    platform.sync?.getLastSyncTime() ?? null,
  );

  useEffect(() => {
    if (!platform.sync) return;
    // Re-check on status changes (sync completion updates the time)
    return platform.sync.onStatusChange(() => {
      setTime(platform.sync?.getLastSyncTime() ?? null);
    });
  }, []);

  return time;
}

/**
 * Hook that triggers a callback when remote data changes arrive.
 * Used to refresh queries after CloudKit pushes new data.
 */
export function useRemoteDataChanges(callback: () => void) {
  useEffect(() => {
    if (!platform.sync) return;
    return platform.sync.onDataChanged(callback);
  }, [callback]);
}
