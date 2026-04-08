import { format, parse } from 'date-fns';

export function formatTime(time24: string): string {
  const date = parse(time24, 'HH:mm', new Date());
  return format(date, 'h:mm a');
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function timeToMinutes(time24: string): number {
  const [h, m] = time24.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function isCurrentlyActive(
  date: string,
  startTime: string,
  endTime: string,
): boolean {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  if (date !== today) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= timeToMinutes(startTime) && nowMinutes < timeToMinutes(endTime);
}

export function isUpcoming(date: string, startTime: string): boolean {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  if (date !== today) return date > today;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(startTime) > nowMinutes;
}

export function isPast(date: string, endTime: string): boolean {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  if (date < today) return true;
  if (date > today) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(endTime) <= nowMinutes;
}
