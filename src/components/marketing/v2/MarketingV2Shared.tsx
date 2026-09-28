"use client";

import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";
import "@/styles/marketing-v2.css";

/* ============================================================================
   Shared V2 marketing components — Nav, Logo, Footer.
   Used by HomePageV2, DevelopersPageV2, EmployersPageV2.
   ========================================================================== */

export function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }} aria-label="Fydell home">
      <FydellLogo height={26} tone="light" />
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

export function Footer({ ctaTitle, ctaPrimary, ctaPrimaryHref, ctaSecondary, ctaSecondaryHref }: {
  ctaTitle: string;
  ctaPrimary: string;
  ctaPrimaryHref: string;
  ctaSecondary: string;
  ctaSecondaryHref: string;
}) {
  return (
    <>
      <div className="mk-footer-cta">
        <h2>{ctaTitle}</h2>
        <div className="mk-hero-actions">
          <Link href={ctaPrimaryHref} className="mk-btn-dark">{ctaPrimary} →</Link>
          <Link href={ctaSecondaryHref} className="mk-btn-light">{ctaSecondary}</Link>
        </div>
      </div>
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
    </>
  );
}
