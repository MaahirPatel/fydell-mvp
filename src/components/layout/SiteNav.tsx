"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const LINKS = [
  { label: "Product", href: "/#product", match: "/" },
  { label: "Solutions", href: "/solutions", match: "/solutions" },
  { label: "Resources", href: "/resources", match: "/resources" },
  { label: "Company", href: "/company", match: "/company" },
  { label: "Pricing", href: "/pricing", match: "/pricing" }
];

const DEMO_BTN =
  "inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[#5b8cff] to-[#7c5cff] px-5 text-[14px] font-semibold text-white shadow-[0_10px_30px_-8px_rgba(124,92,255,0.55)] transition-[transform,filter] duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4ff]";

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#03050d]/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-6 px-6 sm:px-8">
        <FydellBrand markSize={34} className="shrink-0" />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {LINKS.map((item) => {
            const active = pathname === item.match;
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3.5 py-2 text-[14.5px] font-medium transition-colors duration-200 ease-out ${
                  active
                    ? "bg-white/[0.07] text-white"
                    : "text-white/65 hover:bg-white/[0.05] hover:text-white"
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
            className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-[14.5px] font-medium text-white/90 transition-colors duration-200 ease-out hover:text-white sm:inline-flex"
          >
            Log in
          </Link>
          <Link href="/signup" className={DEMO_BTN}>
            Book a demo
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
        <div className="border-t border-white/[0.07] bg-[#03050d]/95 px-6 py-4 backdrop-blur-2xl lg:hidden">
          <nav className="mx-auto flex max-w-[1240px] flex-col gap-1" aria-label="Mobile">
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
