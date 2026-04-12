/**
 * #97: Seeds a fully-populated demo cruise into the database.
 *
 * Dates are anchored relative to today so the cruise appears as recently
 * ended (start = today − 15 days, end = today − 8 days). This puts it
 * right inside the 7-day recap promo window.
 */

import { subDays, format, addDays } from 'date-fns';
import { createCruise, updateCruise, deleteCruise } from '@/hooks/useCruise';
import { addEvent } from '@/hooks/useEvents';
import { addMember } from '@/hooks/useFamily';
import {
  DEMO_MEMBERS,
  DEMO_EVENTS,
  DEMO_COVER_PHOTOS,
  makePlaceholderPhoto,
} from './demoCruise';

/**
 * Create and populate a demo cruise. Returns the new cruise ID.
 */
export async function seedDemoCruise(): Promise<string> {
  const today = new Date();
  const startDate = subDays(today, 15);
  const endDate = subDays(today, 8);

  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

  // 1. Create the cruise
  const cruiseId = await createCruise({
    name: 'Caribbean Getaway',
    shipName: 'Norwegian Prima',
    startDate: fmt(startDate),
    endDate: fmt(endDate),
    coverPhotos: {},
    isDemo: true,
  });

  // 2. Add family members and collect their IDs
  const memberIds: string[] = [];
  for (const m of DEMO_MEMBERS) {
    const id = await addMember({
      cruiseId,
      name: m.name,
      emoji: m.emoji,
      color: m.color,
      isChild: m.isChild,
    });
    memberIds.push(id);
  }

  // 3. Add events with photos
  for (const ev of DEMO_EVENTS) {
    const eventDate = fmt(addDays(startDate, ev.dayOffset));

    const photos = ev.photos.map(([label, paletteIdx], i) => ({
      id: `demo-photo-${ev.dayOffset}-${ev.title.replace(/\s+/g, '-').toLowerCase()}-${i}`,
      dataUrl: makePlaceholderPhoto(label, paletteIdx),
      caption: '',
      addedAt: Date.now() - (7 - ev.dayOffset) * 86_400_000 + i * 1000,
    }));

    await addEvent({
      cruiseId,
      title: ev.title,
      date: eventDate,
      startTime: ev.startTime,
      endTime: ev.endTime,
      category: ev.category,
      venue: ev.venue,
      deck: ev.deck,
      notes: ev.notes,
      memberIds: ev.memberIndices.map((idx) => memberIds[idx]!),
      reminderMinutes: null,
      photos,
      isFavorite: ev.isFavorite,
      mood: ev.mood,
    });
  }

  // 4. Set cover photos for each day
  const coverPhotos: Record<string, string> = {};
  for (const cp of DEMO_COVER_PHOTOS) {
    const date = fmt(addDays(startDate, cp.dayOffset));
    coverPhotos[date] = makePlaceholderPhoto(cp.label, cp.palette);
  }
  await updateCruise(cruiseId, { coverPhotos });

  return cruiseId;
}

/**
 * Delete the demo cruise and all associated data.
 */
export async function deleteDemoCruise(cruiseId: string): Promise<void> {
  await deleteCruise(cruiseId);
}
