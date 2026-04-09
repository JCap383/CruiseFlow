import { useState, useEffect } from 'react';
import { platform, type SyncStatus } from '@/platform';

/**
 * Hook to track the current sync status.
 * On web this always returns 'unavailable'.
 * On native (future) it will reflect CloudKit sync state.
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
