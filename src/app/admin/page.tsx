import Link from "next/link";
import { redirect } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import AdminLogin from "@/components/admin/AdminLogin";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/overview");

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050609]">
      <div className="pointer-events-none absolute right-[-8%] top-[-8%] h-[480px] w-[580px] rounded-full bg-[#3B5BFF]/[0.06] blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-6%] h-[400px] w-[500px] rounded-full bg-[#3B5BFF]/[0.04] blur-[160px]" />

      <header className="relative z-10 mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-6 lg:px-10">
        <FydellBrand markSize={34} />
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="text-[14px] font-medium text-white/[0.55] transition hover:text-white"
          >
            Homepage
          </Link>
          <Link
            href="/login"
            className="text-[14px] font-medium text-white/[0.55] transition hover:text-white"
          >
            Employer login
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-72px)] max-w-[440px] items-center px-6 pb-16">
        <div className="w-full overflow-hidden rounded-[20px] border border-white/[0.10] bg-[#080B12] p-7 sm:p-9">
          <p className="text-[12px] uppercase tracking-[0.06em] text-white/55">
            Platform administration
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-white">
            Admin sign in
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/70">
            Review pilot requests, manage organizations, and operate Fydell.
          </p>
          <div className="mt-7">
            <AdminLogin />
          </div>
        </div>
      </main>
    </div>
  );
}
