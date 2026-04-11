import { useMemo, useState } from 'react';
import {
  Ship,
  Search,
  MapPin,
  Utensils,
  Wine,
  Music,
  Baby,
  Waves,
  Activity,
  Sparkles,
  Info,
  Layers,
  LayoutGrid,
  X,
} from 'lucide-react';
import { useCruise, useCruises } from '@/hooks/useCruise';
import { useVenuesForShip } from '@/hooks/useVenues';
import { useAppStore } from '@/stores/appStore';
import { getCruiseLineForShip } from '@/db/shipCatalog';
import { Text } from '@/components/ui/Text';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { haptics } from '@/utils/haptics';
import type { Venue } from '@/types';

// ─── Category metadata ────────────────────────────────────────────────────

interface CategoryMeta {
  id: string;
  label: string;
  icon: typeof Ship;
  tint: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  dining: { id: 'dining', label: 'Dining', icon: Utensils, tint: '#f59e0b' },
  bar: { id: 'bar', label: 'Bars & Lounges', icon: Wine, tint: '#a855f7' },
  entertainment: {
    id: 'entertainment',
    label: 'Entertainment',
    icon: Music,
    tint: '#ec4899',
  },
  kids: { id: 'kids', label: 'Kids & Teens', icon: Baby, tint: '#22c55e' },
  pool: { id: 'pool', label: 'Pools', icon: Waves, tint: '#06b6d4' },
  activity: { id: 'activity', label: 'Activities', icon: Activity, tint: '#f97316' },
  spa: { id: 'spa', label: 'Spa & Fitness', icon: Sparkles, tint: '#14b8a6' },
  service: { id: 'service', label: 'Services', icon: Info, tint: '#64748b' },
};

const CATEGORY_ORDER = [
  'dining',
  'bar',
  'entertainment',
  'kids',
  'pool',
  'activity',
  'spa',
  'service',
];

function categoryFor(id: string): CategoryMeta {
  return (
    CATEGORY_META[id] ?? {
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      icon: Info,
      tint: '#64748b',
    }
  );
}

// ─── Main page ───────────────────────────────────────────────────────────

type ViewMode = 'category' | 'deck';

