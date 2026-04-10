interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Processing...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50" role="alert" aria-busy="true">
      <div className="flex flex-col items-center gap-3 bg-cruise-bg rounded-2xl px-8 py-6 border border-cruise-border shadow-xl">
        <div className="w-8 h-8 border-3 border-ocean-500/30 border-t-ocean-500 rounded-full animate-spin" />
        <span className="text-sm text-cruise-muted">{message}</span>
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <div
      className={`${s} border-2 border-ocean-500/30 border-t-ocean-500 rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
