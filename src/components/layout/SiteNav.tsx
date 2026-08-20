"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";

/**
 * Contact is deliberately absent here. It is the commercial action, so it sits
 * in the action group as a button rather than competing with the explanatory
 * pages as a fourth link of equal weight.
 */
const LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Trust", href: "/trust" },
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

  /*
   * At rest the header is part of the page: no scrim, no rule, so the ambient
   * wash behind the hero runs uninterrupted to the top edge. A translucent bar
   * over a gradient reads as a seam no matter how it is tuned. The scrim only
   * appears once content is actually passing underneath and the bar has to
   * separate itself to stay legible.
   */
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
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${
        lifted || open
          ? "border-[var(--border-subtle)] bg-[var(--nav-scrim)] backdrop-blur-[16px]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mkt-content flex h-[68px] items-center justify-between gap-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5"
          aria-label="Fydell home"
        >
          <FydellMark width={24} />
          <span className="text-[17px] font-semibold leading-none tracking-[-0.026em] text-[var(--text-primary)]">
            fydell
          </span>
        </Link>

        {/* Every destination carries the same weight and full text contrast.
            Dimming the inactive links made the whole bar read as disabled
            chrome; the current page is marked by the rule beneath it instead. */}
        <nav className="hidden items-center gap-8 min-[900px]:flex" aria-label="Primary">
          {LINKS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative text-[14px] font-medium tracking-[-0.011em] text-[var(--text-primary)] transition-opacity duration-150 hover:opacity-65"
              >
                {item.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-[23px] h-[1.5px] bg-[var(--text-primary)]"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-[14px] font-medium text-[var(--text-primary)] transition-opacity duration-150 hover:opacity-65 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="hidden h-9 items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 text-[13.5px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] min-[900px]:inline-flex"
          >
            Contact sales
          </Link>
          <Link
            href="/signup"
            className="hidden h-9 items-center rounded-full bg-[var(--control-solid)] px-4 text-[13.5px] font-medium text-[var(--control-solid-ink)] transition-colors hover:bg-[var(--control-solid-hover)] sm:inline-flex"
          >
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] min-[900px]:hidden"
          >
            {open ? (
              <X className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            ) : (
              <Menu className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-4 py-3 min-[900px]:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Mobile">
            {[...LINKS, { label: "Contact sales", href: "/contact" }].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[8px] px-3 py-2.5 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-[8px] px-3 py-2.5 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-[var(--control-solid)] text-[14.5px] font-medium text-[var(--control-solid-ink)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
