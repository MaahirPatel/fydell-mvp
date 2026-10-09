import { AdminEmpty, AdminPageHeader, AdminPanel, AdminStatusBadge } from "@/components/admin/AdminUi";
import CasesConsole, { type CaseFormSpec } from "@/components/admin/CasesConsole";
import { hasPermission, type AdminPermission } from "@/lib/ops/admin-permissions";
import { INCIDENT_KINDS, INCIDENT_STATUSES, INCIDENT_SUBJECTS, type IncidentRow } from "@/lib/ops/admin-cases";
import { requireAdminPermission } from "@/lib/ops/require-platform-role";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function currentTime(): number {
  return Date.now();
}

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC" : "-");

const FORMS: readonly (CaseFormSpec & { permission: AdminPermission })[] = [
  {
    action: "incident.open",
    permission: "incident.review",
    title: "Open incident",
    description: "Record a platform-side problem against one piece of work. Opening an incident changes nothing else.",
    fields: [
      { name: "subjectType", label: "About", options: INCIDENT_SUBJECTS },
      { name: "subjectId", label: "Subject id" },
      { name: "kind", label: "Kind", options: INCIDENT_KINDS },
      { name: "summary", label: "What happened", multiline: true },
    ],
  },
  {
    action: "incident.review",
    permission: "incident.review",
    title: "Review incident",
    description: "Move an incident one step. Give the status you saw so two reviewers cannot both decide.",
    fields: [
      { name: "incidentId", label: "Incident id" },
      { name: "expectedStatus", label: "Current status", options: INCIDENT_STATUSES },
      { name: "status", label: "New status", options: INCIDENT_STATUSES },
      { name: "notes", label: "Finding", multiline: true },
    ],
  },
  {
    action: "attempt.replace",
    permission: "attempt.grant",
    title: "Grant replacement attempt",
    description:
      "Only after an incident on this attempt is confirmed as a platform fault and the attempt has ended. The original attempt and its reports stay as they are. No email is sent; pass the link on yourself.",
    fields: [
      { name: "attemptId", label: "Attempt id" },
      { name: "incidentId", label: "Confirmed incident id" },
      { name: "reason", label: "Reason", multiline: true },
    ],
  },
  {
    action: "commercial.correct",
    permission: "commercial.edit",
    title: "Correct commercial record",
    description: "Appends a credit or a signed adjustment to the organization's ledger. Earlier entries are never edited.",
    fields: [
      { name: "organizationId", label: "Organization id" },
      { name: "entryType", label: "Entry", options: ["credit", "adjustment"] },
      { name: "quantity", label: "Simulations (adjustments may be negative)" },
      { name: "reason", label: "Reason", multiline: true },
    ],
    idempotent: true,
  },
  {
    action: "code_access.grant",
    permission: "private_code.break_glass",
    title: "Open code access",
    description:
      "Candidate code is closed to every admin role by default. Access covers one attempt, lasts at most 60 minutes, and every file you open is recorded.",
    fields: [
      { name: "attemptId", label: "Attempt id" },
      { name: "minutes", label: "Minutes (5–60)" },
      { name: "justification", label: "Why you need it", multiline: true },
    ],
  },
  {
    action: "diagnose",
    permission: "ops.view",
    title: "Run diagnostics",
    description: "States, counts, timestamps and error codes for one attempt or import. Never file contents or answers.",
    fields: [
      { name: "subjectType", label: "About", options: ["eng_attempt", "passport_import_job"] },
      { name: "subjectId", label: "Id" },
    ],
  },
];

