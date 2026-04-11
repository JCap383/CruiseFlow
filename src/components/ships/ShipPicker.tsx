import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check, Ship as ShipIcon } from 'lucide-react';
import { Text } from '@/components/ui/Text';
import { Sheet } from '@/components/ui/Sheet';
import {
  CRUISE_LINES,
  SHIPS_BY_LINE,
  findShip,
} from '@/db/shipCatalog';

interface ShipPickerProps {
  /** Current ship name (may be a free-text entry not in the catalog). */
  value: string;
  onChange: (shipName: string) => void;
  /** Optional id for a11y and <label for=...>. */
  id?: string;
  label?: string;
  placeholder?: string;
}

/**
 * Grouped ship picker.
 *
 * Opens a bottom sheet grouped by cruise line (NCL, Royal Caribbean) with a
 * search box. Accepts any free-text ship name too — cruises whose ship isn't
 * in the catalog continue to display their stored name, and the user can
 * type a custom ship via the "Custom" text input inside the sheet.
 */
export function ShipPicker({
  value,
  onChange,
  id,
  label = 'Ship',
  placeholder = 'Select a ship',
}: ShipPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [customInput, setCustomInput] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const currentShip = useMemo(() => findShip(value), [value]);
  const currentLine = currentShip
    ? CRUISE_LINES.find((l) => l.id === currentShip.cruiseLineId)
    : undefined;

  // Filter ships by the search query inside the sheet
  const filteredLines = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CRUISE_LINES.map((line) => ({
      line,
      ships: SHIPS_BY_LINE[line.id].filter((s) =>
        q ? s.name.toLowerCase().includes(q) : true,
      ),
    })).filter((group) => group.ships.length > 0);
  }, [query]);

  // Auto-focus search when sheet opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setCustomInput('');
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  const handleCustomSubmit = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setOpen(false);
  };

  return (
    <>
      <div>
        {label && (
          <label
            htmlFor={id}
            className="block text-footnote font-medium mb-1.5"
            style={{ color: 'var(--fg-muted)' }}
          >
            {label}
          </label>
        )}
        <button
          id={id}
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left press"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            minHeight: 48,
          }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            aria-hidden="true"
          >
            <ShipIcon className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            {value ? (
              <>
                <div
                  className="text-callout font-medium truncate"
                  style={{ color: 'var(--fg-default)' }}
                >
                  {value}
                </div>
                {currentLine && (
                  <div
                    className="text-caption truncate"
                    style={{ color: 'var(--fg-subtle)' }}
                  >
                    {currentLine.name}
                  </div>
                )}
              </>
            ) : (
              <div className="text-callout" style={{ color: 'var(--fg-subtle)' }}>
                {placeholder}
              </div>
            )}
          </div>
          <ChevronDown
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--fg-muted)' }}
            aria-hidden="true"
          />
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Choose a ship">
        <div className="px-4 pt-1 pb-4 flex flex-col gap-3">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Search
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--fg-muted)' }}
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ships..."
              className="flex-1 bg-transparent text-callout focus:outline-none"
              style={{ color: 'var(--fg-default)' }}
            />
          </div>

          {/* Grouped ship list */}
          <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto">
            {filteredLines.map(({ line, ships }) => (
              <ShipGroup
                key={line.id}
                lineName={line.name}
                ships={ships.map((s) => s.name)}
                selected={value}
                onSelect={handleSelect}
              />
            ))}
            {filteredLines.length === 0 && (
              <Text variant="footnote" tone="muted" align="center" className="py-4">
                No ships match "{query}"
              </Text>
            )}
          </div>

          {/* Custom ship entry */}
          <div
            className="rounded-xl p-3"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            <Text variant="caption" tone="muted" className="mb-1.5">
              Don't see your ship?
            </Text>
            <div className="flex gap-2">
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomSubmit();
                  }
                }}
                placeholder="Type a custom ship name"
                className="flex-1 rounded-lg px-3 py-2 text-callout focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-default)',
                }}
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customInput.trim()}
                className="px-3 py-2 rounded-lg text-footnote font-semibold press disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-fg)',
                }}
              >
                Use
              </button>
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function ShipGroup({
  lineName,
  ships,
  selected,
  onSelect,
}: {
  lineName: string;
  ships: string[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  return (
    <div>
      <div
        className="text-caption font-semibold uppercase tracking-wider mb-2 px-1"
        style={{ color: 'var(--fg-subtle)' }}
      >
        {lineName}
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
        }}
      >
        {ships.map((name, i) => {
          const active = selected.trim().toLowerCase() === name.toLowerCase();
          return (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(name)}
              className="w-full flex items-center gap-3 px-4 py-3 press text-left"
              style={{
                color: 'var(--fg-default)',
                borderTop:
                  i === 0 ? 'none' : '1px solid var(--border-default)',
                backgroundColor: active ? 'var(--accent-soft)' : 'transparent',
                minHeight: 48,
              }}
              aria-pressed={active}
            >
              <span className="flex-1 text-callout truncate">{name}</span>
              {active && (
                <Check
                  className="w-4 h-4"
                  style={{ color: 'var(--accent)' }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
