import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";
import { CONTACT_SALES_HREF } from "@/lib/marketing/ctas";

const PRODUCT = [
  { label: "Product", href: "/product" },
  { label: "Employers", href: "/employers" },
  { label: "Candidates", href: "/candidates" },
];

const COMPANY = [
  { label: "Trust", href: "/trust" },
  { label: "Contact", href: CONTACT_SALES_HREF },
  { label: "Sign in", href: "/login" },
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
        className="text-[11px] uppercase tracking-[0.06em] text-[#586273]"
        style={{ fontWeight: 550 }}
      >
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[13px] text-[#586273] transition-colors duration-150 hover:text-[#0B1020]"
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
    <footer className="relative z-10 border-t border-[#D9DEE7] pt-[80px] pb-8 sm:pb-10">
      <div className="mkt-content">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          <div className="max-w-[280px]">
            <FydellBrand markSize={22} wordmarkSize={16} ink className="gap-2" />
            <p className="mt-3 text-[13px] leading-[1.55] text-[#586273]">
              Fydell evaluates applied technical roles through realistic work simulations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
            <FooterCol title="Legal" links={LEGAL} />
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-[#D9DEE7] pt-5">
          <p className="text-[12px] text-[#586273]">
            © {new Date().getFullYear()} Fydell, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
