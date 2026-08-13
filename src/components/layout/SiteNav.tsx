"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";

/**
 * Three destinations, one primary action.
 *
 * "Pilot" left the primary navigation: it is a quiet secondary path, not a
 * peer of the product. "Simulations" became "Evaluation" because there is one
 * evaluation, not a catalogue.
 */
const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Evaluation", href: "/simulations" },
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border-subtle)] bg-[rgba(8,9,10,0.88)] backdrop-blur-[10px]">
      <div className="mkt-content flex h-14 items-center justify-between gap-8">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2"
          aria-label="Fydell home"
        >
          <FydellMark width={20} />
          <span className="text-[15px] font-semibold leading-none tracking-[-0.04em] text-[var(--text-primary)]">
            fydell
          </span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {LINKS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-[13.5px] transition-colors ${
                  active
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {item.label}
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
            className="hidden h-8 items-center rounded-[8px] bg-[#eceef1] px-3.5 text-[13px] font-medium text-[#0a0b0d] transition-colors hover:bg-white sm:inline-flex"
          >
            Create workspace
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border-default)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] lg:hidden"
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
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[6px] px-3 py-2.5 text-[14.5px] text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-[6px] px-3 py-2.5 text-[14.5px] text-[var(--text-secondary)] hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="mt-2 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#eceef1] text-[14px] font-medium text-[#0a0b0d]"
            >
              Create workspace
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
