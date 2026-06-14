import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

// Shared control styling — token-bound. Height is per-control (Input/Select 44px,
// Textarea multi-line). Focus ring is the shared [data-ui]:focus-visible outline;
// the border also strengthens on focus / turns danger when invalid.
const fieldBase = cn(
  "w-full rounded-[var(--radius-md)] border bg-[var(--color-bg-surface)]",
  "px-[var(--spacing-md)] text-body text-[var(--color-text-body)]",
  "placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none",
  "disabled:cursor-not-allowed disabled:border-[var(--color-action-disabled-bg)]",
  "disabled:bg-[var(--color-action-disabled-bg)] disabled:text-[var(--color-action-disabled-text)]",
);

const borderState = (invalid?: boolean) =>
  invalid
    ? "border-[var(--color-status-danger-text)] focus:border-[var(--color-status-danger-text)]"
    : "border-[var(--color-border-default)] focus:border-[var(--color-action-secondary-border)]";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      data-ui="input"
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, "h-11", borderState(invalid), className)}
      {...props}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      data-ui="textarea"
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, "min-h-24 py-[var(--spacing-sm)] resize-y", borderState(invalid), className)}
      {...props}
    />
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        data-ui="select"
        aria-invalid={invalid || undefined}
        className={cn(
          fieldBase,
          "h-11 appearance-none pr-[var(--spacing-2xl)]",
          borderState(invalid),
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        size={18}
        className="pointer-events-none absolute right-[var(--spacing-md)] top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
      />
    </div>
  );
});

export interface FormFieldProps {
  /** Control id; the field wires label[for] and the error/help id from it. */
  htmlFor: string;
  label: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: ReactNode;
}
/**
 * FormField (Figma 18:2) — label + control slot + help/error line. The error
 * pairs colour with text and is announced via role="alert" + aria-live. The
 * control (child) must carry id={htmlFor} and aria-describedby for the wiring.
 */
export function FormField({ htmlFor, label, error, help, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-[var(--spacing-2xs)]">
      <label htmlFor={htmlFor} className="text-body-sm text-[var(--color-text-body)]">
        {label}
        {required ? <span className="text-[var(--color-status-danger-text)]"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          aria-live="polite"
          className="text-caption text-[var(--color-status-danger-text)]"
        >
          {error}
        </p>
      ) : help ? (
        <p id={`${htmlFor}-help`} className="text-caption text-[var(--color-text-muted)]">
          {help}
        </p>
      ) : null}
    </div>
  );
}
