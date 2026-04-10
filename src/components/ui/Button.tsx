import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variants = {
  primary: 'bg-ocean-500 text-white active:bg-ocean-600',
  secondary: 'bg-cruise-card text-cruise-text border border-cruise-border active:bg-cruise-border',
  ghost: 'text-cruise-muted active:bg-cruise-card',
  danger: 'bg-red-600 text-white active:bg-red-700',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', className = '', children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`rounded-xl font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
