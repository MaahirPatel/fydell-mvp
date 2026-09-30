"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Lockup } from "./Mark";
import s from "./chrome.module.css";
import site from "./site.module.css";

export const NAV_LINKS = [
  { label: "Product", href: "/product" },
  { label: "Employers", href: "/employers" },
  { label: "Developers", href: "/developers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/trust" },
  { label: "Contact", href: "/contact" },
];

export default function SiteNav() {
  const pathname = usePathname();
  // The menu remembers the route it opened on, so navigating closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className={`${s.header} ${lifted || open ? s.lifted : ""}`}>
      <div className={s.bar}>
        <Link href="/" className={s.brand} aria-label="fydell home">
          <Lockup size={19} />
        </Link>
        <nav className={s.nav} aria-label="Primary">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link key={l.href} href={l.href} className={s.link} aria-current={active ? "page" : undefined}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className={s.right}>
          <Link href="/login" className={`${s.link} ${s.signIn}`}>
            Sign in
          </Link>
          <Link href="/get-started" className={`${site.btn} ${site.btnPrimary} ${site.btnSm}`}>
            Get started
          </Link>
          <button
            type="button"
            className={s.menuButton}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpenedOn(open ? null : pathname)}
          >
            {open ? <X size={20} strokeWidth={1.5} aria-hidden /> : <Menu size={20} strokeWidth={1.5} aria-hidden />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="mobile-menu" className={s.mobile} aria-label="Mobile">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={s.mobileLink} onClick={() => setOpenedOn(null)}>
              {l.label}
            </Link>
          ))}
          <div className={s.mobileActions}>
            <Link href="/get-started" className={`${site.btn} ${site.btnPrimary}`} onClick={() => setOpenedOn(null)}>
              Get started
            </Link>
            <Link href="/login" className={`${site.btn} ${site.btnSecondary}`} onClick={() => setOpenedOn(null)}>
              Sign in
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
