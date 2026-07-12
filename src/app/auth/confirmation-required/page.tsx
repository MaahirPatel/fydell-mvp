import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

export default function ConfirmationRequiredPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#050609] px-6 text-[#F4F5F7]">
      <div className="w-full max-w-md">
        <FydellBrand markSize={36} wordmarkSize={22} />
        <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
          Check your email
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/60">
          Confirm your account using the link we sent. After confirmation you will continue
          employer setup. No workspace is created until you finish onboarding.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
