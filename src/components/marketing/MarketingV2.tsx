"use client";

import Link from "next/link";
import "@/styles/marketing-v2.css";

/* ============================================================================
   Shared marketing V2 components — Linear format, Cursor light mode.

   Copy is short like Cursor. No jargon. No AI slop.
   ========================================================================== */

export function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
        <circle cx="11" cy="14" r="7" stroke="#0B6E67" strokeWidth="2.5" />
        <circle cx="17" cy="14" r="7" stroke="#6D28D9" strokeWidth="2.5" />
      </svg>
      <span style={{ fontSize: 20, fontWeight: 600, color: "var(--mk-text)", letterSpacing: "-0.02em" }}>
        fydell
      </span>
    </Link>
  );
}

export function Nav() {
  return (
    <nav className="mk-nav">
      <div className="mk-nav-inner">
        <Logo />
        <div className="mk-nav-links">
          <Link href="/developers">Developers</Link>
          <Link href="/employers">Employers</Link>
          <Link href="/product">Product</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="mk-nav-actions">
          <Link href="/login" style={{ fontSize: 14, color: "var(--mk-text-secondary)", textDecoration: "none" }}>
            Sign in
          </Link>
          <Link href="/get-started" className="mk-btn-dark" style={{ padding: "8px 20px" }}>
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function FooterCTA({ heading = "Hire for the work." }: { heading?: string }) {
  return (
    <div className="mk-footer-cta">
      <h2>{heading}</h2>
      <div className="mk-hero-actions">
        <Link href="/get-started" className="mk-btn-dark">Get started →</Link>
        <Link href="/demo" className="mk-btn-light">Explore demo</Link>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mk-footer">
      <div className="mk-footer-grid">
        <div className="mk-footer-brand">
          <Logo />
          <p>
            The proof-of-work network for software engineers.
            Real simulations. Reviewable evidence.
          </p>
        </div>
        <div className="mk-footer-col">
          <h4>Product</h4>
          <Link href="/developers">Developers</Link>
          <Link href="/employers">Employers</Link>
          <Link href="/product">Product</Link>
          <Link href="/demo">Demo</Link>
          <Link href="/download">Download</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="mk-footer-col">
          <h4>Developers</h4>
          <Link href="/developers">Simulations</Link>
          <Link href="/passport">Passport</Link>
          <Link href="/download">Desktop app</Link>
        </div>
        <div className="mk-footer-col">
          <h4>Employers</h4>
          <Link href="/employers">Hiring</Link>
          <Link href="/employers">Evidence reports</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <div className="mk-footer-col">
          <h4>Company</h4>
          <Link href="/trust">Trust</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/get-started">Get started</Link>
        </div>
        <div className="mk-footer-col">
          <h4>Legal</h4>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/security">Security</Link>
        </div>
      </div>
      <div className="mk-footer-bottom">
        <span>© 2026 Fydell</span>
        <nav>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/security">Security</Link>
        </nav>
      </div>
    </footer>
  );
}

/* Section split — Linear format: title left, description right. */
export function SectionSplit({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mk-section">
      <div className="mk-section-split">
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function LearnMore({ href }: { href: string }) {
  return (
    <Link href={href} className="mk-learn-more">
      Learn more →
    </Link>
  );
}
