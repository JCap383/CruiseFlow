import { create } from 'zustand';
import { format } from 'date-fns';

interface ExtractedEvent {
  title: string;
  startTime: string;
  endTime: string;
  category: string;
  venue: string;
  deck: number | null;
  notes: string;
}

interface ScanResult {
  date: string | null;
  events: ExtractedEvent[];
  rawText: string;
}

interface AppState {
  activeCruiseId: string | null;
  selectedDate: string;
  apiKey: string;
  scanResults: ScanResult[];
  setActiveCruise: (id: string | null) => void;
  setSelectedDate: (date: string) => void;
  setApiKey: (key: string) => void;
  addScanResult: (result: ScanResult) => void;
  clearScanResults: () => void;
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
  selectedDate: format(new Date(), 'yyyy-MM-dd'),
  apiKey: localStorage.getItem('cruiseflow-api-key') ?? '',
  scanResults: loadFromStorage<ScanResult[]>('cruiseflow-scan-results', []),
  setActiveCruise: (id) => {
    if (id) {
      localStorage.setItem('cruiseflow-cruise-id', JSON.stringify(id));
    } else {
      localStorage.removeItem('cruiseflow-cruise-id');
    }
    set({ activeCruiseId: id });
  },
  setSelectedDate: (date) => set({ selectedDate: date }),
  setApiKey: (key) => {
    localStorage.setItem('cruiseflow-api-key', key);
    set({ apiKey: key });
  },
  addScanResult: (result) =>
    set((s) => {
      const updated = [...s.scanResults, result];
      localStorage.setItem('cruiseflow-scan-results', JSON.stringify(updated));
      return { scanResults: updated };
    }),
  clearScanResults: () => {
    localStorage.removeItem('cruiseflow-scan-results');
    set({ scanResults: [] });
  },
}));
