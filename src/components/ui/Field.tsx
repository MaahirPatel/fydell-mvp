"use client";

import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Label, control, help and error, wired together with real ids so screen
 * readers announce the description and the error alongside the input.
 */
export function Field({
  label,
  htmlFor,
  help,
  error,
  optional,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor: string;
  help?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-[var(--text-primary)]"
        >
          {label}
        </label>
        {optional ? (
          <span className="text-[12px] text-[var(--text-tertiary)]">Optional</span>
        ) : null}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--fydell-risk)]"
        >
          {error}
        </p>
      ) : help ? (
        <p
          id={`${htmlFor}-help`}
          className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--text-secondary)]"
        >
          {help}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn("platform-input", className)}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn("platform-input", className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn("platform-select", className)} {...rest}>
      {children}
    </select>
  );
});

/** Password input with an accessible show/hide toggle. */
export function PasswordInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <div className="relative">
      <Input
        type={shown ? "text" : "password"}
        className={cn("pr-11", className)}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-pressed={shown}
        aria-controls={id}
        aria-label={shown ? "Hide password" : "Show password"}
        className="absolute right-1 top-1 flex h-8 w-9 items-center justify-center rounded-[6px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        {shown ? (
          <EyeOff className="h-4 w-4" strokeWidth={1.7} aria-hidden />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={1.7} aria-hidden />
        )}
      </button>
    </div>
  );
}

/** Non-revealing form-level error summary. Announced when it appears. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-[var(--radius-panel)] border border-[color-mix(in_srgb,var(--fydell-risk)_28%,transparent)] bg-[color-mix(in_srgb,var(--fydell-risk)_7%,transparent)] px-3.5 py-2.5 text-[13px] leading-[1.5] text-[var(--fydell-risk)]"
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="status"
      className="rounded-[var(--radius-panel)] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] px-3.5 py-2.5 text-[13px] leading-[1.5] text-[var(--status-positive-ink)]"
    >
      {children}
    </div>
  );
}
