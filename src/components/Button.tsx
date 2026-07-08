import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "teal" | "coral" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none focus-visible:outline-2";

const variants: Record<Variant, string> = {
  // navy with teal hover (the spec's signature button)
  primary:
    "bg-navy text-white shadow-[0_6px_16px_rgba(27,37,80,0.22)] hover:bg-teal hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(20,184,166,0.32)]",
  teal: "bg-teal text-white hover:bg-teal-600 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(20,184,166,0.32)]",
  coral:
    "bg-coral text-white hover:bg-coral-600 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(245,185,66,0.32)]",
  dark: "bg-navy text-white hover:bg-navy-700 hover:-translate-y-0.5",
  ghost: "bg-white text-navy border border-line hover:border-line-strong hover:bg-bg"
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-[52px] px-7 text-base"
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
