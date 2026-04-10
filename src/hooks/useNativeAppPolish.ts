import { useEffect } from 'react';
import { platform } from '@/platform';

/**
 * Applies native iOS polish when running inside Capacitor:
 *  - Status bar style follows the current theme (light content on dark bg)
 *  - Keyboard resize mode set to 'body' so inputs push content
 *  - Back-button support on Android (native only)
 *
 * All calls are dynamic imports so the web bundle stays clean if these
 * plugins aren't installed in the environment.
 */
export function useNativeAppPolish() {
  useEffect(() => {
    if (platform.name !== 'native') return;

    let cancelled = false;

    // Use a dynamic specifier so TypeScript doesn't try to resolve the
    // Capacitor modules statically — they're optional runtime dependencies.
    const dynamicImport = (spec: string): Promise<unknown> =>
      (new Function('s', 'return import(s)') as (s: string) => Promise<unknown>)(spec);

    (async () => {
      try {
        const sb = (await dynamicImport('@capacitor/status-bar').catch(() => null)) as
          | {
              StatusBar?: {
                setStyle?: (o: { style: string }) => Promise<void>;
                setBackgroundColor?: (o: { color: string }) => Promise<void>;
                setOverlaysWebView?: (o: { overlay: boolean }) => Promise<void>;
              };
            }
          | null;
        if (!cancelled && sb?.StatusBar) {
          const StatusBar = sb.StatusBar;
          await StatusBar.setStyle?.({ style: 'DARK' }).catch(() => {});
          await StatusBar.setBackgroundColor?.({ color: '#0a1120' }).catch(() => {});
          await StatusBar.setOverlaysWebView?.({ overlay: true }).catch(() => {});
        }
      } catch { /* ignore */ }

      try {
        const kb = (await dynamicImport('@capacitor/keyboard').catch(() => null)) as
          | {
              Keyboard?: {
                setResizeMode?: (o: { mode: string }) => Promise<void>;
                setAccessoryBarVisible?: (o: { isVisible: boolean }) => Promise<void>;
              };
            }
          | null;
        if (!cancelled && kb?.Keyboard) {
          const Keyboard = kb.Keyboard;
          await Keyboard.setResizeMode?.({ mode: 'body' }).catch(() => {});
          await Keyboard.setAccessoryBarVisible?.({ isVisible: false }).catch(() => {});
        }
      } catch { /* ignore */ }
    })();

    return () => { cancelled = true; };
  }, []);
}
