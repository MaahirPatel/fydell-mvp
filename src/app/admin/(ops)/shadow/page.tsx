import {
  AdminEmpty,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminUi";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LockRow = {
  id: string;
  session_id: string;
  mission_id: string;
  organization_id: string;
  decision: string;
  confidence: string;
  reasons: string;
  locked_by: string;
  locked_at: string;
};

type RevealRow = {
  id: string;
  session_id: string;
  decision_lock_id: string;
  revealed_by: string;
  revealed_at: string;
};

/**
 * Shadow-pilot audit: the full lock → reveal sequence per session, so an
 * administrator can verify the employer's original decision was locked
 * BEFORE Fydell's report was revealed.
 */
export default async function AdminShadowAuditPage() {
  let locks: LockRow[] = [];
  let reveals: RevealRow[] = [];
  let orgNames: Record<string, string> = {};
  let missionTitles: Record<string, string> = {};

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    const [{ data: lockRows }, { data: revealRows }] = await Promise.all([
      admin
        .from("employer_decision_locks")
        .select("*")
        .order("locked_at", { ascending: false })
        .limit(100),
      admin
        .from("report_reveal_events")
        .select("id, session_id, decision_lock_id, revealed_by, revealed_at")
        .order("revealed_at", { ascending: false })
        .limit(200),
    ]);
    locks = (lockRows || []) as LockRow[];
    reveals = (revealRows || []) as RevealRow[];

    const orgIds = Array.from(new Set(locks.map((l) => l.organization_id)));
    const missionIds = Array.from(new Set(locks.map((l) => l.mission_id)));
    if (orgIds.length) {
      const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
      orgNames = Object.fromEntries((orgs || []).map((o) => [o.id, o.name]));
    }
    if (missionIds.length) {
      const { data: missions } = await admin
        .from("fde_missions")
        .select("id, title")
        .in("id", missionIds);
      missionTitles = Object.fromEntries((missions || []).map((m) => [m.id, m.title]));
    }
  }

  const revealsByLock = new Map<string, RevealRow[]>();
  for (const r of reveals) {
    const list = revealsByLock.get(r.decision_lock_id) || [];
    list.push(r);
    revealsByLock.set(r.decision_lock_id, list);
  }

  return (
    <div>
      <AdminPageHeader
        title="Shadow-pilot audit"
        description="Lock → reveal sequence per session. Locks are immutable; the report is sealed until the employer's original decision is locked."
      />
      <AdminPanel title={`Decision locks (${locks.length})`}>
        {locks.length === 0 ? (
          <AdminEmpty>No shadow-pilot decision locks recorded yet.</AdminEmpty>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {locks.map((lock) => {
              const lockReveals = revealsByLock.get(lock.id) || [];
              const firstReveal = lockReveals[lockReveals.length - 1];
              const orderOk = !firstReveal
                ? null
                : new Date(lock.locked_at) <= new Date(firstReveal.revealed_at);
              return (
                <li key={lock.id} className="py-3 text-[13px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white/85">
                      {missionTitles[lock.mission_id] || "Mission"} ·{" "}
                      {orgNames[lock.organization_id] || "Organization"}
                    </span>
                    <span className="font-medium capitalize text-white">{lock.decision}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-white/50">
                    Locked {new Date(lock.locked_at).toLocaleString()} · confidence{" "}
                    {lock.confidence} · by {lock.locked_by.slice(0, 8)}…
                  </p>
                  <p className="mt-1 text-[12px] text-white/45">{lock.reasons}</p>
                  {firstReveal ? (
                    <p className="mt-1 text-[12px]">
                      <span className={orderOk ? "text-[#8EE4B8]" : "text-[#fda4b0]"}>
                        {orderOk ? "✓ Sequence valid" : "✗ SEQUENCE VIOLATION"}
                      </span>{" "}
                      <span className="text-white/50">
                        — revealed {new Date(firstReveal.revealed_at).toLocaleString()} by{" "}
                        {firstReveal.revealed_by.slice(0, 8)}…
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-[12px] text-white/40">Report not yet revealed.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
