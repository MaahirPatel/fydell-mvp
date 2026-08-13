import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

const PRODUCT = [
  { label: "Product", href: "/product" },
  { label: "Simulations", href: "/simulations" },
  { label: "Pilot", href: "/request-pilot" },
  { label: "Trust", href: "/trust" },
];

const COMPANY = [
  { label: "Contact", href: "mailto:hello@fydell.com" },
  { label: "Sign in", href: "/login" },
  { label: "Roles", href: "/roles" },
  { label: "Pricing", href: "/pricing" },
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
      <p className="text-[12.5px] font-medium text-white/45">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13px] text-white/50 transition-colors duration-150 hover:text-white"
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
            <p className="mt-3 text-[13px] leading-[1.55] text-white/40">
              Realistic work trials with inspectable evidence and candidate-controlled Work Receipts.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
            <FooterCol title="Legal" links={LEGAL} />
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-[var(--border-subtle)] pt-5">
          <p className="text-[12px] text-white/28">
            © {new Date().getFullYear()} Fydell, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
