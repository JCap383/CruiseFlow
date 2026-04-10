import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max height as viewport percent (0-1) — default 0.88 */
  maxHeight?: number;
  ariaLabel?: string;
}

export function Sheet({ open, onClose, title, children, maxHeight = 0.88, ariaLabel }: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    dialogRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-[28px] animate-slide-up overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderBottom: 'none',
          maxHeight: `${Math.round(maxHeight * 100)}vh`,
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Grabber */}
        <div className="flex justify-center pt-2">
          <span
            className="block w-9 h-1 rounded-full"
            style={{ backgroundColor: 'var(--border-strong)' }}
            aria-hidden="true"
          />
        </div>
        {title && (
          <div className="flex items-center justify-between px-4 pt-2 pb-2">
            <h3 className="text-headline" style={{ color: 'var(--fg-default)' }}>
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full press"
              style={{ color: 'var(--fg-muted)' }}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${Math.round(maxHeight * 100)}vh - 100px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
