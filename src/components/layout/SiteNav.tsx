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

const PRIMARY_BTN =
  "inline-flex h-10 items-center justify-center rounded-[10px] bg-white px-5 text-[14px] font-semibold text-black transition-[transform,background,opacity] duration-200 ease-out hover:bg-white/90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50";

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/[0.06] bg-[#050609]/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid h-full max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-6 px-6 sm:px-12">
        <FydellBrand markSize={28} className="shrink-0" />

        <nav className="hidden items-center justify-start gap-0.5 lg:flex lg:pl-6" aria-label="Primary">
          {LINKS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/for-finance" && pathname === "/product");
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-150 ease-out ${
                  active
                    ? "text-white"
                    : "text-white/50 hover:text-white/90"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-[13.5px] font-medium text-white/50 transition-colors duration-150 ease-out hover:text-white/90 sm:inline-flex"
          >
            Log in
          </Link>
          <Link href="/request-pilot" className={PRIMARY_BTN}>
            Request a pilot
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-white/70 transition-colors duration-150 ease-out hover:bg-white/[0.06] hover:text-white lg:hidden"
          >
            {open ? <X className="h-4.5 w-4.5" strokeWidth={1.7} /> : <Menu className="h-4.5 w-4.5" strokeWidth={1.7} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#050609]/95 px-6 py-4 backdrop-blur-2xl lg:hidden">
          <nav className="mx-auto flex max-w-[1280px] flex-col gap-0.5" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-white/60 transition-colors duration-150 ease-out hover:bg-white/[0.04] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[15px] font-medium text-white/60 transition-colors duration-150 ease-out hover:bg-white/[0.04] hover:text-white sm:hidden"
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