export function ShipInfo() {
  const activeCruiseId = useAppStore((s) => s.activeCruiseId);
  const allCruises = useCruises() ?? [];

  // Users can browse any cruise's ship, defaulting to the active one.
  const [cruiseFilter, setCruiseFilter] = useState<string | null>(activeCruiseId);
  const cruise = useCruise(cruiseFilter ?? activeCruiseId);

  const shipName = cruise?.shipName ?? '';
  const cruiseLine = useMemo(
    () => (shipName ? getCruiseLineForShip(shipName) : undefined),
    [shipName],
  );

  const venues = useVenuesForShip(shipName) ?? [];
  const loading = venues === undefined;

  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Apply search + category filter
  const filteredVenues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((v) => {
      if (activeCategory && v.category !== activeCategory) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        `deck ${v.deck}`.includes(q)
      );
    });
  }, [venues, query, activeCategory]);

  // Group venues by category for the category view
  const byCategory = useMemo(() => {
    const map = new Map<string, Venue[]>();
    for (const v of filteredVenues) {
      const list = map.get(v.category) ?? [];
      list.push(v);
      map.set(v.category, list);
    }
    // Sort each group by deck then name
    for (const list of map.values()) {
      list.sort((a, b) => a.deck - b.deck || a.name.localeCompare(b.name));
    }
    return map;
  }, [filteredVenues]);

  // Group venues by deck for the deck view (descending so the top decks
  // render first — pools, sports, specialty dining tend to live high up).
  const byDeck = useMemo(() => {
    const map = new Map<number, Venue[]>();
    for (const v of filteredVenues) {
      const list = map.get(v.deck) ?? [];
      list.push(v);
      map.set(v.deck, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filteredVenues]);

  // Category chips show counts of unfiltered-by-category venues so users
  // can still see what's available when a category is already selected.
  const categoryCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, number>();
    for (const v of venues) {
      if (
        q &&
        !(
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          `deck ${v.deck}`.includes(q)
        )
      ) {
        continue;
      }
      map.set(v.category, (map.get(v.category) ?? 0) + 1);
    }
    return map;
  }, [venues, query]);

  const orderedCategories = useMemo(() => {
    const present = [...categoryCounts.keys()];
    return present.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [categoryCounts]);

  const totalDecks = useMemo(() => {
    const decks = new Set(venues.map((v) => v.deck));
    return decks.size;
  }, [venues]);

  // ─── No cruise selected ─────────────────────────────────────────────

  if (allCruises.length === 0) {
    return (
      <div className="flex flex-col">
        <ShipHeader title="Ship Info" subtitle="No cruise yet" />
        <EmptyState
          icon={<Ship className="w-8 h-8" />}
          title="No cruises yet"
          description="Create a cruise to see deck plans and venue information for your ship."
        />
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <ShipHeader
        title={shipName || 'Ship Info'}
        subtitle={
          cruiseLine
            ? cruiseLine.name
            : shipName
              ? 'Cruise ship'
              : 'Select a cruise'
        }
        shipName={shipName}
      />

      {/* Cruise switcher (only shown when user has multiple cruises) */}
      {allCruises.length > 1 && (
        <div className="mt-4">
          <div className="px-4 mb-2">
            <Text
              variant="caption"
              weight="semibold"
              tone="accent"
              className="uppercase tracking-wider"
            >
              Cruise
            </Text>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
            {[...allCruises]
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((c) => {
                const active = (cruiseFilter ?? activeCruiseId) === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      void haptics.tap();
                      setCruiseFilter(c.id);
                    }}
                    className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap press"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                      color: active ? 'var(--accent-fg)' : 'var(--fg-muted)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                    }}
                    aria-pressed={active}
                  >
                    {c.name}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Stats ribbon */}
      {venues.length > 0 && (
        <div
          className="mx-4 mt-4 rounded-2xl p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Ship
              className="w-4 h-4"
              style={{ color: 'var(--accent)' }}
              aria-hidden="true"
            />
            <Text
              variant="caption"
              weight="semibold"
              tone="accent"
              className="uppercase tracking-wider"
            >
              Ship summary
            </Text>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat value={venues.length} label="Venues" />
            <Stat value={categoryCounts.size || orderedCategories.length} label="Categories" />
            <Stat value={totalDecks} label="Decks" />
          </div>
        </div>
      )}

      {/* Search */}
      {venues.length > 0 && (
        <div className="px-4 mt-4">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Search
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--fg-subtle)' }}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search venues, decks, or categories"
              className="flex-1 bg-transparent text-body focus:outline-none min-w-0"
              style={{ color: 'var(--fg-default)' }}
              aria-label="Search ship venues"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-0.5 press"
                aria-label="Clear search"
                style={{ color: 'var(--fg-subtle)' }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category chips + view-mode toggle */}
      {venues.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between px-4 mb-2">
            <Text
              variant="caption"
              weight="semibold"
              tone="accent"
              className="uppercase tracking-wider"
            >
              Browse
            </Text>
            <div
              className="inline-flex rounded-full p-0.5"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                onClick={() => {
                  void haptics.tap();
                  setViewMode('category');
                }}
                className="text-caption font-semibold px-3 py-1 rounded-full flex items-center gap-1 press"
                style={{
                  backgroundColor:
                    viewMode === 'category' ? 'var(--accent)' : 'transparent',
                  color:
                    viewMode === 'category'
                      ? 'var(--accent-fg)'
                      : 'var(--fg-muted)',
                }}
                aria-pressed={viewMode === 'category'}
              >
                <LayoutGrid className="w-3 h-3" aria-hidden="true" />
                Category
              </button>
              <button
                type="button"
                onClick={() => {
                  void haptics.tap();
                  setViewMode('deck');
                }}
                className="text-caption font-semibold px-3 py-1 rounded-full flex items-center gap-1 press"
                style={{
                  backgroundColor:
                    viewMode === 'deck' ? 'var(--accent)' : 'transparent',
                  color:
                    viewMode === 'deck'
                      ? 'var(--accent-fg)'
                      : 'var(--fg-muted)',
                }}
                aria-pressed={viewMode === 'deck'}
              >
                <Layers className="w-3 h-3" aria-hidden="true" />
                Deck
              </button>
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
            <button
              type="button"
              onClick={() => {
                void haptics.tap();
                setActiveCategory(null);
              }}
              className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap press"
              style={{
                backgroundColor: !activeCategory ? 'var(--accent)' : 'var(--bg-card)',
                color: !activeCategory ? 'var(--accent-fg)' : 'var(--fg-muted)',
                border: `1px solid ${!activeCategory ? 'var(--accent)' : 'var(--border-default)'}`,
              }}
              aria-pressed={!activeCategory}
            >
              All
            </button>
            {orderedCategories.map((catId) => {
              const meta = categoryFor(catId);
              const Icon = meta.icon;
              const active = activeCategory === catId;
              const count = categoryCounts.get(catId) ?? 0;
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => {
                    void haptics.tap();
                    setActiveCategory(active ? null : catId);
                  }}
                  className="text-footnote px-3 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1.5 press"
                  style={{
                    backgroundColor: active ? 'var(--accent)' : 'var(--bg-card)',
                    color: active ? 'var(--accent-fg)' : 'var(--fg-muted)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                  }}
                  aria-pressed={active}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {meta.label}
                  <span
                    className="text-[10px] px-1 rounded-full"
                    style={{
                      backgroundColor: active
                        ? 'rgba(255,255,255,0.25)'
                        : 'var(--bg-elevated)',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="px-4 mt-6 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl h-20 animate-pulse"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
              }}
            />
          ))}
        </div>
      ) : venues.length === 0 ? (
        <EmptyState
          icon={<Ship className="w-8 h-8" />}
          title="No venue info for this ship"
          description={
            shipName
              ? `We don't have deck plans and venue data for ${shipName} yet — support for more ships is on the way.`
              : 'Add a ship to your cruise to see its deck plans and venues.'
          }
        />
      ) : filteredVenues.length === 0 ? (
        <EmptyState
          icon={<Search className="w-8 h-8" />}
          title="No venues match"
          description="Try a different search term or clear the category filter."
        />
      ) : viewMode === 'category' ? (
        <div className="flex flex-col gap-5 mt-5 pb-6">
          {CATEGORY_ORDER.filter((id) => byCategory.has(id))
            .concat(
              [...byCategory.keys()].filter((id) => !CATEGORY_ORDER.includes(id)),
            )
            .map((catId) => (
              <CategorySection
                key={catId}
                meta={categoryFor(catId)}
                venues={byCategory.get(catId) ?? []}
              />
            ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5 mt-5 pb-6">
          {byDeck.map(([deck, deckVenues]) => (
            <DeckSection key={deck} deck={deck} venues={deckVenues} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────

function ShipHeader({
  title,
  subtitle,
  shipName,
}: {
  title: string;
  subtitle: string;
  shipName?: string;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 200 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, var(--accent) 0%, #0369a1 60%, #0c4a6e 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 50%, var(--bg-default) 100%)',
        }}
      />
      {/* Big faded ship icon */}
      <Ship
        className="absolute -right-6 -bottom-6 text-white/15"
        style={{ width: 200, height: 200 }}
        strokeWidth={1}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 right-0 px-5 pb-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Ship className="w-4 h-4 text-white" aria-hidden="true" />
          <Text
            variant="caption"
            weight="semibold"
            className="uppercase tracking-wider text-white/80"
          >
            {subtitle}
          </Text>
        </div>
        <Text variant="largeTitle" weight="bold" className="text-white">
          {title}
        </Text>
        {shipName && (
          <Text variant="footnote" className="text-white/75 mt-0.5">
            Tap a venue to see its deck location
          </Text>
        )}
      </div>
    </div>
  );
}

// ─── Stat tile ───────────────────────────────────────────────────────────

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <Text variant="title2" weight="bold">
        {value}
      </Text>
      <Text
        variant="caption"
        tone="subtle"
        className="uppercase tracking-wider"
      >
        {label}
      </Text>
    </div>
  );
}

// ─── Category section ────────────────────────────────────────────────────

function CategorySection({
  meta,
  venues,
}: {
  meta: CategoryMeta;
  venues: Venue[];
}) {
  const Icon = meta.icon;
  if (venues.length === 0) return null;

  return (
    <section>
      <div className="px-4 flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: `color-mix(in srgb, ${meta.tint} 18%, transparent)`,
            color: meta.tint,
          }}
          aria-hidden="true"
        >
          <Icon className="w-4 h-4" />
        </span>
        <Text variant="headline" weight="semibold">
          {meta.label}
        </Text>
        <Badge tone="neutral" size="sm">
          {venues.length}
        </Badge>
      </div>
      <div className="px-4 flex flex-col gap-2">
        {venues.map((v) => (
          <VenueRow key={v.id} venue={v} tint={meta.tint} />
        ))}
      </div>
    </section>
  );
}

// ─── Deck section ────────────────────────────────────────────────────────

function DeckSection({ deck, venues }: { deck: number; venues: Venue[] }) {
  return (
    <section>
      <div className="px-4 flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: 'var(--accent-soft)',
            color: 'var(--accent)',
          }}
          aria-hidden="true"
        >
          <Layers className="w-4 h-4" />
        </span>
        <Text variant="headline" weight="semibold">
          Deck {deck}
        </Text>
        <Badge tone="neutral" size="sm">
          {venues.length}
        </Badge>
      </div>
      <div className="px-4 flex flex-col gap-2">
        {venues.map((v) => {
          const meta = categoryFor(v.category);
          return <VenueRow key={v.id} venue={v} tint={meta.tint} showCategory />;
        })}
      </div>
    </section>
  );
}

// ─── Venue row ───────────────────────────────────────────────────────────

function VenueRow({
  venue,
  tint,
  showCategory,
}: {
  venue: Venue;
  tint: string;
  showCategory?: boolean;
}) {
  const meta = categoryFor(venue.category);
  const Icon = meta.icon;
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3.5 py-3"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
      }}
    >
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{
          backgroundColor: `color-mix(in srgb, ${tint} 18%, transparent)`,
          color: tint,
        }}
        aria-hidden="true"
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <Text variant="subhead" weight="semibold" truncate>
          {venue.name}
        </Text>
        <div
          className="flex items-center gap-2 mt-0.5 text-footnote"
          style={{ color: 'var(--fg-muted)' }}
        >
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            Deck {venue.deck}
          </span>
          {showCategory && <span>· {meta.label}</span>}
        </div>
      </div>
    </div>
  );
}
