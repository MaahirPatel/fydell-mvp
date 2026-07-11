import Link from "next/link";
import { type ReactNode } from "react";

// ─── Container ───────────────────────────────────────────────────────────────

interface ContainerProps {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}

export function Container({ children, wide, className = "" }: ContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full px-[18px] sm:px-6 lg:px-7",
        wide ? "max-w-[1180px]" : "max-w-[1160px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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

type ButtonVariant = "primary" | "secondary" | "white";

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "h-10 rounded-[9px] border border-transparent bg-[#F2F3F5] px-[17px] text-[14px] text-[#090A0D] hover:brightness-[0.97] hover:-translate-y-px",
  secondary:
    "h-10 rounded-[9px] border border-[var(--border-default)] bg-transparent px-[17px] text-[14px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:-translate-y-px",
  white:
    "h-10 rounded-[9px] border border-transparent bg-[#F2F3F5] px-[17px] text-[14px] text-[#090A0D] hover:brightness-[0.97] hover:-translate-y-px",
};

export function ButtonLink({
  href,
  variant = "primary",
  children,
  className = "",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center justify-center gap-2",
        "leading-none",
        "transition-[color,background,border-color,transform,filter] duration-160 ease-out",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ fontWeight: 580 }}
    >
      {children}
    </Link>
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
      <h2
        className="text-white"
        style={{
          fontSize: "clamp(1.85rem, 3.8vw, 3.25rem)",
          lineHeight: 1.08,
          letterSpacing: "-0.04em",
          fontWeight: 620,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 max-w-[560px] text-[16px] leading-[1.7] text-white/[0.66] sm:text-[17px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
