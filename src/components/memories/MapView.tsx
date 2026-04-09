import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { X, MapPin, Navigation } from 'lucide-react';
import type { CruiseEvent } from '@/types';
import { useAllCruiseEvents } from '@/hooks/useEvents';
import { useCruise } from '@/hooks/useCruise';
import { useAppStore } from '@/stores/appStore';

// Well-known cruise port coordinates
const PORT_COORDS: Record<string, [number, number]> = {
  // Caribbean
  'nassau': [25.0480, -77.3554],
  'bahamas': [25.0480, -77.3554],
  'cozumel': [20.4318, -86.9223],
  'costa maya': [18.7311, -87.6933],
  'grand cayman': [19.3133, -81.2546],
  'george town': [19.3133, -81.2546],
  'st. thomas': [18.3358, -64.9308],
  'san juan': [18.4655, -66.1057],
  'puerto rico': [18.4655, -66.1057],
  'jamaica': [18.4762, -77.8939],
  'ocho rios': [18.4096, -77.1044],
  'montego bay': [18.4762, -77.8939],
  'st. maarten': [18.0425, -63.0548],
  'st. martin': [18.0425, -63.0548],
  'aruba': [12.5092, -69.9688],
  'curacao': [12.1696, -68.9900],
  'barbados': [13.1939, -59.5432],
  'antigua': [17.1274, -61.8468],
  'st. kitts': [17.3026, -62.7177],
  'tortola': [18.4316, -64.6231],
  'bvi': [18.4316, -64.6231],
  'key west': [24.5551, -81.7800],
  'roatan': [16.3220, -86.5233],
  'harvest caye': [16.4790, -88.4365],
  'great stirrup cay': [25.8267, -77.9142],

  // Mediterranean
  'barcelona': [41.3874, 2.1686],
  'rome': [41.7475, 12.2848],
  'civitavecchia': [42.0929, 11.7944],
  'naples': [40.8518, 14.2681],
  'venice': [45.4408, 12.3155],
  'dubrovnik': [42.6507, 18.0944],
  'santorini': [36.3932, 25.4615],
  'mykonos': [37.4467, 25.3289],
  'athens': [37.9478, 23.6376],
  'piraeus': [37.9478, 23.6376],
  'marseille': [43.2965, 5.3698],
  'palma de mallorca': [39.5696, 2.6502],
  'amalfi': [40.6340, 14.6027],
  'split': [43.5081, 16.4402],
  'kotor': [42.4248, 18.7712],
  'malta': [35.8989, 14.5146],
  'lisbon': [38.7223, -9.1393],

  // Alaska
  'juneau': [58.3005, -134.4197],
  'skagway': [59.4583, -135.3139],
  'ketchikan': [55.3422, -131.6461],
  'sitka': [57.0531, -135.3300],
  'glacier bay': [58.5000, -136.0000],
  'victoria': [48.4284, -123.3656],
  'seattle': [47.6062, -122.3321],
  'hubbard glacier': [60.0200, -139.4800],

  // Northern Europe
  'oslo': [59.9139, 10.7522],
  'copenhagen': [55.6761, 12.5683],
  'stockholm': [59.3293, 18.0686],
  'helsinki': [60.1699, 24.9384],
  'st. petersburg': [59.9343, 30.3351],
  'tallinn': [59.4370, 24.7536],
  'reykjavik': [64.1466, -21.9426],
  'bergen': [60.3913, 5.3221],
  'amsterdam': [52.3676, 4.9041],
  'southampton': [50.9097, -1.4044],

  // Asia-Pacific
  'tokyo': [35.6762, 139.6503],
  'hong kong': [22.3193, 114.1694],
  'singapore': [1.3521, 103.8198],
  'sydney': [-33.8688, 151.2093],
  'auckland': [-36.8485, 174.7633],

  // US ports
  'miami': [25.7617, -80.1918],
  'fort lauderdale': [26.1003, -80.1396],
  'port canaveral': [28.4084, -80.6101],
  'galveston': [29.3013, -94.7977],
  'new york': [40.6892, -74.0445],
  'new orleans': [29.9511, -90.0715],
  'san francisco': [37.7749, -122.4194],
  'los angeles': [33.7405, -118.2716],
  'long beach': [33.7684, -118.1956],
  'tampa': [27.9506, -82.4572],
  'honolulu': [21.3069, -157.8583],
};

