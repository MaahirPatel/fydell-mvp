import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

export default function LinkInvalidPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#050609] px-6 text-[#F4F5F7]">
      <div className="w-full max-w-md">
        <FydellBrand markSize={36} wordmarkSize={22} />
        <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
          Link expired or invalid
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/60">
          This confirmation or recovery link is no longer valid. Request a new one and try again.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
          >
            Sign in
          </Link>
          <Link
            href="/forgot-password"
            className="inline-flex h-10 items-center rounded-[9px] border border-white/20 px-4 text-[13px] text-white"
          >
            Reset password
          </Link>
        </div>
      </div>
    </main>
  );
}
