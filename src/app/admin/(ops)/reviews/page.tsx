import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hasEngineeringEvaluation } from "@/lib/engineering/descriptor";
import { scenarioIdForTemplateSlug } from "@/lib/simulations/scenario-package";
import { requireAdminPermission } from "@/lib/ops/require-platform-role";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  status: string;
  submitted_at: string | null;
  sim_templates: { slug: string; title: string } | null;
  sim_invitations: { candidate_email: string } | null;
  organizations: { name: string } | null;
  sim_report_reviews: { status: string; decided_at: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting for review",
  changes_requested: "Changes requested",
  released: "Released to employer",
};

/** Engineering reports waiting for (or past) human QA before employer release (AI-12). */
export default async function ReportReviewQueue() {
  await requireAdminPermission("reports.review");
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_sessions")
    .select(
      "id, status, submitted_at, sim_templates(slug, title), sim_invitations(candidate_email), organizations(name), sim_report_reviews(status, decided_at)"
    )
    .in("status", ["submitted", "analyzed", "report_ready"])
    .order("submitted_at", { ascending: true })
    .limit(200);

  // PostgREST returns embedded one-to-one rows as an object or a one-item array.
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const rows = ((data ?? []) as unknown as Row[])
    .map((r) => ({
      ...r,
      sim_templates: one(r.sim_templates),
      sim_invitations: one(r.sim_invitations),
      organizations: one(r.organizations),
      sim_report_reviews: one(r.sim_report_reviews),
    }))
    .filter((r) => {
      const scenarioId = scenarioIdForTemplateSlug(r.sim_templates?.slug);
      return Boolean(scenarioId && hasEngineeringEvaluation(scenarioId));
    });
  const pending = rows.filter((r) => (r.sim_report_reviews?.status ?? "pending") !== "released");
  const released = rows.filter((r) => r.sim_report_reviews?.status === "released");

  const list = (items: Row[]) => (
    <ul className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
      {items.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href={`/admin/reviews/${r.id}`} className="text-app-body text-[var(--action-ink)] underline-offset-2 hover:underline">
            {r.sim_invitations?.candidate_email ?? r.id}
          </Link>
          <span className="text-app-meta text-[var(--text-secondary)]">
            {r.organizations?.name ?? "Unknown workspace"} · {r.sim_templates?.title ?? "Assessment"} · submitted{" "}
            {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "not recorded"} ·{" "}
            {STATUS_LABEL[r.sim_report_reviews?.status ?? "pending"]}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="px-6 py-8">
      <h1 className="text-app-page font-medium">Report reviews</h1>
      <p className="mt-2 max-w-[70ch] text-app-meta text-[var(--text-secondary)]">
        Engineering assessment reports are held from employers until a qualified reviewer checks the code
        evaluation and releases them. Oldest first.
      </p>
      <h2 className="mt-8 text-app-section font-medium">Needs review ({pending.length})</h2>
      {pending.length ? list(pending) : <p className="mt-3 text-app-meta text-[var(--text-secondary)]">Nothing waiting.</p>}
      <h2 className="mt-8 text-app-section font-medium">Released ({released.length})</h2>
      {released.length ? list(released) : <p className="mt-3 text-app-meta text-[var(--text-secondary)]">None yet.</p>}
    </div>
  );
}
