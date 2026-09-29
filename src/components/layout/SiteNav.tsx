"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";

const LINKS = [
  { label: "Product", href: "/how-it-works" },
  { label: "Employers", href: "/employers" },
  { label: "Developers", href: "/developers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/trust" },
  { label: "Contact", href: "/contact" },
];

export default function SiteNav() {
  const pathname = usePathname();
  /*
   * The menu is stored as the route it was opened on rather than a boolean, so
   * navigating away closes it by derivation instead of by an effect that fires
   * a second render after the new route has already painted.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenedOn(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-200 ${
        lifted || open
          ? "border-[var(--border-default)] bg-[var(--nav-scrim)] backdrop-blur-[20px] backdrop-saturate-150"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="l-container flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="inline-flex shrink-0 items-center rounded-[6px]" aria-label="Fydell home">
          <FydellLogo height={20} tone="dark" />
        </Link>

        <div className="flex items-center">
          <nav className="hidden items-center min-[900px]:flex" aria-label="Primary">
            {LINKS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-[6px] px-[10px] py-1 text-[13px] transition-colors duration-100 ${
                    active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <span aria-hidden className="mx-3 hidden h-[18px] w-px bg-[var(--border-default)] min-[900px]:block" />

          <Link
            href="/login"
            className="hidden rounded-[6px] px-[10px] py-1 text-[13px] text-[var(--text-tertiary)] transition-colors duration-100 hover:text-[var(--text-primary)] sm:inline"
          >
            Sign in
          </Link>
          <Link href="/get-started" className="l-btn l-btn-solid ml-2 hidden sm:inline-flex">
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] min-[900px]:hidden"
          >
            {open ? <X className="h-4 w-4" strokeWidth={1.7} aria-hidden /> : <Menu className="h-4 w-4" strokeWidth={1.7} aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="h-[calc(100dvh-72px)] overflow-y-auto border-t border-[var(--border-default)] bg-[var(--surface-canvas)] min-[900px]:hidden">
          <nav className="l-container flex flex-col pb-8 pt-2" aria-label="Mobile">
            {[...LINKS, { label: "Sign in", href: "/login" }].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpenedOn(null)}
                className="border-b border-[var(--border-default)] py-4 text-[17px] font-[510] tracking-[-0.012em] text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/get-started" onClick={() => setOpenedOn(null)} className="l-btn l-btn-lg l-btn-solid mt-6">
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
