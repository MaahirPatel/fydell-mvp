"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Roles", href: "/roles" },
  { label: "Simulations", href: "/simulations" },
  { label: "Pricing", href: "/pricing" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-white/[0.06] bg-[#050507]/80 backdrop-blur-xl">
      <div className="mkt-content flex h-full items-center justify-between gap-6">
        <FydellBrand markSize={22} wordmarkSize={17} className="gap-2 shrink-0" />

        <nav
          className="hidden items-center gap-7 lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`text-[13px] transition-colors ${
                  active ? "text-white" : "text-white/45 hover:text-white"
                }`}
                style={{ fontWeight: 450, letterSpacing: "-0.01em" }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-[13px] text-white/45 transition-colors hover:text-white sm:inline"
            style={{ fontWeight: 450 }}
          >
            Sign in
          </Link>
          <Link
            href="/simulations"
            className="hidden h-8 items-center rounded-full bg-white px-3.5 text-[13px] font-medium text-black transition hover:bg-white/90 sm:inline-flex"
          >
            Try a simulation
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/70 transition hover:text-white lg:hidden"
          >
            {open ? <X className="h-4 w-4" strokeWidth={1.7} /> : <Menu className="h-4 w-4" strokeWidth={1.7} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#050507] px-4 py-3 lg:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[14px] text-white/60 hover:bg-white/[0.04] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-[14px] text-white/60 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/simulations"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-white text-[14px] font-medium text-black"
            >
              Try a simulation
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
