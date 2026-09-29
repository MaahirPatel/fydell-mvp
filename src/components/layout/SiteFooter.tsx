import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Employers", href: "/employers" },
      { label: "Developers", href: "/developers" },
      { label: "Pricing", href: "/pricing" },
      { label: "Demo", href: "/demo" },
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
      { label: "Sign in", href: "/login" },
      { label: "Get started", href: "/get-started" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border-default)] pb-16 pt-14">
      <div className="l-container">
        <div className="grid gap-12 md:grid-cols-[1fr_auto]">
          <Link href="/" className="inline-flex h-fit items-center rounded-[6px]" aria-label="Fydell home">
            <FydellLogo height={18} tone="dark" />
          </Link>

          <div className="grid grid-cols-2 gap-x-16 gap-y-10 sm:grid-cols-4 md:gap-x-20">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-[13px] font-[510] text-[var(--text-primary)]">{col.title}</h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-[var(--text-tertiary)] transition-colors duration-100 hover:text-[var(--text-primary)]"
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
        <p className="mt-16 text-[12px] text-[var(--text-quaternary)]">© 2026 Fydell</p>
      </div>
    </footer>
  );
}
