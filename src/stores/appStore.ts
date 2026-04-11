import { create } from 'zustand';
import { format, isValid, parse } from 'date-fns';

export type ThemePreference = 'system' | 'dark' | 'light';

interface AppState {
  activeCruiseId: string | null;
  selectedDate: string;
  apiKey: string;
  theme: ThemePreference;
  setActiveCruise: (id: string | null) => void;
  setSelectedDate: (date: string) => void;
  setApiKey: (key: string) => void;
  setTheme: (theme: ThemePreference) => void;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Strip surrounding JSON quotes that older versions may have left behind. */
function stripJsonQuotes(raw: string): string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
    } catch {
      // fall through
    }
  }
  return raw;
}

/**
 * Validate that a string is a parseable yyyy-MM-dd date. Returns null on
 * failure so callers can fall back to a sane default. This is the safety net
 * that prevents corrupted persisted state (e.g. JSON-quoted dates) from
 * crashing every screen that calls `format(parse(selectedDate, ...))`.
 */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!ISO_DATE_RE.test(value)) return false;
  return isValid(parse(value, 'yyyy-MM-dd', new Date()));
}

function loadActiveCruiseId(): string | null {
  try {
    const raw = localStorage.getItem('cruiseflow-cruise-id');
    if (!raw) return null;
    // Older versions stored the id JSON-stringified; tolerate both shapes.
    if (raw.startsWith('"')) {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'string' ? parsed : null;
      } catch {
        return null;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

function loadSelectedDate(): string {
  try {
    const raw = localStorage.getItem('cruiseflow-selected-date');
    if (raw) {
      const cleaned = stripJsonQuotes(raw);
      if (isValidIsoDate(cleaned)) return cleaned;
    }
  } catch {
    // ignore
  }
  return format(new Date(), 'yyyy-MM-dd');
}

function loadApiKey(): string {
  try {
    return localStorage.getItem('cruiseflow-api-key') ?? '';
  } catch {
    return '';
  }
}

function loadTheme(): ThemePreference {
  try {
    const raw = localStorage.getItem('cruiseflow-theme');
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  } catch {
    // ignore
  }
  return 'system';
}

export const useAppStore = create<AppState>((set) => ({
  activeCruiseId: loadActiveCruiseId(),
  selectedDate: loadSelectedDate(),
  apiKey: loadApiKey(),
  theme: loadTheme(),
  setActiveCruise: (id) => {
    try {
      if (id) {
        localStorage.setItem('cruiseflow-cruise-id', id);
      } else {
        localStorage.removeItem('cruiseflow-cruise-id');
      }
    } catch {
      // ignore (private mode / quota)
    }
    set({ activeCruiseId: id });
  },
  setSelectedDate: (date) => {
    // Defensive: refuse to persist garbage. Fall back to today if a caller
    // ever passes something malformed (better than crashing the app on the
    // next reload).
    const safe = isValidIsoDate(date) ? date : format(new Date(), 'yyyy-MM-dd');
    try {
      localStorage.setItem('cruiseflow-selected-date', safe);
    } catch {
      // ignore
    }
    set({ selectedDate: safe });
  },
  setApiKey: (key) => {
    try {
      localStorage.setItem('cruiseflow-api-key', key);
    } catch {
      // ignore
    }
    set({ apiKey: key });
  },
  setTheme: (theme) => {
    try {
      localStorage.setItem('cruiseflow-theme', theme);
    } catch {
      // ignore
    }
    set({ theme });
  },
}));
