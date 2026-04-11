import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary that catches render-time crashes (e.g. an
 * "Invalid time value" thrown by `date-fns` if a persisted date string in
 * localStorage gets corrupted) and gives the user a recoverable UI instead
 * of React Router's developer error screen.
 *
 * Provides two escape hatches:
 *  - Reload the app (in case the bad state is in memory only).
 *  - Reset CruiseFlow's persisted local state (clears the keys we own in
 *    localStorage). This intentionally does NOT touch the user's IndexedDB
 *    data — only the lightweight UI prefs that can put the app into a bad
 *    render loop.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('CruiseFlow render error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      const keys = [
        'cruiseflow-cruise-id',
        'cruiseflow-selected-date',
        'cruiseflow-theme',
      ];
      for (const key of keys) localStorage.removeItem(key);
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--bg-default)', color: 'var(--fg-default)' }}
        role="alert"
      >
        <div
          className="w-full max-w-sm rounded-3xl p-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{
              backgroundColor: 'var(--danger-soft)',
              color: 'var(--danger)',
            }}
          >
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold mb-1.5">Something went wrong</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>
            CruiseFlow hit an unexpected error. Your cruise data is safe — the
            options below only affect this device&apos;s app preferences.
          </p>
          {this.state.error.message && (
            <pre
              className="text-xs rounded-xl p-3 mb-4 overflow-x-auto"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-muted)',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold press"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Reload app
            </button>
            <button
              type="button"
              onClick={this.handleResetState}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold press"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--fg-default)',
                border: '1px solid var(--border-default)',
              }}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Reset app preferences
            </button>
          </div>
        </div>
      </div>
    );
  }
}