export default async function AdminCasesPage() {
  const admin = await requireAdminPermission("ops.view");
  if (!isSupabaseConfigured()) return <AdminEmpty>Supabase is not configured.</AdminEmpty>;
  const db = createAdminSupabaseClient();
  const canCommercial = hasPermission(admin.roles, "commercial.view");
  const now = currentTime();

  const [incidents, replacements, grants, billing, ledger] = await Promise.all([
    db
      .from("support_incidents")
      .select("id, subject_type, subject_id, organization_id, kind, summary, status, opened_by_email, reviewed_by_email, reviewed_at, review_notes, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("eng_attempt_replacements")
      .select("id, original_attempt_id, replacement_invitation_id, incident_id, reason, granted_by_email, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("admin_access_grants")
      .select("id, admin_email, resource_id, justification, granted_at, expires_at, revoked_at")
      .order("granted_at", { ascending: false })
      .limit(20),
    canCommercial
      ? db.from("organization_billing").select("organization_id, plan, status, current_period_end, organizations(name, status)").limit(100)
      : Promise.resolve({ data: [], error: null }),
    canCommercial
      ? db.from("billing_ledger_entries").select("organization_id, entry_type, quantity").limit(5000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const balances = new Map<string, { included: number; consumed: number; credited: number; adjusted: number }>();
  for (const e of (ledger.data ?? []) as { organization_id: string; entry_type: string; quantity: number | string }[]) {
    const b = balances.get(e.organization_id) ?? { included: 0, consumed: 0, credited: 0, adjusted: 0 };
    const q = Number(e.quantity);
    if (e.entry_type === "entitlement") b.included += q;
    else if (e.entry_type === "usage") b.consumed += q;
    else if (e.entry_type === "credit") b.credited += q;
    else if (e.entry_type === "adjustment") b.adjusted += q;
    balances.set(e.organization_id, b);
  }

  const forms = FORMS.filter((f) => hasPermission(admin.roles, f.permission)).map(({ action, title, description, fields, idempotent }) => ({
    action,
    title,
    description,
    fields,
    idempotent,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cases"
        description="Support incidents, replacement attempts, code access and commercial corrections. Every action here is recorded in the audit log with the reason you give."
      />

      <CasesConsole forms={forms} />

      <AdminPanel title="Support incidents">
        {incidents.error ? (
          <p className="text-app-meta text-[var(--fydell-risk)]">Could not load incidents.</p>
        ) : (incidents.data ?? []).length === 0 ? (
          <AdminEmpty>No incidents recorded.</AdminEmpty>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {((incidents.data ?? []) as IncidentRow[]).map((i) => (
              <li key={i.id} className="py-3 text-app-meta">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge status={i.status} />
                  <span className="font-mono text-[var(--text-tertiary)]">{i.id}</span>
                  <span className="text-[var(--text-secondary)]">
                    {i.kind.replace(/_/g, " ")} · {i.subject_type.replace(/_/g, " ")} {i.subject_id}
                  </span>
                </div>
                <p className="mt-1 text-[var(--text-primary)]">{i.summary}</p>
                <p className="mt-1 text-[var(--text-tertiary)]">
                  Opened by {i.opened_by_email} {when(i.created_at)}
                  {i.reviewed_by_email ? ` · reviewed by ${i.reviewed_by_email} ${when(i.reviewed_at)}: ${i.review_notes ?? ""}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="Replacement attempts">
        {(replacements.data ?? []).length === 0 ? (
          <AdminEmpty>No replacements granted.</AdminEmpty>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)] text-app-meta">
            {(replacements.data ?? []).map((r) => (
              <li key={r.id as string} className="py-2 text-[var(--text-secondary)]">
                Attempt <span className="font-mono">{r.original_attempt_id as string}</span> → invitation{" "}
                <span className="font-mono">{String(r.replacement_invitation_id).slice(0, 8)}</span> on incident{" "}
                <span className="font-mono">{String(r.incident_id).slice(0, 8)}</span> by {r.granted_by_email as string}, {when(r.created_at as string)}.{" "}
                {r.reason as string}
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="Code access grants">
        {(grants.data ?? []).length === 0 ? (
          <AdminEmpty>No one has opened candidate code.</AdminEmpty>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)] text-app-meta">
            {(grants.data ?? []).map((g) => {
              const live = !g.revoked_at && Date.parse(g.expires_at as string) > now;
              return (
                <li key={g.id as string} className="py-2 text-[var(--text-secondary)]">
                  <AdminStatusBadge status={g.revoked_at ? "revoked" : live ? "active" : "expired"} /> {g.admin_email as string} · attempt{" "}
                  <span className="font-mono">{g.resource_id as string}</span> · {when(g.granted_at as string)} until {when(g.expires_at as string)}.{" "}
                  {g.justification as string}
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>

      {canCommercial ? (
        <AdminPanel title="Commercial status">
          {(billing.data ?? []).length === 0 && balances.size === 0 ? (
            <AdminEmpty>No organization has a billing record or ledger entries yet.</AdminEmpty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-app-meta">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                    <th className="px-3 py-2 font-medium">Organization</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Billing status</th>
                    <th className="px-3 py-2 font-medium">Period ends</th>
                    <th className="px-3 py-2 font-medium">Included / used / credited / adjusted</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set([...(billing.data ?? []).map((b) => b.organization_id as string), ...balances.keys()])].map((orgId) => {
                    const b = (billing.data ?? []).find((row) => row.organization_id === orgId);
                    const org = (b?.organizations ?? null) as { name?: string } | null;
                    const l = balances.get(orgId);
                    return (
                      <tr key={orgId} className="border-b border-[var(--border-subtle)] last:border-0 text-[var(--text-secondary)]">
                        <td className="px-3 py-2">
                          {org?.name ?? "-"} <span className="font-mono text-[var(--text-tertiary)]">{orgId.slice(0, 8)}</span>
                        </td>
                        <td className="px-3 py-2">{(b?.plan as string | null) ?? "-"}</td>
                        <td className="px-3 py-2">{(b?.status as string | null) ?? "no subscription"}</td>
                        <td className="px-3 py-2">{when(b?.current_period_end as string | null)}</td>
                        <td className="px-3 py-2">{l ? `${l.included} / ${l.consumed} / ${l.credited} / ${l.adjusted}` : "no ledger entries"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminPanel>
      ) : null}
    </div>
  );
}
