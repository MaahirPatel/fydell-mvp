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
    <header className="fixed inset-x-0 top-0 z-50 h-[60px] border-b border-[var(--border-subtle)] bg-[rgba(7,8,11,0.88)] backdrop-blur-[14px] sm:h-[64px]">
      <div className="mkt-content grid h-full grid-cols-[auto_1fr_auto] items-center gap-4">
        <FydellBrand markSize={34} wordmarkSize={24} className="gap-2.5 shrink-0" />

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
                className={`relative text-[14px] transition-colors duration-150 ease-out ${
                  active
                    ? "text-[#F4F5F7]"
                    : "text-[#717682] hover:text-[#F4F5F7]"
                }`}
                style={{ fontWeight: 520, letterSpacing: "-0.01em" }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-[3px] h-px bg-[#F4F5F7]/70"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-[14px] text-[#717682] transition-colors duration-150 hover:text-[#F4F5F7]"
            style={{ fontWeight: 520, letterSpacing: "-0.01em" }}
          >
            Log in
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] text-[#A3A7B2] transition-colors duration-150 hover:text-[#F4F5F7] lg:hidden"
          >
            {open ? <X className="h-4 w-4" strokeWidth={1.7} /> : <Menu className="h-4 w-4" strokeWidth={1.7} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--border-subtle)] bg-[#07080B] px-[18px] py-3 lg:hidden">
          <nav className="mkt-content flex flex-col gap-0.5 !px-0" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-[8px] px-3 py-2.5 text-[14px] text-[#A3A7B2] transition-colors duration-150 hover:bg-white/[0.03] hover:text-[#F4F5F7]"
                style={{ fontWeight: 520 }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