function findPortCoords(text: string): [number, number] | null {
  const lower = text.toLowerCase().trim();
  for (const [port, coords] of Object.entries(PORT_COORDS)) {
    if (lower.includes(port) || port.includes(lower)) {
      return coords;
    }
  }
  return null;
}

interface MapViewProps {
  onClose: () => void;
}

export function MapView({ onClose }: MapViewProps) {
  const events = useAllCruiseEvents();
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  useCruise(activeCruiseId);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  // Extract excursion locations
  const ports = useMemo(() => {
    const excursions = events.filter((e) => e.category === 'excursion');
    const portMap = new Map<string, { name: string; coords: [number, number]; date: string; events: CruiseEvent[] }>();

    for (const e of excursions) {
      // Try to find coords from venue or title
      const searchTexts = [e.venue, e.title, e.notes].filter(Boolean);
      let coords: [number, number] | null = null;
      let portName = '';

      for (const text of searchTexts) {
        coords = findPortCoords(text);
        if (coords) {
          // Find which port name matched
          const lower = text.toLowerCase();
          for (const port of Object.keys(PORT_COORDS)) {
            if (lower.includes(port) || port.includes(lower)) {
              portName = port.charAt(0).toUpperCase() + port.slice(1);
              break;
            }
          }
          break;
        }
      }

      if (coords && portName) {
        const key = portName.toLowerCase();
        const existing = portMap.get(key);
        if (existing) {
          existing.events.push(e);
        } else {
          portMap.set(key, { name: portName, coords, date: e.date, events: [e] });
        }
      }
    }

    return Array.from(portMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      const L = await import('leaflet');

      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainer.current!, {
        center: ports.length > 0 ? ports[0]!.coords : [25, -77],
        zoom: ports.length > 0 ? 5 : 3,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Add markers for each port
      const markers: L.LatLngExpression[] = [];
      ports.forEach((port) => {
        const marker = L.marker(port.coords).addTo(map);
        const dateLabel = format(parse(port.date, 'yyyy-MM-dd', new Date()), 'MMM d');
        marker.bindPopup(`
          <div style="min-width:150px">
            <strong style="font-size:14px">${port.name}</strong>
            <br><span style="color:#666;font-size:12px">${dateLabel}</span>
            <br><span style="font-size:12px">${port.events.length} excursion${port.events.length > 1 ? 's' : ''}</span>
          </div>
        `);
        markers.push(port.coords);

        marker.on('click', () => setSelectedPort(port.name.toLowerCase()));
      });

      // Draw route line between ports
      if (markers.length > 1) {
        L.polyline(markers, {
          color: '#0077b6',
          weight: 2,
          opacity: 0.6,
          dashArray: '8, 8',
        }).addTo(map);
      }

      // Fit bounds to show all markers
      if (markers.length > 1) {
        map.fitBounds(L.latLngBounds(markers), { padding: [40, 40] });
      }

      mapRef.current = map;
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [ports]);

  return (
    <div className="fixed inset-0 z-50 bg-cruise-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cruise-border bg-cruise-bg z-20">
        <button onClick={onClose} className="text-cruise-muted p-1">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-cruise-text flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-ocean-400" />
          Port Map
        </h2>
        <span className="text-xs text-cruise-muted">
          {ports.length} port{ports.length !== 1 ? 's' : ''}
        </span>
      </div>

      {ports.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <MapPin className="w-10 h-10 text-cruise-muted/30 mx-auto mb-3" />
            <p className="text-cruise-muted font-medium">No port stops found</p>
            <p className="text-cruise-muted/60 text-xs mt-1">
              Add excursion events with port names to see them on the map
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Map */}
          <div ref={mapContainer} className="flex-1 z-10" />

          {/* Leaflet CSS */}
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />

          {/* Port list */}
          <div className="max-h-[30vh] overflow-y-auto bg-cruise-bg border-t border-cruise-border">
            {ports.map((port, idx) => (
              <button
                key={port.name}
                onClick={() => {
                  setSelectedPort(port.name.toLowerCase());
                  mapRef.current?.setView(port.coords, 10);
                }}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-cruise-border/50 ${
                  selectedPort === port.name.toLowerCase() ? 'bg-ocean-500/10' : ''
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-ocean-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cruise-text truncate">{port.name}</p>
                  <p className="text-xs text-cruise-muted">
                    {format(parse(port.date, 'yyyy-MM-dd', new Date()), 'EEEE, MMM d')}
                    {' · '}
                    {port.events.length} excursion{port.events.length > 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
