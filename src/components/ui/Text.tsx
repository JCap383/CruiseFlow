import type { ElementType, ReactNode, CSSProperties } from 'react';

type Variant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

type Tone = 'default' | 'muted' | 'subtle' | 'accent' | 'danger' | 'success' | 'warning' | 'inverse';

interface TextProps {
  as?: ElementType;
  variant?: Variant;
  tone?: Tone;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  truncate?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  id?: string;
  role?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

const variantClass: Record<Variant, string> = {
  largeTitle: 'text-large-title',
  title1: 'text-title-1',
  title2: 'text-title-2',
  title3: 'text-title-3',
  headline: 'text-headline',
  body: 'text-body',
  callout: 'text-callout',
  subhead: 'text-subhead',
  footnote: 'text-footnote',
  caption: 'text-caption',
};

const toneStyle: Record<Tone, CSSProperties> = {
  default: { color: 'var(--fg-default)' },
  muted: { color: 'var(--fg-muted)' },
  subtle: { color: 'var(--fg-subtle)' },
  accent: { color: 'var(--accent)' },
  danger: { color: 'var(--danger)' },
  success: { color: 'var(--success)' },
  warning: { color: 'var(--warning)' },
  inverse: { color: 'var(--fg-inverse)' },
};

const weightClass: Record<NonNullable<TextProps['weight']>, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

export function Text({
  as: Component = 'p',
  variant = 'body',
  tone = 'default',
  weight,
  align,
  truncate,
  className = '',
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <Component
      className={[
        variantClass[variant],
        weight && weightClass[weight],
        align && `text-${align}`,
        truncate && 'truncate',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ ...toneStyle[tone], ...style }}
      {...rest}
    >
      {children}
    </Component>
  );
}
