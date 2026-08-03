"use client";

import { useId } from "react";

/**
 * Form building blocks for the pilot tester flow. All controls are native
 * inputs (radios, checkboxes, text fields) styled for the dark marketing
 * surface, so keyboard and screen-reader behavior comes for free.
 */

export function PilotSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-white/[0.09] bg-white/[0.025] p-5 sm:p-7">
      <h2
        className="text-[19px] text-[#F4F5F7]"
        style={{ fontWeight: 580, letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 text-[15px] leading-[1.6] text-[rgba(244,245,247,0.6)]">
          {description}
        </p>
      ) : null}
      <div className="mt-6 space-y-7">{children}</div>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-[13px] text-[#F6A6B4]">
      {message}
    </p>
  );
}

/** 1 to 5 rating rendered as a native radio group. */
export function RatingScale({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  error,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="text-[15px] leading-[1.5] text-[#F4F5F7]" style={{ fontWeight: 540 }}>
        {label}
      </legend>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <label
              key={n}
              className={`relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border text-[15px] tabular-nums transition-colors duration-150 ${
                active
                  ? "border-[#F1F2F4] bg-[#F1F2F4] text-[#08090C]"
                  : "border-white/[0.14] bg-white/[0.02] text-[rgba(244,245,247,0.72)] hover:border-white/30"
              } focus-within:ring-2 focus-within:ring-[rgba(86,98,255,0.55)]`}
              style={{ fontWeight: 560 }}
            >
              <input
                type="radio"
                name={id}
                value={n}
                checked={active}
                onChange={() => onChange(n)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {n}
            </label>
          );
        })}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1.5 flex max-w-[268px] justify-between text-[12px] text-[rgba(244,245,247,0.42)]">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
      <FieldError message={error} />
    </fieldset>
  );
}

/** Single-select choice rendered as radio pills. */
export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  hint,
  error,
  stacked = false,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (v: string) => void;
  hint?: string;
  error?: string;
  stacked?: boolean;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="text-[15px] leading-[1.5] text-[#F4F5F7]" style={{ fontWeight: 540 }}>
        {label}
      </legend>
      {hint ? (
        <p className="mt-1 text-[13px] text-[rgba(244,245,247,0.48)]">{hint}</p>
      ) : null}
      <div className={`mt-3 ${stacked ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}`}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <label
              key={opt}
              className={`relative flex cursor-pointer items-center rounded-[10px] border px-3.5 py-2.5 text-[14px] leading-[1.45] transition-colors duration-150 ${
                active
                  ? "border-[rgba(140,150,255,0.6)] bg-[rgba(86,98,255,0.14)] text-[#F4F5F7]"
                  : "border-white/[0.14] bg-white/[0.02] text-[rgba(244,245,247,0.72)] hover:border-white/30"
              } focus-within:ring-2 focus-within:ring-[rgba(86,98,255,0.55)]`}
              style={{ fontWeight: active ? 560 : 460 }}
            >
              <input
                type="radio"
                name={id}
                value={opt}
                checked={active}
                onChange={() => onChange(opt)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {opt}
            </label>
          );
        })}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}

const inputClass =
  "w-full rounded-[10px] border border-white/[0.14] bg-white/[0.02] px-3.5 text-[15px] text-[#F4F5F7] placeholder:text-[rgba(244,245,247,0.28)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[rgba(140,150,255,0.7)] focus:shadow-[0_0_0_2px_rgba(86,98,255,0.22)]";

export function TextField({
  label,
  value,
  onChange,
  optional,
  type = "text",
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[15px] leading-[1.5] text-[#F4F5F7]"
        style={{ fontWeight: 540 }}
      >
        {label}
        {optional ? (
          <span className="ml-1.5 text-[13px] text-[rgba(244,245,247,0.42)]" style={{ fontWeight: 400 }}>
            (optional)
          </span>
        ) : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${inputClass} mt-2.5 h-[46px]`}
      />
      <FieldError message={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  optional,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[15px] leading-[1.5] text-[#F4F5F7]"
        style={{ fontWeight: 540 }}
      >
        {label}
        {optional ? (
          <span className="ml-1.5 text-[13px] text-[rgba(244,245,247,0.42)]" style={{ fontWeight: 400 }}>
            (optional)
          </span>
        ) : null}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${inputClass} mt-2.5 min-h-[84px] resize-y py-3`}
      />
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[#F2F3F5] px-7 text-[15px] text-[#090A0D] transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
      style={{ fontWeight: 580 }}
    >
      {children}
    </button>
  );
}
