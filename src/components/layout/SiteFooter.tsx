import Link from "next/link";
import Logo from "@/components/Logo";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.06] py-12">
      <div className="mx-auto flex max-w-[1536px] flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center lg:px-12">
        <div>
          <Logo size={20} variant="dark" />
          <p className="mt-2 text-xs text-white/36">Real work, not polished resumes.</p>
        </div>
        <div className="flex flex-wrap gap-6 text-xs font-semibold text-white/44">
          <Link href="/#product" className="transition hover:text-white/70">Product</Link>
          <Link href="/solutions" className="transition hover:text-white/70">Solutions</Link>
          <Link href="/resources" className="transition hover:text-white/70">Resources</Link>
          <Link href="/company" className="transition hover:text-white/70">Company</Link>
          <Link href="/pricing" className="transition hover:text-white/70">Pricing</Link>
          <Link href="/platform" className="transition hover:text-white/70">Dashboard</Link>
          <Link href="/simulation" className="transition hover:text-white/70">Live simulation</Link>
        </div>
        <p className="text-[10px] text-white/28">© {new Date().getFullYear()} Fydell</p>
      </div>
    </footer>
  );
}
