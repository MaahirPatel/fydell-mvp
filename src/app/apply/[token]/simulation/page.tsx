import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import Simulation from "@/components/candidate/Simulation";
import { getApplyContext } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadContext(token: string) {
  try {
    return await getApplyContext(token);
  } catch {
    return null;
  }
}

export default async function SimulationPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { token } = await params;
  const { demo } = await searchParams;
  const ctx = await loadContext(token);

  if (!ctx) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <Logo size={26} className="mb-6 justify-center" />
          <h1 className="text-2xl">This invitation isn&apos;t valid</h1>
          <p className="mt-3 text-ink-2">
            We couldn&apos;t load your simulation. Check the link you were sent.
          </p>
        </div>
      </main>
    );
  }

  if (ctx.candidate.status === "completed") {
    redirect(`/apply/${token}/complete`);
  }

  return (
    <Simulation
      token={token}
      candidateName={ctx.candidate.name}
      employerName={ctx.employer.name}
      role={ctx.candidate.role}
      demo={demo === "1"}
    />
  );
}
