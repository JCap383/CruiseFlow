import type { ReactNode, CSSProperties } from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'brand';
type Size = 'sm' | 'md';

interface BadgeProps {
  tone?: Tone;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const toneStyle: Record<Tone, CSSProperties> = {
  neutral: { backgroundColor: 'var(--bg-elevated)', color: 'var(--fg-muted)' },
  accent:  { backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' },
  success: { backgroundColor: 'var(--success-soft)', color: 'var(--success)' },
  warning: { backgroundColor: 'var(--warning-soft)', color: 'var(--warning)' },
  danger:  { backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' },
  brand:   { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' },
};

const sizeClass: Record<Size, string> = {
  sm: 'text-caption px-2 py-0.5',
  md: 'text-footnote px-2.5 py-1',
};

export function Badge({ tone = 'neutral', size = 'sm', icon, children, className = '', style }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${sizeClass[size]} ${className}`}
      style={{ ...toneStyle[tone], ...style }}
    >
      {icon}
      {children}
    </span>
  );
}
