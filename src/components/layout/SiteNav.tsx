"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import FydellBrand from "@/components/brand/FydellBrand";
import { CREATE_SIMULATION_HREF } from "@/lib/marketing/ctas";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "Employers", href: "/employers" },
  { label: "Candidates", href: "/candidates" },
  { label: "Trust", href: "/trust" },
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
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-[#D9DEE7] bg-[rgba(252,252,250,0.92)] backdrop-blur-[12px]">
      <div className="mkt-content grid h-full grid-cols-[auto_1fr_auto] items-center gap-4">
        <FydellBrand markSize={23} wordmarkSize={18} ink className="gap-2 shrink-0" />

        <nav
          className="hidden items-center justify-center gap-[28px] lg:flex"
          aria-label="Primary"
        >
          {LINKS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative text-[12.5px] leading-none transition-colors duration-160 ease-out ${
                  active ? "text-[#0B1020]" : "text-[#586273] hover:text-[#0B1020]"
                }`}
                style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-[3px] h-px bg-[#3157D5]"
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
            className="hidden text-[12.5px] leading-none text-[#586273] transition-colors duration-160 hover:text-[#0B1020] sm:inline"
            style={{ fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            Sign in
          </Link>
          <Link
            href={CREATE_SIMULATION_HREF}
            className="hidden h-[33px] items-center rounded-[8px] bg-[#3157D5] px-[14px] text-[12.5px] leading-none text-white transition-colors duration-160 hover:bg-[#2342A2] sm:inline-flex"
            style={{ fontWeight: 560 }}
          >
            Create a simulation
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#D9DEE7] text-[#586273] transition-colors duration-160 hover:text-[#0B1020] lg:hidden"
          >
            {open ? <X className="h-4 w-4" strokeWidth={1.7} /> : <Menu className="h-4 w-4" strokeWidth={1.7} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#D9DEE7] bg-[#FCFCFA] px-[18px] py-3 lg:hidden">
          <nav className="mkt-content flex flex-col gap-0.5 !px-0" aria-label="Mobile">
            {LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-[8px] px-3 py-2.5 text-[13px] text-[#586273] transition-colors duration-160 hover:bg-[#F4F3EF] hover:text-[#0B1020]"
                style={{ fontWeight: 500 }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-[8px] px-3 py-2.5 text-[13px] text-[#586273] transition-colors duration-160 hover:text-[#0B1020]"
              style={{ fontWeight: 500 }}
            >
              Sign in
            </Link>
            <Link
              href={CREATE_SIMULATION_HREF}
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex h-[36px] items-center justify-center rounded-[8px] bg-[#3157D5] px-4 text-[13px] text-white hover:bg-[#2342A2]"
              style={{ fontWeight: 560 }}
            >
              Create a simulation
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
