/**
 * Reactive data hook that works with any platform backend.
 *
 * On web this re-runs the query whenever the Dexie-backed platform
 * layer fires a change notification. On native (future) it will
 * respond to SQLite change events the same way.
 *
 * This replaces direct usage of `useLiveQuery` from dexie-react-hooks
 * so the hooks layer stays backend-agnostic.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { platform } from './index';

/**
 * Run an async query and re-run it whenever the platform database changes.
 *
 * @param queryFn  — async function that returns the data
 * @param deps     — dependency array (like useEffect); query re-runs when deps change
 * @param fallback — value returned while the first query is still loading
 */
export function usePlatformQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[],
  fallback: T,
): T {
  const [data, setData] = useState<T>(fallback);
  const mountedRef = useRef(true);

  // Stable reference to the query function that updates when deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableQuery = useCallback(queryFn, deps);

  useEffect(() => {
    mountedRef.current = true;

    // Run the query immediately
    const run = () => {
      stableQuery().then((result) => {
        if (mountedRef.current) {
          setData(result);
        }
      });
    };

    run();

    // Re-run whenever the platform fires a data-changed event
    const unsubscribe = platform.db.onChange(run);

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [stableQuery]);

  return data;
}
