"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "quiet"
  | "destructive"
  | "accent";

/** `cta` is the marketing call to action: taller than a product control, but
 *  short of the full-width `lg` used in auth and onboarding forms. */
export type ButtonSize = "sm" | "md" | "cta" | "lg";

/** Product controls are rounded rectangles; the marketing calls to action are
 *  pills. Radius lives here rather than in BASE because `cn` is a plain join,
 *  so a `rounded-full` passed through className would not reliably win. */
export type ButtonShape = "rect" | "pill";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[-0.01em] transition-[background-color,border-color,color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const SHAPE: Record<ButtonShape, string> = {
  rect: "rounded-[8px]",
  pill: "rounded-full",
};

const VARIANT: Record<ButtonVariant, string> = {
  // The single loudest control on any given screen.
  primary:
    "bg-[var(--control-solid)] text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)] active:bg-[var(--control-solid-active)]",
  // Bordered. Sits beside primary without competing.
  secondary:
    "border border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-selected)]",
  // Filled, borderless companion to primary. Reads as a second button rather
  // than as an outline of one, which is what keeps a CTA pair balanced.
  soft: "bg-[var(--surface-selected)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-deep)]",
  // No chrome until interacted with. For row actions and tertiary links.
  quiet:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] active:bg-[var(--surface-selected)]",
  destructive:
    "border border-[rgba(194,64,90,0.32)] bg-[rgba(194,64,90,0.08)] text-[var(--fydell-risk)] hover:bg-[rgba(194,64,90,0.14)] hover:border-[rgba(194,64,90,0.46)]",
  // Brand fill. Reserved for the primary action inside the candidate flow.
  accent:
    "bg-[var(--fydell-brand-blue)] text-white hover:bg-[#6872ff] active:bg-[#4b56f0]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 text-[13px]",
  md: "h-9 text-[13.5px]",
  cta: "h-10 text-[14px]",
  lg: "h-11 text-[15px]",
};

/** Padding is keyed by shape as well as size, and is the only source of a
 *  horizontal padding class: `cn` is a plain join, so emitting two competing
 *  `px-*` utilities would resolve by stylesheet order rather than by intent.
 *  Pills need the extra room or the label crowds the curve. */
const PAD: Record<ButtonShape, Record<ButtonSize, string>> = {
  rect: { sm: "px-3", md: "px-3.5", cta: "px-4", lg: "px-5" },
  pill: { sm: "px-3.5", md: "px-4", cta: "px-5", lg: "px-6" },
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  loading?: boolean;
  /** Renders as a square control. Pass an accessible label via aria-label. */
  icon?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 w-8 p-0",
  md: "h-9 w-9 p-0",
  cta: "h-10 w-10 p-0",
  lg: "h-11 w-11 p-0",
};

function classesFor({
  variant = "secondary",
  size = "md",
  shape = "rect",
  icon = false,
  className,
}: CommonProps) {
  return cn(
    BASE,
    SHAPE[shape],
    VARIANT[variant],
    icon ? ICON_SIZE[size] : cn(SIZE[size], PAD[shape][size]),
    className,
  );
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
  { variant, size, shape, loading, icon, className, children, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classesFor({ variant, size, shape, icon, className })}
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
  shape,
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={classesFor({ variant, size, shape, icon, className })} {...rest}>
      {children}
    </Link>
  );
}

export default Button;
