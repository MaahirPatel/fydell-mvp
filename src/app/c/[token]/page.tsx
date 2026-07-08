import Logo from "@/components/Logo";
import { validateCandidateInvite } from "@/lib/mvp/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import CandidateRunner from "./CandidateRunner";

export const dynamic = "force-dynamic";

async function loadInvite(token: string) {
  if (!isSupabaseConfigured()) return { error: "not_configured" as const };
  try {
    const validated = await validateCandidateInvite(token);
    if (!validated) return { error: "invalid" as const };
    return { validated };
  } catch {
    return { error: "invalid" as const };
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Logo size={28} className="mb-8 justify-center" />
        {children}
      </div>
    </main>
  );
}

export default async function CandidatePage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await loadInvite(token);

  if ("error" in result) {
    const message =
      result.error === "not_configured"
        ? "This environment isn't connected to a database yet. Set the Supabase env vars to run the candidate flow."
        : "The link may have expired, been cancelled, or already been used. Please check with the team that invited you.";
    return (
      <Shell>
        <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-2xl">This invitation isn&apos;t available</h1>
          <p className="mt-3 text-ink-2">{message}</p>
        </div>
      </Shell>
    );
  }

  const { invite, simulation } = result.validated;
  return (
    <Shell>
      <CandidateRunner token={token} invite={invite} simulation={simulation} />
    </Shell>
  );
}
