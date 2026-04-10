import type { ReactNode } from 'react';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center px-6 py-14 animate-fade-slide-up ${className}`}>
      {icon && (
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <Text variant="headline" tone="default">{title}</Text>
      {description && (
        <Text variant="footnote" tone="muted" className="mt-1.5 max-w-xs mx-auto">
          {description}
        </Text>
      )}
      {action && <div className="mt-5 inline-flex">{action}</div>}
    </div>
  );
}
