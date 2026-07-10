import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] py-14">
      <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-8 px-6 sm:px-12 md:flex-row md:items-center">
        <div>
          <FydellBrand markSize={26} />
          <p className="mt-3 max-w-[280px] text-[13px] leading-relaxed text-[#6F7A8C]">
            Know who can actually do finance work before the first interview.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-[13px] font-medium text-[#A7B0C0]">
          <Link href="/product" className="transition hover:text-white">Product</Link>
          <Link href="/how-it-works" className="transition hover:text-white">How It Works</Link>
          <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
          <Link href="/request-pilot" className="transition hover:text-white">Request a pilot</Link>
          <Link href="/dashboard" className="transition hover:text-white">Dashboard</Link>
          <Link href="/sample-report" className="transition hover:text-white">Sample report</Link>
        </div>
        <p className="text-[12px] text-[#6F7A8C]">© {new Date().getFullYear()} Fydell</p>
      </div>
    </footer>
  );
}
