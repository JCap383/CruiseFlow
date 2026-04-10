/**
 * Haptic feedback utility. Uses Capacitor Haptics when available on native,
 * falls back to navigator.vibrate on web where supported, and no-ops otherwise.
 */

type CapacitorHapticsShape = {
  impact: (opts: { style: string }) => Promise<void>;
  notification: (opts: { type: string }) => Promise<void>;
  selectionStart: () => Promise<void>;
  selectionChanged: () => Promise<void>;
  selectionEnd: () => Promise<void>;
};

let hapticsPlugin: CapacitorHapticsShape | null = null;
let pluginLoaded = false;

async function getPlugin(): Promise<CapacitorHapticsShape | null> {
  if (pluginLoaded) return hapticsPlugin;
  pluginLoaded = true;
  try {
    // Dynamic import so the web bundle doesn't choke if the plugin isn't installed.
    // Use a Function wrapper so TypeScript doesn't try to resolve the module
    // at compile time — it's an optional runtime dependency on native only.
    const dynamicImport = (spec: string): Promise<unknown> =>
      (new Function('s', 'return import(s)') as (s: string) => Promise<unknown>)(spec);
    const mod = (await dynamicImport('@capacitor/haptics').catch(() => null)) as
      | { Haptics?: CapacitorHapticsShape }
      | null;
    if (mod?.Haptics) {
      hapticsPlugin = mod.Haptics;
    }
  } catch {
    hapticsPlugin = null;
  }
  return hapticsPlugin;
}

function webVibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

export const haptics = {
  async tap() {
    const plugin = await getPlugin();
    if (plugin) {
      plugin.impact({ style: 'LIGHT' }).catch(() => {});
    } else {
      webVibrate(8);
    }
  },
  async medium() {
    const plugin = await getPlugin();
    if (plugin) {
      plugin.impact({ style: 'MEDIUM' }).catch(() => {});
    } else {
      webVibrate(12);
    }
  },
  async heavy() {
    const plugin = await getPlugin();
    if (plugin) {
      plugin.impact({ style: 'HEAVY' }).catch(() => {});
    } else {
      webVibrate(18);
    }
  },
  async success() {
    const plugin = await getPlugin();
    if (plugin) {
      plugin.notification({ type: 'SUCCESS' }).catch(() => {});
    } else {
      webVibrate([8, 40, 8]);
    }
  },
  async warning() {
    const plugin = await getPlugin();
    if (plugin) {
      plugin.notification({ type: 'WARNING' }).catch(() => {});
    } else {
      webVibrate([12, 60, 12]);
    }
  },
  async error() {
    const plugin = await getPlugin();
    if (plugin) {
      plugin.notification({ type: 'ERROR' }).catch(() => {});
    } else {
      webVibrate([20, 60, 20]);
    }
  },
};
