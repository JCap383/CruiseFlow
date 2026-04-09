/**
 * Platform entry point.
 *
 * Detects whether the app is running inside a Capacitor native shell
 * or a plain browser, and exports the appropriate implementation.
 *
 * Usage:
 *   import { platform } from '@/platform';
 *   const cruises = await platform.db.getCruises();
 */

import { Capacitor } from '@capacitor/core';
import { webPlatform } from './web';
import { nativePlatform } from './native';
import type { Platform } from './types';

export const platform: Platform = Capacitor.isNativePlatform()
  ? nativePlatform
  : webPlatform;

export type { Platform, PlatformDatabase, PlatformSync, SyncStatus } from './types';
