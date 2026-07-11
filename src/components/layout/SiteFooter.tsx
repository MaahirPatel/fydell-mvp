import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

const PRODUCT = [
  { label: "Product", href: "/product" },
  { label: "For Finance Teams", href: "/for-finance" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const COMPANY = [
  { label: "Contact", href: "mailto:hello@fydell.com" },
  { label: "Log in", href: "/login" },
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
      <p
        className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]"
        style={{ fontWeight: 550 }}
      >
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13px] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
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
    <footer className="relative z-10 border-t border-[var(--border-subtle)] py-12 sm:py-14">
      <div className="mkt-content">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-[280px]">
            <FydellBrand markSize={22} className="gap-2" />
            <p className="mt-3 text-[13px] leading-[1.55] text-[var(--text-tertiary)]">
              Work-based hiring evidence for finance teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
            <FooterCol title="Legal" links={LEGAL} />
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
          <p className="text-[12px] text-[var(--text-disabled)]">
            © {new Date().getFullYear()} Fydell, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
