import { create } from 'zustand';
import { format } from 'date-fns';

interface AppState {
  activeCruiseId: string | null;
  selectedDate: string;
  apiKey: string;
  setActiveCruise: (id: string | null) => void;
  setSelectedDate: (date: string) => void;
  setApiKey: (key: string) => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useAppStore = create<AppState>((set) => ({
  activeCruiseId: loadFromStorage<string | null>('cruiseflow-cruise-id', null),
  selectedDate: localStorage.getItem('cruiseflow-selected-date') ?? format(new Date(), 'yyyy-MM-dd'),
  apiKey: localStorage.getItem('cruiseflow-api-key') ?? '',
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
}));
