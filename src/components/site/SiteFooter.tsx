import Link from "next/link";
import { Lockup } from "./Mark";
import s from "./chrome.module.css";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/product" },
      { label: "For employers", href: "/employers" },
      { label: "For developers", href: "/developers" },
      { label: "Pricing", href: "/pricing" },
      { label: "Download", href: "/download" },
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
      { label: "Build your passport", href: "/passport/new" },
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
    <footer className={s.footer}>
      <div className="mx-auto w-full max-w-[1264px] px-5 sm:px-8">
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <Link href="/" aria-label="fydell home" style={{ width: "fit-content" }}>
              <Lockup size={18} />
            </Link>
            <p className={s.footerNote}>Hire software engineers on real engineering work.</p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} className={s.col} aria-label={col.title}>
              <h2>{col.title}</h2>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={s.legal}>
          <span>© {new Date().getFullYear()} Fydell</span>
          <span>Example screens on this site use sample data.</span>
        </div>
      </div>
    </footer>
  );
}
