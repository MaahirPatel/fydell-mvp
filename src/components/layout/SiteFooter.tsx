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
     { label: "Changelog", href: "/changelog" },
      { label: "Trust and privacy", href: "/trust" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Sign in", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-default)] pb-10 pt-16 md:pt-20">
      <div className="l-container">
        <div className="grid gap-12 md:grid-cols-[minmax(0,1.3fr)_minmax(0,4fr)]">
          <div>
            <Link href="/" className="inline-flex h-fit items-center rounded-[6px]" aria-label="Fydell home">
              <FydellLogo height={20} />
            </Link>
            <p className="mt-4 max-w-[24ch] text-[14px] leading-[1.5] text-[var(--text-secondary)]">Engineering work, ready to be seen.</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p id={`footer-${col.title.toLowerCase()}`} className="text-[14px] font-bold tracking-[-0.01em] text-[var(--text-primary)]">
                  {col.title}
                </p>
                <ul aria-labelledby={`footer-${col.title.toLowerCase()}`} className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="rounded-[4px] text-[14px] font-medium text-[var(--text-body)] transition-colors duration-100 hover:text-[var(--mk-indigo)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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

        <div className="mt-16 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[var(--border-subtle)] pt-6 text-[13px] font-medium text-[var(--text-secondary)]">
          <span>© 2026 Fydell</span>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-[var(--text-primary)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)]">
              Terms
            </Link>
            <Link href="/trust" className="hover:text-[var(--text-primary)]">
              Trust
            </Link>
            <Link href="/contact" className="hover:text-[var(--text-primary)]">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
