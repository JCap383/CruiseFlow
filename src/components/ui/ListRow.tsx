import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface ListRowProps {
  icon?: ReactNode;
  iconBackground?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
  ariaLabel?: string;
}

export function ListRow({
  icon,
  iconBackground,
  title,
  subtitle,
  trailing,
  onClick,
  destructive,
  showChevron,
  ariaLabel,
}: ListRowProps) {
  const Component = onClick ? ('button' as const) : ('div' as const);
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-full flex items-center gap-3 px-4 py-3 text-left press"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-default)',
        color: destructive ? 'var(--danger)' : 'var(--fg-default)',
      }}
    >
      {icon && (
        <span
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{
            backgroundColor: iconBackground ?? 'var(--accent-soft)',
            color: destructive ? 'var(--danger)' : 'var(--accent)',
          }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-callout font-medium truncate">{title}</div>
        {subtitle && (
          <div className="text-footnote truncate" style={{ color: 'var(--fg-muted)' }}>
            {subtitle}
          </div>
        )}
      </div>
      {trailing && <div className="shrink-0 text-footnote" style={{ color: 'var(--fg-muted)' }}>{trailing}</div>}
      {(showChevron || onClick) && !trailing && (
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--fg-subtle)' }} aria-hidden="true" />
      )}
    </Component>
  );
}

interface ListGroupProps {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ListGroup({ title, footer, children, className = '' }: ListGroupProps) {
  return (
    <section className={`flex flex-col ${className}`}>
      {title && (
        <h2
          className="px-4 pb-1.5 text-caption font-semibold uppercase tracking-wider"
          style={{ color: 'var(--fg-subtle)' }}
        >
          {title}
        </h2>
      )}
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
        }}
      >
        {/* Remove bottom border on the last row visually */}
        <div style={{ marginBottom: -1 }}>{children}</div>
      </div>
      {footer && (
        <p className="px-4 pt-1.5 text-caption" style={{ color: 'var(--fg-subtle)' }}>
          {footer}
        </p>
      )}
    </section>
  );
}
