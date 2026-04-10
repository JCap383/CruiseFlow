interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Processing...' }: LoadingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      role="alert"
      aria-busy="true"
    >
      <div
        className="flex flex-col items-center gap-3 rounded-2xl px-8 py-6 animate-scale-in"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{
            borderWidth: 3,
            borderStyle: 'solid',
            borderColor: 'var(--accent-soft)',
            borderTopColor: 'var(--accent)',
          }}
        />
        <span className="text-footnote" style={{ color: 'var(--fg-muted)' }}>
          {message}
        </span>
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 16 : 24;
  return (
    <div
      className="rounded-full animate-spin"
      style={{
        width: dim,
        height: dim,
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: 'var(--accent-soft)',
        borderTopColor: 'var(--accent)',
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
