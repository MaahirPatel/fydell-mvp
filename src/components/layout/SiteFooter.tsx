import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/product" },
      { label: "Engineering Passport", href: "/passport/new" },
      { label: "Pricing", href: "/pricing" },
      { label: "Download", href: "/download" },
      { label: "Demo", href: "/demo" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "For Employers", href: "/employers" },
      { label: "For Developers", href: "/developers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Trust", href: "/trust" },
      { label: "Security", href: "/security" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Sign up", href: "/get-started" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-subtle)] pb-10 pt-16">
      <div className="l-container">
        <div className="grid gap-12 md:grid-cols-[1fr_auto]">
          <div>
            <Link href="/" className="inline-flex h-fit items-center rounded-[6px]" aria-label="Fydell home">
              <FydellLogo height={20} />
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[var(--text-tertiary)]">
              Fydell is building the Proof of Work Network for engineers and hiring teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-16 gap-y-10 sm:grid-cols-4 md:gap-x-20">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{col.title}</h3>
                <ul className="mt-4 space-y-2.5">
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
          </div>
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--text-quaternary)]">
          <span>© 2026 Fydell</span>
          <Link href="/privacy" className="hover:text-[var(--text-primary)]">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--text-primary)]">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
