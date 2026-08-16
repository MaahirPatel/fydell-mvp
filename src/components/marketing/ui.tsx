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
          <Link
            href={stageHref}
            className="stage-label group"
          >
            {stageLabel}
            <span
              aria-hidden
              className="transition-transform duration-160 group-hover:translate-x-[3px]"
            >
              →
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

// ─── ButtonLink ───────────────────────────────────────────────────────────────

/**
 * Marketing call to action. One implementation, shared with the product: this
 * is the canonical Button at the taller marketing size.
 */
export function ButtonLink({
  size = "cta",
  variant = "primary",
  className,
  ...rest
}: BaseButtonLinkProps) {
  return (
    <BaseButtonLink
      size={size}
      variant={variant}
      className={["rounded-full", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

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
        "group inline-flex items-center gap-1.5 text-[14px] text-[var(--text-secondary)] transition-colors duration-160 hover:text-[var(--text-primary)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ fontWeight: 520 }}
    >
      {children}
      <span
        aria-hidden
        className="transition-transform duration-160 group-hover:translate-x-[3px]"
      >
        →
      </span>
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
