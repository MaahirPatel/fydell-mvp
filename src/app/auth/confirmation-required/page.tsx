import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

export default function ConfirmationRequiredPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#050609] px-6 text-[#F4F5F7]">
      <div className="w-full max-w-md">
        <FydellBrand markSize={36} wordmarkSize={22} />
        <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
          You can sign in now
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/60">
          Email confirmation is not required for the pilot. Sign in with the email and password
          you just created to continue employer setup.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
