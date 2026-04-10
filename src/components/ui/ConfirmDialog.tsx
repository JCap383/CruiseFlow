import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { haptics } from '@/utils/haptics';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    void haptics.warning();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const iconColor = variant === 'danger' ? 'var(--danger)' : 'var(--warning)';
  const iconBg = variant === 'danger' ? 'var(--danger-soft)' : 'var(--warning-soft)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-5 animate-scale-in"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 id="confirm-title" className="text-headline" style={{ color: 'var(--fg-default)' }}>
            {title}
          </h3>
        </div>
        <p
          id="confirm-message"
          className="text-callout mb-5"
          style={{ color: 'var(--fg-muted)' }}
        >
          {message}
        </p>
        <div className="flex gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} fullWidth>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            fullWidth
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
