import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

const LINKS = [
  { label: "Product", href: "/product" },
  { label: "For Finance Teams", href: "/for-finance" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Sample Report", href: "/sample-report" },
  { label: "Request a Pilot", href: "/request-pilot" },
  { label: "Login", href: "/login" },
];

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] py-14">
      <div className="mx-auto max-w-[1280px] px-6 sm:px-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex-shrink-0">
            <FydellBrand markSize={24} />
            <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-white/40">
              Realistic work trials for finance hiring.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[13px] font-medium text-white/40">
            {LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors duration-150 hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-white/[0.05] pt-6">
          <p className="text-[12px] text-white/30">
            © {new Date().getFullYear()} Fydell, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
