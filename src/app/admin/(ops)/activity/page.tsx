import { AdminEmpty, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin/AdminUi";
import { requireAdminPermission } from "@/lib/ops/require-platform-role";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Cell = string | number | null;
type Table = { columns: string[]; rows: Cell[][] };

const short = (id: unknown) => (typeof id === "string" ? id.slice(0, 8) : "-");
const when = (iso: unknown) => (typeof iso === "string" ? new Date(iso).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC" : "-");

function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

function countBy(rows: { status?: unknown }[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = typeof r.status === "string" ? r.status : "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`).join(" · ") || "none";
}

function DataTable({ table, statusColumn }: { table: Table; statusColumn?: number }) {
  if (table.rows.length === 0) return <AdminEmpty>Nothing here yet.</AdminEmpty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-app-meta">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
            {table.columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-[var(--text-secondary)]">
                  {j === statusColumn && typeof cell === "string" ? <AdminStatusBadge status={cell} /> : (cell ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * What the product is doing right now, for operators. States, counts, ids and
 * hashes only: no code, answers, messages or report text is read here.
 */
export default async function AdminActivityPage() {
  await requireAdminPermission("ops.view");
  if (!isSupabaseConfigured()) return <AdminEmpty>Supabase is not configured.</AdminEmpty>;
  const db = createAdminSupabaseClient();
  const dayAgo = isoHoursAgo(24);

  const [roles, applications, authoring, validations, active, submissions, receipts, reports, outbox, notifications] = await Promise.all([
    db.from("hiring_roles").select("id, organization_id, title, status, published_at").order("created_at", { ascending: false }).limit(200),
    db.from("role_applications").select("id, organization_id, role_id, status, stage, submitted_at").order("submitted_at", { ascending: false }).limit(200),
    db
      .from("eng_authoring_jobs")
      .select("id, organization_id, kind, status, attempt_count, max_attempts, error_code, lease_expires_at, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    db.from("eng_scenario_validations").select("id, organization_id, status, created_at").order("created_at", { ascending: false }).limit(10),
    db
      .from("eng_attempts")
      .select("id, organization_id, status, started_at, due_at")
      .in("status", ["accepted", "preflight_passed", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(25),
    db.from("eng_submissions").select("id, attempt_id, archive_sha256, archive_bytes, late, submitted_at").order("submitted_at", { ascending: false }).limit(15),
    db.from("engineer_work_receipts").select("id, artifact_type, content_hash, accepted_at").order("accepted_at", { ascending: false }).limit(15),
    db
      .from("eng_reports")
      .select("id, attempt_id, version, status, supersedes_id, released_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20),
    db.from("email_outbox").select("status").gte("created_at", dayAgo).limit(1000),
    db.from("user_notifications").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
  ]);

  const tables: { title: string; summary?: string; table: Table; statusColumn?: number; error?: string | null }[] = [
    {
      title: "Hiring roles",
      summary: countBy(roles.data ?? []),
      error: roles.error?.message ?? null,
      table: {
        columns: ["Role", "Organization", "Title", "Status", "Published"],
        rows: (roles.data ?? []).slice(0, 10).map((r) => [short(r.id), short(r.organization_id), r.title as string, r.status as string, when(r.published_at)]),
      },
      statusColumn: 3,
    },
    {
      title: "Applications",
      summary: countBy(applications.data ?? []),
      error: applications.error?.message ?? null,
      table: {
        columns: ["Application", "Organization", "Role", "Status", "Stage", "Submitted"],
        rows: (applications.data ?? [])
          .slice(0, 10)
          .map((r) => [short(r.id), short(r.organization_id), short(r.role_id), r.status as string, (r.stage as string | null) ?? null, when(r.submitted_at)]),
      },
      statusColumn: 3,
    },
    {
      title: "Work-sample generation jobs",
      error: authoring.error?.message ?? null,
      table: {
        columns: ["Job", "Organization", "Kind", "Status", "Tries", "Error", "Lease expires", "Created"],
        rows: (authoring.data ?? []).map((r) => [
          short(r.id),
          short(r.organization_id),
          r.kind as string,
          r.status as string,
          `${r.attempt_count}/${r.max_attempts}`,
          (r.error_code as string | null) ?? null,
          when(r.lease_expires_at),
          when(r.created_at),
        ]),
      },
      statusColumn: 3,
    },
    {
      title: "Work-sample validations",
      error: validations.error?.message ?? null,
      table: {
        columns: ["Validation", "Organization", "Status", "Ran"],
        rows: (validations.data ?? []).map((r) => [short(r.id), short(r.organization_id), r.status as string, when(r.created_at)]),
      },
      statusColumn: 2,
    },
    {
      title: "Active attempts",
      error: active.error?.message ?? null,
      table: {
        columns: ["Attempt", "Organization", "Status", "Started", "Due"],
        rows: (active.data ?? []).map((r) => [r.id as string, short(r.organization_id), r.status as string, when(r.started_at), when(r.due_at)]),
      },
      statusColumn: 2,
    },
    {
      title: "Submission receipts",
      error: submissions.error?.message ?? null,
      table: {
        columns: ["Submission", "Attempt", "Archive SHA-256", "Bytes", "Late", "Accepted"],
        rows: (submissions.data ?? []).map((r) => [
          short(r.id),
          r.attempt_id as string,
          `${String(r.archive_sha256 ?? "").slice(0, 16)}…`,
          r.archive_bytes as number,
          r.late ? "yes" : "no",
          when(r.submitted_at),
        ]),
      },
    },
    {
      title: "Engineer work receipts",
      error: receipts.error?.message ?? null,
      table: {
        columns: ["Receipt", "Artifact", "Content hash", "Accepted"],
        rows: (receipts.data ?? []).map((r) => [short(r.id), r.artifact_type as string, `${String(r.content_hash ?? "").slice(0, 16)}…`, when(r.accepted_at)]),
      },
    },
    {
      title: "Report versions",
      error: reports.error?.message ?? null,
      table: {
        columns: ["Report", "Attempt", "Version", "Status", "Supersedes", "Released"],
        rows: (reports.data ?? []).map((r) => [
          short(r.id),
          short(r.attempt_id),
          r.version as number,
          r.status as string,
          r.supersedes_id ? short(r.supersedes_id) : null,
          when(r.released_at),
        ]),
      },
      statusColumn: 3,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Activity"
        description="Roles, applications, generation jobs, live attempts, receipts and report versions. Identifiers and states only; candidate code and answers are not shown here."
      />
      <AdminPanel title="Notification delivery, last 24 hours">
        <p className="text-app-body text-[var(--text-secondary)]">
          Email outbox: {countBy(outbox.data ?? [])}. In-app notifications created: {notifications.count ?? 0}. Failed emails can be retried
          from the repair console; details are in the email center.
        </p>
      </AdminPanel>
      {tables.map((t) => (
        <AdminPanel key={t.title} title={t.title}>
          {t.summary ? <p className="mb-3 text-app-meta text-[var(--text-tertiary)]">{t.summary}</p> : null}
          {t.error ? (
            <p className="text-app-meta text-[var(--fydell-risk)]">Could not load: {t.error}</p>
          ) : (
            <DataTable table={t.table} statusColumn={t.statusColumn} />
          )}
        </AdminPanel>
      ))}
    </div>
  );
}
