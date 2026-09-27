"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";

const LINKS = [
  { label: "Developers", href: "/developers" },
  { label: "Employers", href: "/employers" },
  { label: "Product", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

export default function SiteNav({ tone = "light" }: { tone?: "ink" | "light" }) {
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
          ? "border-[var(--border-subtle)] bg-[var(--nav-scrim)] backdrop-blur-[20px] backdrop-saturate-150"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1232px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="inline-flex shrink-0 items-center" aria-label="Fydell home">
          <FydellLogo height={21} tone={tone === "ink" ? "dark" : "light"} />
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 min-[900px]:flex" aria-label="Primary">
            {LINKS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-[8px] px-3 py-1.5 text-[14px] tracking-[-0.01em] transition-colors duration-150 ${
                    active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <span aria-hidden className="mx-3 hidden h-4 w-px bg-[var(--border-default)] min-[900px]:block" />

          <Link
            href="/login"
            className="hidden rounded-[8px] px-3 py-1.5 text-[14px] tracking-[-0.01em] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/get-started"
            className="ml-1 hidden h-8 items-center rounded-full bg-[var(--control-solid)] px-3.5 text-[13.5px] font-medium tracking-[-0.01em] text-[var(--control-solid-ink)] transition-colors duration-150 hover:bg-[var(--control-solid-hover)] sm:inline-flex"
          >
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] min-[900px]:hidden"
          >
            {open ? <X className="h-4 w-4" strokeWidth={1.7} aria-hidden /> : <Menu className="h-4 w-4" strokeWidth={1.7} aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-5 pb-6 pt-3 min-[900px]:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {[...LINKS, { label: "Sign in", href: "/login" }].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpenedOn(null)}
                className="border-b border-[var(--border-subtle)] py-3.5 text-[16px] text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/get-started"
              onClick={() => setOpenedOn(null)}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--control-solid)] text-[15px] font-medium text-[var(--control-solid-ink)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
