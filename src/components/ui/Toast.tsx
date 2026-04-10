import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

interface ToastRecord {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneConfig: Record<
  ToastTone,
  { icon: typeof CheckCircle2; color: string; soft: string; border: string }
> = {
  success: { icon: CheckCircle2, color: 'var(--success)', soft: 'var(--success-soft)', border: 'var(--success)' },
  error:   { icon: XCircle,      color: 'var(--danger)',  soft: 'var(--danger-soft)',  border: 'var(--danger)' },
  warning: { icon: AlertTriangle, color: 'var(--warning)', soft: 'var(--warning-soft)', border: 'var(--warning)' },
  info:    { icon: Info,         color: 'var(--accent)',  soft: 'var(--accent-soft)',  border: 'var(--accent)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextIdRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue['show']>(
    (message, tone = 'info', durationMs = 3200) => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      warning: (m) => show(m, 'warning'),
      info: (m) => show(m, 'info'),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed left-0 right-0 z-[60] flex flex-col items-center gap-2 pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const { icon: Icon, color, soft, border } = toneConfig[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full animate-toast-in max-w-[90vw]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: `1px solid ${border}`,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <span
                className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                style={{ backgroundColor: soft, color }}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </span>
              <span className="text-subhead" style={{ color: 'var(--fg-default)' }}>
                {t.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-1 p-0.5 press"
                style={{ color: 'var(--fg-muted)' }}
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback so components don't crash if provider is missing in a test.
    const noop = () => {};
    return {
      show: noop,
      success: noop,
      error: noop,
      warning: noop,
      info: noop,
    };
  }
  return ctx;
}

export type { ToastTone };
