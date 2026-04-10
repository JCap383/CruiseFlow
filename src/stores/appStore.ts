import { create } from 'zustand';
import { format } from 'date-fns';

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

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadTheme(): ThemePreference {
  const raw = localStorage.getItem('cruiseflow-theme');
  if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  return 'system';
}

export const useAppStore = create<AppState>((set) => ({
  activeCruiseId: loadFromStorage<string | null>('cruiseflow-cruise-id', null),
  selectedDate: localStorage.getItem('cruiseflow-selected-date') ?? format(new Date(), 'yyyy-MM-dd'),
  apiKey: localStorage.getItem('cruiseflow-api-key') ?? '',
  theme: loadTheme(),
  setActiveCruise: (id) => {
    if (id) {
      localStorage.setItem('cruiseflow-cruise-id', JSON.stringify(id));
    } else {
      localStorage.removeItem('cruiseflow-cruise-id');
    }
    set({ activeCruiseId: id });
  },
  setSelectedDate: (date) => {
    localStorage.setItem('cruiseflow-selected-date', date);
    set({ selectedDate: date });
  },
  setApiKey: (key) => {
    localStorage.setItem('cruiseflow-api-key', key);
    set({ apiKey: key });
  },
  setTheme: (theme) => {
    localStorage.setItem('cruiseflow-theme', theme);
    set({ theme });
  },
}));
