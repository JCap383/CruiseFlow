import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { haptics } from '@/utils/haptics';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
  /** Haptic to fire on press. Default 'tap' for primary, none for ghost. */
  haptic?: 'tap' | 'medium' | 'success' | 'warning' | 'none';
}

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-2 text-footnote',
  md: 'px-4 py-2.5 text-callout',
  lg: 'px-5 py-3.5 text-headline',
};

const sizeMinHeight: Record<Size, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: 'var(--accent)',
        color: 'var(--accent-fg)',
        border: '1px solid transparent',
      };
    case 'secondary':
      return {
        backgroundColor: 'var(--bg-card)',
        color: 'var(--fg-default)',
        border: '1px solid var(--border-default)',
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: 'var(--accent)',
        border: '1px solid transparent',
      };
    case 'danger':
      return {
        backgroundColor: 'var(--danger)',
        color: '#ffffff',
        border: '1px solid transparent',
      };
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth,
    isLoading,
    leadingIcon,
    trailingIcon,
    className = '',
    children,
    disabled,
    onClick,
    haptic,
    ...props
  },
  ref,
) {
  const effectiveHaptic =
    haptic ??
    (variant === 'primary'
      ? 'tap'
      : variant === 'danger'
        ? 'warning'
        : 'none');

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    if (effectiveHaptic !== 'none') {
      void haptics[effectiveHaptic]?.();
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={[
        'press rounded-xl font-semibold inline-flex items-center justify-center gap-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        ...variantStyle(variant),
        minHeight: sizeMinHeight[size],
      }}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      <span>{children}</span>
      {!isLoading && trailingIcon}
    </button>
  );
});
