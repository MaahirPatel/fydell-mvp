import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";
import { CONTACT_MAILTO } from "@/lib/contact";

/**
 * Roles and Pricing were removed: Roles marketed six role families that do not
 * exist as products, and Pricing contradicted the single published evaluation.
 * "Request a pilot" lives here as a quiet secondary path rather than in the
 * primary navigation.
 *
 * Legal sits in the baseline row rather than in a third column. It is the one
 * group a reader looks for by location instead of by name, and moving it down
 * lets the two real navigation columns spread across the width instead of
 * bunching against the right edge.
 */
const PRODUCT = [
  { label: "Product", href: "/product" },
  { label: "Evaluations", href: "/simulations" },
  { label: "Trust", href: "/trust" },
];

const COMPANY = [
  { label: "Sign in", href: "/login" },
  { label: "Request a pilot", href: "/request-pilot" },
  { label: "Contact", href: CONTACT_MAILTO },
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
              Evaluations that show how a candidate works, with evidence your
              team can open.
            </p>
          </div>

          {/* Two groups cannot fill a twelve-column row by sitting side by
              side; they bunch and leave a void at the right gutter. Spreading
              them to the edges of the remaining measure balances the row
              against the brand block instead. */}
          <div className="flex flex-wrap gap-x-16 gap-y-10 lg:col-span-7 lg:col-start-6 lg:justify-between">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-[var(--text-tertiary)]">
            © {new Date().getFullYear()} Fydell, Inc.
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
