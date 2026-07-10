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
        "mx-auto w-full px-5 sm:px-8",
        wide ? "max-w-[1320px]" : "max-w-[1180px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
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
    "bg-[#3B5BFF] text-white hover:bg-[#2f4fe0] border border-transparent",
  secondary:
    "border border-white/[0.14] bg-white/[0.06] text-white hover:bg-white/[0.1]",
  white: "bg-white border border-transparent hover:bg-white/90",
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
        "rounded-[10px] px-4 py-2.5",
        "text-[14px] font-medium leading-none",
        "transition-colors duration-150",
        variantStyles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={variant === "white" ? { color: "#050609" } : undefined}
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
