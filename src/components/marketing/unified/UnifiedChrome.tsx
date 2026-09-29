"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import FydellLogo from "@/components/brand/FydellLogo";

/* NOTE: marketing-unified.css is global CSS; Next.js only allows it from
   app/layout.tsx, so it is imported there. This component assumes it. */

/* ============================================================================
   UnifiedChrome, shared nav / footer / CTA band / FAQ used by ALL marketing
   pages. Other subagents import these exact exports; do not change names/props.
   ========================================================================== */

const NAV_LINKS = [
  { label: "Developers", href: "/developers" },
  { label: "Employers", href: "/employers" },
  { label: "Product", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Download", href: "/download" },
] as const;

export function UnifiedNav({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className={`u-nav${open ? " open" : ""}`} aria-label="Primary">
      <div className="u-nav-inner">
        <Link href="/" className="u-nav-brand" aria-label="Fydell home">
          <FydellLogo height={26} />
        </Link>
        <div className="u-nav-links">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <button
          type="button"
          className="u-nav-toggle"
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
        <div className="u-nav-right">
          <span className="u-nav-divider" aria-hidden="true" />
          <Link href="/login" className="u-nav-signin">
            Sign in
          </Link>
          <Link href="/get-started" className="u-btn u-btn-dark u-btn-sm">
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "Developers", href: "/developers" },
      { label: "Employers", href: "/employers" },
      { label: "Product", href: "/product" },
      { label: "Demo", href: "/demo" },
      { label: "Download", href: "/download" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Trust", href: "/trust" },
      { label: "Sign in", href: "/login" },
      { label: "Get started", href: "/get-started" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Security", href: "/security" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
] as const;

export function UnifiedFooter() {
  return (
    <footer className="u-footer">
      <div className="u-wrap">
        <div className="u-footer-grid">
          <div className="u-footer-brand">
            <Link href="/" aria-label="Fydell home">
              <FydellLogo height={26} />
            </Link>
            <p>
              The Proof of Work Network for software engineers. Evidence from
              real projects and programming simulations, owned by the developer
              and inspectable by the team hiring them.
            </p>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title} className="u-footer-col">
              <h5>{col.title}</h5>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="u-footer-bottom">
          <span>&copy; 2026 Fydell</span>
          <div className="u-footer-legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/security">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function CtaBand() {
  return (
    <section className="u-cta-band" aria-labelledby="cta-band-title">
      <div className="u-wrap">
        <h2 id="cta-band-title">Hire for the work.</h2>
        <p>Free for engineers. Hiring teams pay per completed simulation.</p>
        <div className="u-hero-ctas">
          <Link href="/get-started" className="u-btn u-btn-dark">
            Get started
          </Link>
          <Link href="/demo" className="u-btn u-btn-light">
            Explore demo
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="u-faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className="u-faq-item"
            data-open={isOpen ? "true" : "false"}
          >
            <button
              type="button"
              className="u-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              <span>{item.q}</span>
              <span className="u-faq-x" aria-hidden="true">
                +
              </span>
            </button>
            {isOpen ? <div className="u-faq-a">{item.a}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
