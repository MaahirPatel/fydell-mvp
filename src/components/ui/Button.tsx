"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "quiet"
  | "destructive"
  | "accent";

export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-medium tracking-[-0.01em] transition-[background-color,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const VARIANT: Record<ButtonVariant, string> = {
  // Near-white on graphite. The single loudest control on any given screen.
  primary:
    "bg-[#eceef1] text-[#0a0b0d] hover:bg-white active:bg-[#dfe2e6]",
  // Bordered. Sits beside primary without competing.
  secondary:
    "border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.05)] active:bg-[rgba(255,255,255,0.08)]",
  // No chrome until interacted with. For row actions and tertiary links.
  quiet:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)] active:bg-[rgba(255,255,255,0.09)]",
  destructive:
    "border border-[rgba(242,107,130,0.35)] bg-[rgba(242,107,130,0.1)] text-[var(--fydell-risk)] hover:bg-[rgba(242,107,130,0.16)] hover:border-[rgba(242,107,130,0.5)]",
  // Brand blue fill. Reserved for the primary action inside the candidate flow.
  accent:
    "bg-[var(--fydell-brand-blue)] text-white hover:bg-[#6872ff] active:bg-[#4b56f0]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-3.5 text-[13.5px]",
  lg: "h-11 px-5 text-[15px]",
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Renders as a square control. Pass an accessible label via aria-label. */
  icon?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 w-8 p-0",
  md: "h-9 w-9 p-0",
  lg: "h-11 w-11 p-0",
};

function classesFor({
  variant = "secondary",
  size = "md",
  icon = false,
  className,
}: CommonProps) {
  return cn(BASE, VARIANT[variant], icon ? ICON_SIZE[size] : SIZE[size], className);
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-r-transparent opacity-70"
    />
  );
}

export type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, icon, className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classesFor({ variant, size, icon, className })}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});

export type ButtonLinkProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className" | "children">;

export function ButtonLink({
  variant,
  size,
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={classesFor({ variant, size, icon, className })} {...rest}>
      {children}
    </Link>
  );
}

export default Button;
