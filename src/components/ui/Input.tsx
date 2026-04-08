import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm text-cruise-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none focus:border-ocean-500 transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className = '', id, ...props }: TextAreaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm text-cruise-muted">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-cruise-text placeholder:text-cruise-muted/50 focus:outline-none focus:border-ocean-500 transition-colors resize-none ${className}`}
        rows={3}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  options,
  className = '',
  id,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm text-cruise-muted">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`rounded-xl bg-cruise-card border border-cruise-border px-4 py-2.5 text-cruise-text focus:outline-none focus:border-ocean-500 transition-colors ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
