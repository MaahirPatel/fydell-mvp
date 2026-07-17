"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Simulation", href: "/simulation" },
  { label: "Pricing", href: "/pricing" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-[rgba(255,255,255,0.055)] bg-[rgba(7,8,11,0.84)] backdrop-blur-[16px]">
      <div className="mkt-content grid h-full grid-cols-[auto_1fr_auto] items-center gap-4">
        <FydellBrand markSize={23} wordmarkSize={18} className="gap-2 shrink-0" />

        <nav
          className="hidden items-center justify-center gap-[28px] lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/product" && pathname === "/for-finance");
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative text-[12.5px] leading-none transition-colors duration-160 ease-out ${
                  active
                    ? "text-[#F4F5F7]"
                    : "text-[rgba(244,245,247,0.4)] hover:text-[#F4F5F7]"
                }`}
                style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
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

        <div className="flex items-center gap-[16px]">
          <Link
            href="/login"
            className="hidden text-[12.5px] leading-none text-[rgba(244,245,247,0.4)] transition-colors duration-160 hover:text-[#F4F5F7] sm:inline"
            style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden text-[12.5px] leading-none text-[rgba(244,245,247,0.4)] transition-colors duration-160 hover:text-[#F4F5F7] lg:inline"
            style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            Post a mission
          </Link>
          <Link
            href="/signup"
            className="hidden h-[33px] items-center rounded-[8px] bg-[#F1F2F4] px-[14px] text-[12.5px] leading-none text-[#08090C] transition-[transform,filter] duration-160 hover:-translate-y-px hover:brightness-[1.02] sm:inline-flex"
            style={{ fontWeight: 560 }}
          >
            Join as an FDE
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-subtle)] text-[rgba(244,245,247,0.62)] transition-colors duration-160 hover:text-[#F4F5F7] lg:hidden"
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
                className="rounded-[8px] px-3 py-2.5 text-[13px] text-[rgba(244,245,247,0.62)] transition-colors duration-160 hover:bg-white/[0.03] hover:text-[#F4F5F7]"
                style={{ fontWeight: 500 }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-[8px] px-3 py-2.5 text-[13px] text-[rgba(244,245,247,0.62)] transition-colors duration-160 hover:text-[#F4F5F7]"
              style={{ fontWeight: 500 }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-[8px] px-3 py-2.5 text-[13px] text-[rgba(244,245,247,0.62)] transition-colors duration-160 hover:text-[#F4F5F7]"
              style={{ fontWeight: 500 }}
            >
              Post a mission
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex h-[36px] items-center justify-center rounded-[8px] bg-[#F1F2F4] px-4 text-[13px] text-[#08090C]"
              style={{ fontWeight: 560 }}
            >
              Join as an FDE
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
