import { useEffect, useRef } from 'react';
import { platform } from '@/platform';
import { timeToMinutes } from '@/utils/time';
import { useAppStore } from '@/stores/appStore';
import type { CruiseEvent } from '@/types';

// Set of notification keys that have already been dispatched this session so
// we don't spam the user if the polling interval fires while the target time
// is still within window.
const firedKeys = new Set<string>();

function notificationKey(event: CruiseEvent): string {
  return `${event.id}:${event.reminderMinutes}`;
}

async function ensurePermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

function showNotification(event: CruiseEvent, minutes: number) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const body = [
    event.venue ? `at ${event.venue}` : null,
    event.deck != null ? `Deck ${event.deck}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  try {
    new Notification(`${event.title} starts in ${minutes} min`, {
      body: body || 'Tap to open in CruiseFlow',
      tag: event.id,
      icon: '/icon-192.png',
    });
  } catch {
    // ignore — some browsers throw if called at the wrong time
  }
}

/**
 * Polls events and fires a browser notification when the current time is
 * within `reminderMinutes` of the event start. Notifications are tracked by
 * event id + minutes so each reminder only fires once per session.
 */
export function useEventNotifications() {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const permissionRequested = useRef(false);

  useEffect(() => {
    if (!activeCruiseId) return;

    // Request permission on mount the first time the user has the dashboard
    // open; it's a no-op if already granted/denied.
    if (!permissionRequested.current) {
      permissionRequested.current = true;
      ensurePermission();
    }

    const check = async () => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const events = await platform.db.getAllCruiseEvents(activeCruiseId);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nowMin = now.getHours() * 60 + now.getMinutes();

      for (const event of events) {
        if (event.date !== today) continue;
        if (event.reminderMinutes == null) continue;
        const key = notificationKey(event);
        if (firedKeys.has(key)) continue;
        const startMin = timeToMinutes(event.startTime);
        const remindAt = startMin - event.reminderMinutes;
        // Fire if within the current minute window
        if (nowMin >= remindAt && nowMin < startMin) {
          firedKeys.add(key);
          showNotification(event, event.reminderMinutes);
        }
      }
    };

    check();
    const interval = window.setInterval(check, 30_000);
    return () => window.clearInterval(interval);
  }, [activeCruiseId]);
}
