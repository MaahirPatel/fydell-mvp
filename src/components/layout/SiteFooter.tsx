import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

const PRODUCT = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/trust" },
  { label: "Contact", href: "/contact" },
];

const ACCESS = [
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/signup" },
];

const LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Security", href: "/security" },
];

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      {/* The title has to outrank the links it heads. It previously used
          --text-tertiary against --text-secondary links, which read as a dimmer
          label above brighter items and inverted the hierarchy. */}
      <p className="text-[13px] font-medium leading-none text-[var(--text-primary)]">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13.5px] leading-none text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] pb-12 pt-16 lg:pt-20">
      <div className="mkt-content">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              aria-label="Fydell home"
            >
              <FydellMark width={20} />
              <span className="text-[15px] font-medium leading-none tracking-[-0.03em] text-[var(--text-primary)]">
                fydell
              </span>
            </Link>
            <p className="mt-4 max-w-[34ch] text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              Find and verify technical customer-facing talent through realistic
              work and evidence a hiring team can inspect.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-10 lg:col-span-5 lg:col-start-8">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Access" links={ACCESS} />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            © 2026 Fydell
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LEGAL.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-[12.5px] text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
