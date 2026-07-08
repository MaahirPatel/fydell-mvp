import Link from "next/link";
import Logo from "@/components/Logo";
import { getApplyContext } from "@/lib/db";
import { LANDING_COPY } from "@/lib/scenario";

export const dynamic = "force-dynamic";

async function loadContext(token: string) {
  try {
    return await getApplyContext(token);
  } catch {
    return null;
  }
}

export default async function ApplyLandingPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await loadContext(token);

  if (!ctx) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <Logo size={26} className="mb-6 justify-center" />
          <h1 className="text-2xl">This invitation isn&apos;t valid</h1>
          <p className="mt-3 text-ink-2">
            The link may have expired or already been used. Please check with the team
            that invited you.
          </p>
        </div>
      </main>
    );
  }

  const { candidate, employer } = ctx;

  if (candidate.status === "completed") {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <Logo size={26} className="mb-6 justify-center" />
          <h1 className="text-2xl">You&apos;ve already completed this</h1>
          <p className="mt-3 text-ink-2">
            Your simulation has been submitted. A member of the team will be in touch.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-2xl animate-fade-up">
        <Logo size={28} className="mb-8 justify-center" />

        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
          <div className="border-b border-line bg-navy px-8 py-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal">
              {employer.name}
            </p>
            <h1 className="mt-1 text-3xl text-white">{candidate.role}</h1>
          </div>

          <div className="px-8 py-9">
            <p className="text-lg leading-relaxed text-ink-2">{LANDING_COPY}</p>

            <div className="mt-9 flex justify-center">
              <Link
                href={`/apply/${token}/start`}
                className="inline-flex h-[52px] items-center justify-center rounded-xl bg-navy px-8 font-semibold text-white shadow-[0_6px_16px_rgba(27,37,80,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal hover:shadow-[0_10px_24px_rgba(20,184,166,0.32)]"
              >
                Start Simulation
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted">
          25 minutes | one sitting | use any tools you like, including AI
        </p>
      </div>
    </main>
  );
}
