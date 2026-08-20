"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";

const LINKS = [
  { label: "How it works", href: "/how-it-works" },
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
      <div className="mkt-content flex h-16 items-center justify-between gap-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5"
          aria-label="Fydell home"
        >
          <FydellMark width={22} />
          <span className="text-[16px] font-semibold leading-none tracking-[-0.024em] text-[var(--text-primary)]">
            fydell
          </span>
        </Link>

        <nav className="hidden items-center gap-7 min-[900px]:flex" aria-label="Primary">
          {LINKS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative text-[13.5px] tracking-[-0.011em] transition-colors ${
                  active
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {item.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-[21px] h-px bg-[var(--text-primary)]"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-[13.5px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden h-8 items-center rounded-full bg-[var(--control-solid)] px-4 text-[13px] font-medium text-[var(--control-solid-ink)] transition-colors hover:bg-[var(--control-solid-hover)] sm:inline-flex"
          >
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] min-[900px]:hidden"
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
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[6px] px-3 py-2.5 text-[14.5px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-[6px] px-3 py-2.5 text-[14.5px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-[var(--control-solid)] text-[14px] font-medium text-[var(--control-solid-ink)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
