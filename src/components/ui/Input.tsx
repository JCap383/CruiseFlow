import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, CSSProperties } from 'react';

const baseFieldStyle: CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  color: 'var(--fg-default)',
  borderRadius: 'var(--radius-lg)',
  transition: 'border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)',
};

const errorStyle: CSSProperties = {
  borderColor: 'var(--danger)',
  boxShadow: '0 0 0 3px var(--danger-soft)',
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, className = '', id, ...props },
  ref,
) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-subhead font-medium" style={{ color: 'var(--fg-muted)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--fg-subtle)' }}
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={`w-full px-4 py-2.5 text-body focus:outline-none ${leadingIcon ? 'pl-10' : ''} ${className}`}
          style={{
            ...baseFieldStyle,
            ...(error ? errorStyle : {}),
            minHeight: 44,
          }}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-footnote" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-footnote" style={{ color: 'var(--fg-subtle)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, className = '', id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-subhead font-medium" style={{ color: 'var(--fg-muted)' }}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        rows={3}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`w-full px-4 py-2.5 text-body focus:outline-none resize-none ${className}`}
        style={{ ...baseFieldStyle, ...(error ? errorStyle : {}) }}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-footnote" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-footnote" style={{ color: 'var(--fg-subtle)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, hint, error, className = '', id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-subhead font-medium" style={{ color: 'var(--fg-muted)' }}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`w-full px-4 py-2.5 text-body focus:outline-none ${className}`}
        style={{ ...baseFieldStyle, ...(error ? errorStyle : {}), minHeight: 44 }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="text-footnote" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-footnote" style={{ color: 'var(--fg-subtle)' }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
