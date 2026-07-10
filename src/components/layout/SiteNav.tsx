"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "For Finance Teams", href: "/product" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const PRIMARY_BTN =
  "inline-flex h-11 items-center justify-center rounded-xl bg-[#2563FF] px-5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(37,99,255,0.28)] transition-[transform,background] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[76px] border-b border-white/[0.08] bg-[#05070D]/72 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid h-full max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-6 px-6 sm:px-12">
        <FydellBrand markSize={30} className="shrink-0" />

        <nav className="hidden items-center justify-start gap-1 lg:flex lg:pl-8" aria-label="Primary">
          {LINKS.map((item) => {
            const active = pathname === item.href || (item.href === "/product" && pathname === "/for-finance");
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors duration-200 ease-out ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-[#A7B0C0] hover:bg-white/[0.05] hover:text-white"
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
            className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-medium text-[#A7B0C0] transition-colors duration-200 ease-out hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link href="/request-pilot" className={PRIMARY_BTN}>
            Request a pilot
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.035] text-white transition-colors duration-200 ease-out hover:bg-white/[0.07] lg:hidden"
          >
            {open ? <X className="h-5 w-5" strokeWidth={1.7} /> : <Menu className="h-5 w-5" strokeWidth={1.7} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.07] bg-[#05070D]/95 px-6 py-4 backdrop-blur-2xl lg:hidden">
          <nav className="mx-auto flex max-w-[1280px] flex-col gap-1" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[15px] font-medium text-white/80 transition-colors duration-200 ease-out hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-[15px] font-medium text-white/80 transition-colors duration-200 ease-out hover:bg-white/[0.05] hover:text-white sm:hidden"
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
