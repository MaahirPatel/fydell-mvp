import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

const PRODUCT = [
  { label: "Product", href: "/product" },
  { label: "Project Meridian", href: "/#project-meridian" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Request a Pilot", href: "/#request-pilot" },
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
        className="text-[11px] uppercase tracking-[0.06em] text-[rgba(244,245,247,0.4)]"
        style={{ fontWeight: 550 }}
      >
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13px] text-[rgba(244,245,247,0.62)] transition-colors duration-150 hover:text-[#F4F5F7]"
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
    <footer className="relative z-10 border-t border-[var(--border-subtle)] pt-[80px] pb-8 sm:pb-10">
      <div className="mkt-content">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-[280px]">
            <FydellBrand markSize={22} wordmarkSize={16} className="gap-2" />
            <p className="mt-3 text-[13px] leading-[1.55] text-[rgba(244,245,247,0.4)]">
              Work-based hiring evidence for finance teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
            <FooterCol title="Legal" links={LEGAL} />
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
          <p className="text-[12px] text-[rgba(244,245,247,0.28)]">
            © {new Date().getFullYear()} Fydell, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
