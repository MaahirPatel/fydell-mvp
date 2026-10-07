import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";
import { PRODUCT_ITEMS } from "@/components/marketing/site/nav-data";

const COLUMNS: { title: string; links: readonly { label: string; href: string }[] }[] = [
  { title: "Product", links: PRODUCT_ITEMS },
  {
    title: "Solutions",
    links: [
      { label: "For Engineers", href: "/developers" },
      { label: "For Employers", href: "/employers" },
      { label: "Pricing", href: "/pricing" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Interactive demo", href: "/demo" },
      { label: "Changelog", href: "/changelog" },
      { label: "Trust and privacy", href: "/trust" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] pb-10 pt-16">
      <div className="l-container">
        <div className="grid gap-12 md:grid-cols-[1fr_auto]">
          <Link href="/" className="inline-flex h-fit items-center rounded-[6px]" aria-label="Fydell home">
            <FydellLogo height={20} />
          </Link>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-16 gap-y-10 sm:grid-cols-4 md:gap-x-20">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p id={`footer-${col.title.toLowerCase()}`} className="text-[13px] font-semibold text-[var(--text-primary)]">{col.title}</p>
                <ul aria-labelledby={`footer-${col.title.toLowerCase()}`} className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--text-tertiary)]">
          <span>© 2026 Fydell</span>
          <Link href="/privacy" className="hover:text-[var(--text-primary)]">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--text-primary)]">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
