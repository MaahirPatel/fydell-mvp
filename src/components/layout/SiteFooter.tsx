import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";

const PRODUCT = [
  { label: "Developers", href: "/#developers" },
  { label: "Employers", href: "/#employers" },
  { label: "Demo", href: "/demo" },
  { label: "Pricing", href: "/pricing" },
];

const COMPANY = [
  { label: "Trust", href: "/trust" },
  { label: "Contact sales", href: "/contact" },
  { label: "Sign in", href: "/login" },
  { label: "Get started", href: "/get-started" },
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
      <p className="text-app-meta font-medium tracking-[-0.01em] text-[var(--text-primary)]">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-app-body tracking-[-0.01em] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter({ tone = "light" }: { tone?: "ink" | "light" }) {
  return (
    <footer className="border-t border-[var(--border-subtle)] pb-10 pt-14 lg:pt-16">
      <div className="mx-auto w-full max-w-[1232px] px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="Fydell home">
              <FydellLogo height={20} tone={tone === "ink" ? "dark" : "light"} />
            </Link>
            <p className="mt-5 max-w-[34ch] text-app-body leading-[1.65] tracking-[-0.01em] text-[var(--text-secondary)]">
              The Proof of Work Network for software engineers. Evidence from
              real projects and programming simulations, owned by the developer
              and inspectable by the team hiring them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-10 lg:col-span-5 lg:col-start-8">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-app-meta text-[var(--text-tertiary)]">© 2026 Fydell</p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LEGAL.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-app-meta text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]"
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
