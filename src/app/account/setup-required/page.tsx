import Link from "next/link";
import FydellBrand from "@/components/brand/FydellBrand";

const REASONS: Record<string, string> = {
  unaffiliated:
    "Your account is active, but it is not yet connected to a Fydell workspace or candidate invitation.",
  awaiting_org_approval:
    "Your company setup was received and is awaiting Fydell approval before candidate invitations are enabled.",
  no_user_or_supabase: "We could not resolve your workspace. Sign in again or contact support.",
};

export default async function SetupRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason || "unaffiliated";
  const copy = REASONS[reason] || REASONS.unaffiliated;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#050609] px-6 text-[#F4F5F7]">
      <div className="w-full max-w-lg">
        <FydellBrand markSize={36} wordmarkSize={22} />
        <h1 className="mt-10 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
          Setup required
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/60">{copy}</p>
        <ul className="mt-6 space-y-2 text-[13px] text-white/70">
          <li>
            <Link href="/onboarding/employer" className="underline hover:text-white">
              Continue employer onboarding
            </Link>
          </li>
          <li>
            <Link href="/request-pilot" className="underline hover:text-white">
              Request a pilot
            </Link>
          </li>
          <li>
            <a href="mailto:admin@fydell.com" className="underline hover:text-white">
              Contact admin@fydell.com
            </a>
          </li>
          <li>
            <Link href="/api/platform/logout" className="underline hover:text-white">
              Sign out
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
