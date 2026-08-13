import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

/**
 * Roles and Pricing were removed: Roles marketed six role families that do not
 * exist as products, and Pricing contradicted the single published evaluation.
 * "Request a pilot" lives here as a quiet secondary path rather than in the
 * primary navigation.
 */
const PRODUCT = [
  { label: "Product", href: "/product" },
  { label: "Evaluation", href: "/simulations" },
  { label: "Trust", href: "/trust" },
];

const COMPANY = [
  { label: "Sign in", href: "/login" },
  { label: "Request a pilot", href: "/request-pilot" },
  { label: "Contact", href: "mailto:hello@fydell.com" },
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
      <p className="text-[12.5px] font-medium text-[var(--text-tertiary)]">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
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
    <footer className="border-t border-[var(--border-subtle)] pb-10 pt-14">
      <div className="mkt-content">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-[300px]">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              aria-label="Fydell home"
            >
              <FydellMark width={20} />
              <span className="text-[15px] font-semibold leading-none tracking-[-0.04em] text-[var(--text-primary)]">
                fydell
              </span>
            </Link>
            <p className="mt-3 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
              Evaluations that show how a candidate works, with evidence your
              team can open.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-14">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
            <FooterCol title="Legal" links={LEGAL} />
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--border-subtle)] pt-5">
          <p className="text-[12px] text-[var(--text-tertiary)]">
            © {new Date().getFullYear()} Fydell, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
