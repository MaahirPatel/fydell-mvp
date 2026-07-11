"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "For Finance Teams", href: "/for-finance" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[52px] border-b border-[var(--border-subtle)] bg-[rgba(7,8,11,0.82)] backdrop-blur-[14px] sm:h-[54px]">
      <div className="mkt-content grid h-full grid-cols-[auto_1fr_auto] items-center gap-4">
        <FydellBrand markSize={22} className="gap-2 shrink-0" />

        <nav
          className="hidden items-center justify-center gap-7 xl:gap-8 lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/for-finance" && pathname === "/product");
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative text-[13px] transition-colors duration-150 ease-out ${
                  active
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                }`}
                style={{ fontWeight: 520, letterSpacing: "-0.005em" }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-[3px] h-px bg-[var(--text-primary)]/70"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hidden text-[13px] text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)] sm:inline-flex"
            style={{ fontWeight: 520, letterSpacing: "-0.005em" }}
          >
            Log in
          </Link>
          <Link
            href="/request-pilot"
            className="inline-flex h-[34px] items-center justify-center rounded-[9px] bg-[#F2F3F5] px-[15px] text-[13px] text-[#090A0D] transition-[transform,filter] duration-150 ease-out hover:-translate-y-px hover:brightness-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            style={{ fontWeight: 580 }}
          >
            Request a pilot
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] lg:hidden"
          >
            {open ? <X className="h-4 w-4" strokeWidth={1.7} /> : <Menu className="h-4 w-4" strokeWidth={1.7} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--border-subtle)] bg-[var(--page-bg)] px-[18px] py-3 lg:hidden">
          <nav className="mkt-content flex flex-col gap-0.5 !px-0" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-[8px] px-3 py-2.5 text-[14px] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[var(--text-primary)]"
                style={{ fontWeight: 520 }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-[8px] px-3 py-2.5 text-[14px] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[var(--text-primary)] sm:hidden"
              style={{ fontWeight: 520 }}
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
