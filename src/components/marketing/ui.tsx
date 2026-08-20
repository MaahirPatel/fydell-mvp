import Link from "next/link";
import { type ReactNode } from "react";
import {
  ButtonLink as BaseButtonLink,
  type ButtonLinkProps as BaseButtonLinkProps,
} from "@/components/ui/Button";

// ─── Container ───────────────────────────────────────────────────────────────

interface ContainerProps {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={["mkt-content", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

/** Editorial two-column heading row used across major product sections */
export function EditorialHeader({
  heading,
  description,
  stageHref,
  stageLabel,
}: {
  heading: string;
  description: string;
  stageHref?: string;
  stageLabel?: string;
}) {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-6">
      <h2 className="section-heading flat-type lg:col-span-5">{heading}</h2>
      <div className="lg:col-span-5 lg:col-start-7">
        <p className="section-desc">{description}</p>
        {stageHref && stageLabel ? (
          <Link href={stageHref} className="stage-label">
            {stageLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ─── ButtonLink ───────────────────────────────────────────────────────────────

/**
 * Marketing call to action: the canonical Button at the taller marketing size,
 * as a pill with a trailing arrow.
 *
 * The arrow is deliberately scoped to this component rather than added to every
 * link on the site. It marks the two or three places per page that actually
 * move you forward; used everywhere it stops being emphasis and turns into
 * punctuation, which is how the rest of the site lost its arrows.
 */
export function ButtonLink({
  size = "cta",
  variant = "primary",
  shape = "pill",
  arrow = true,
  className,
  children,
  ...rest
}: BaseButtonLinkProps & { arrow?: boolean }) {
  return (
    <BaseButtonLink
      size={size}
      variant={variant}
      shape={shape}
      className={["group", className].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
      {arrow ? <CtaArrow /> : null}
    </BaseButtonLink>
  );
}

/**
 * Nudges on hover. The travel is small on purpose: the arrow should confirm the
 * pointer landed, not animate.
 */
function CtaArrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="ml-0.5 h-[13px] w-[13px] shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-[2px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

/**
 * A secondary destination. The underline is the affordance; the arrow that
 * used to sit here appeared on every link on every page, which made it
 * punctuation rather than emphasis.
 */
export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center text-[14px] text-[var(--text-secondary)] underline decoration-[var(--border-strong)] underline-offset-[5px] transition-colors duration-150 hover:text-[var(--text-primary)] hover:decoration-[var(--text-primary)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ fontWeight: 500 }}
    >
      {children}
    </Link>
  );
}

// ─── SectionHeading ───────────────────────────────────────────────────────────

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  title,
  subtitle,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  const textAlign = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={["max-w-[820px]", textAlign, className].join(" ")}>
      <h2 className="section-heading flat-type">{title}</h2>
      {subtitle && <p className="section-desc mt-5">{subtitle}</p>}
    </div>
  );
}
