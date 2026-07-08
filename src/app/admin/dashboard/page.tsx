import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/admin/LogoutButton";
import InviteModal from "@/components/admin/InviteModal";
import { getAdminSession } from "@/lib/auth";
import { listCandidatesForAdmin, type AdminCandidateRow } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmtTime(seconds: number | null): string {
  if (!seconds && seconds !== 0) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    invited: "bg-bg text-ink-2 border-line",
    started: "bg-blue/10 text-blue border-blue/20",
    completed: "bg-teal/10 text-teal-600 border-teal/25"
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        map[status] ?? map.invited
      }`}
    >
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin");

  let rows: AdminCandidateRow[] = [];
  let dbError = false;
  try {
    rows = await listCandidatesForAdmin();
  } catch {
    dbError = true;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Logo size={24} />
            <span className="hidden text-sm text-muted sm:inline">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted md:inline">{session.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl">Candidates</h1>
            <p className="mt-1 text-sm text-muted">
              {rows.length} candidate{rows.length === 1 ? "" : "s"} | pilot program
            </p>
          </div>
          <InviteModal />
        </div>

        {dbError && (
          <div className="mt-5 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral-600">
            Couldn&apos;t reach the database. Check your Supabase keys in{" "}
            <code>.env.local</code> and that the schema has been applied.
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-bg text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Employer</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !dbError ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-muted">
                      No candidates yet. Use <strong>Invite Candidate</strong> to send
                      the first simulation.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-line last:border-0 hover:bg-bg/60"
                    >
                      <td className="px-5 py-3 font-semibold text-navy">{r.name}</td>
                      <td className="px-5 py-3 text-ink-2">{r.email}</td>
                      <td className="px-5 py-3 text-ink-2">{r.employer_name}</td>
                      <td className="px-5 py-3 text-ink-2">{r.role}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 tabular text-ink-2">
                        {fmtTime(r.time_spent_seconds)}
                      </td>
                      <td className="px-5 py-3 tabular text-ink-2">
                        {fmtDate(r.submitted_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/candidates/${r.id}`}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-line-strong hover:bg-bg"
                          >
                            View Full Report
                          </Link>
                          <a
                            href={`mailto:${r.email}?subject=${encodeURIComponent(
                              "Following up on your Fydell simulation"
                            )}`}
                            className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal"
                          >
                            Schedule Follow-Up
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
