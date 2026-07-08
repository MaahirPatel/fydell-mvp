import Logo from "@/components/Logo";
import ConsentForm from "@/components/candidate/ConsentForm";
import { getApplyContext } from "@/lib/db";

export const dynamic = "force-dynamic";

async function loadContext(token: string) {
  try {
    return await getApplyContext(token);
  } catch {
    return null;
  }
}

export default async function ConsentPage({
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
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-xl animate-fade-up">
        <Logo size={28} className="mb-8 justify-center" />
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
          <div className="border-b border-line px-8 py-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal">
              {ctx.employer.name} | {ctx.candidate.role}
            </p>
            <h1 className="mt-1 text-2xl">Before you begin</h1>
          </div>
          <div className="px-8 py-8">
            <ConsentForm
              token={token}
              initialName={ctx.candidate.name}
              initialEmail={ctx.candidate.email}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
