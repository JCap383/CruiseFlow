import type { ReactNode, CSSProperties } from 'react';
import { forwardRef } from 'react';

type Elevation = 'flat' | 'raised' | 'elevated';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  elevation?: Elevation;
  padding?: Padding;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
}

const paddingClass: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { elevation = 'raised', padding = 'md', interactive, className = '', style, children, onClick, role, ...rest },
  ref,
) {
  const base: CSSProperties = {
    backgroundColor: elevation === 'flat' ? 'transparent' : 'var(--bg-card)',
    border: elevation === 'flat' ? 'none' : '1px solid var(--border-default)',
    borderRadius: 'var(--radius-2xl)',
    boxShadow: elevation === 'elevated' ? 'var(--shadow-card)' : 'none',
  };
  const Component = onClick ? ('button' as const) : ('div' as const);
  return (
    <Component
      ref={ref as never}
      onClick={onClick}
      role={role}
      className={[
        'block w-full text-left',
        paddingClass[padding],
        interactive ? 'press' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </Component>
  );
});

export function CardSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`py-3 ${className}`}
      style={{ borderTop: '1px solid var(--border-default)' }}
    >
      {children}
    </div>
  );
}
