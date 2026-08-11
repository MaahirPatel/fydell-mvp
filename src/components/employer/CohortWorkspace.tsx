"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type CohortStatus = "draft" | "open" | "paused" | "closed";

interface CohortPayload {
  cohort: {
    id: string;
    name: string;
    status: CohortStatus;
    invitation_expires_days: number;
    template_version_id: string;
  };
  evaluationSlug: string;
  metrics: {
    invited: number;
    opened: number;
    inProgress: number;
    submitted: number;
    reportsReady: number;
    humanReview: number;
    reviewed: number;
  };
  invitations: Array<{
    id: string;
    candidate_email: string;
    candidate_name: string | null;
    status: string;
    email_delivery: string;
    expires_at: string;
    sim_sessions:
      | { id: string; status: string; report_status: string; review_status: string }
      | { id: string; status: string; report_status: string; review_status: string }[]
      | null;
  }>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[24px] font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-[12.5px] text-slate-500">{label}</p>
    </div>
  );
}

function sessionOf(row: CohortPayload["invitations"][number]) {
  if (!row.sim_sessions) return null;
  return Array.isArray(row.sim_sessions) ? row.sim_sessions[0] : row.sim_sessions;
}

export default function CohortWorkspace({ organizationName }: { organizationName: string }) {
  const [data, setData] = useState<CohortPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/pilot/cohort");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load cohort");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load cohort");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const setStatus = async (status: CohortStatus) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot/cohort", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    setBusy(true);
    setError(null);
    setInviteResult(null);
    try {
      const res = await fetch("/api/sim/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usePilotCohort: true,
          candidates: [{ email: inviteEmail.trim(), name: inviteName.trim() || undefined }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.errors?.[0] || "Invite failed");
      const first = json.created?.[0] || json.invitations?.[0];
      if (first?.inviteUrl) {
        setInviteResult({
          url: first.inviteUrl,
          label: first.deliveryLabel || "Link created - not emailed",
        });
      }
      setInviteEmail("");
      setInviteName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };

  if (!data && !error) {
    return <p className="text-[14px] text-slate-500">Loading cohort...</p>;
  }
  if (error && !data) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[14px] text-amber-900">
        <p className="font-medium">Cohort not ready</p>
        <p className="mt-1">{error}</p>
        <p className="mt-2 text-[13px]">
          Seed the October evaluation template (`ops-yield-investigation`) then refresh. If the
          migration is not applied yet, apply `021_october_pilot_cohort.sql` first.
        </p>
      </div>
    );
  }
  if (!data) return null;

  const { cohort, metrics } = data;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              {organizationName}
            </p>
            <h2 className="mt-1 text-[18px] font-semibold text-slate-900">{cohort.name}</h2>
            <p className="mt-1 text-[13.5px] text-slate-500">
              Evaluation: Operations performance investigation · status{" "}
              <span className="font-medium text-slate-800">{cohort.status}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cohort.status !== "open" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setStatus("open")}
                className="rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"
              >
                Open cohort
              </button>
            )}
            {cohort.status === "open" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setStatus("paused")}
                className="rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-medium"
              >
                Pause
              </button>
            )}
            {cohort.status === "paused" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setStatus("open")}
                className="rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-medium text-white"
              >
                Resume
              </button>
            )}
            {cohort.status !== "closed" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Close this cohort? New invitations will be blocked. Historical attempts are unchanged."
                    )
                  ) {
                    void setStatus("closed");
                  }
                }}
                className="rounded-lg border border-red-200 px-3 py-2 text-[13px] font-medium text-red-700"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Candidates invited" value={metrics.invited} />
        <Metric label="Invitations opened" value={metrics.opened} />
        <Metric label="Sessions in progress" value={metrics.inProgress} />
        <Metric label="Submissions received" value={metrics.submitted} />
        <Metric label="Reports ready" value={metrics.reportsReady} />
        <Metric label="Human review required" value={metrics.humanReview} />
        <Metric label="Reviewed candidates" value={metrics.reviewed} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-[16px] font-semibold text-slate-900">Invite a candidate</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Cohort must be Open. Delivery status is truthful: emailed when Resend is configured,
          otherwise Link created - not emailed.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[13px] text-slate-600">
            Display name
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px]"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
            />
          </label>
          <label className="text-[13px] text-slate-600">
            Email
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px]"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy || !inviteEmail.trim() || cohort.status !== "open"}
          onClick={() => void invite()}
          className="mt-4 rounded-lg bg-[#3157D5] px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          Create invitation
        </button>
        {inviteResult && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[13px]">
            <p className="font-medium text-emerald-900">{inviteResult.label}</p>
            <p className="mt-1 break-all text-emerald-800">{inviteResult.url}</p>
            <button
              type="button"
              className="mt-2 text-[12.5px] font-semibold text-emerald-900 underline"
              onClick={() => void navigator.clipboard.writeText(inviteResult.url)}
            >
              Copy secure link
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-[13px] text-red-700">{error}</p>}
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-[16px] font-semibold text-slate-900">Candidate work queue</h3>
          <Link href="/app/employer/compare" className="text-[13px] font-medium text-[#3157D5]">
            Compare completed
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Invitation</th>
                <th className="px-4 py-3 font-semibold">Attempt</th>
                <th className="px-4 py-3 font-semibold">Report</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-slate-500">
                    No candidates yet. Open the cohort and send the first invitation.
                  </td>
                </tr>
              )}
              {data.invitations.map((row) => {
                const session = sessionOf(row);
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {row.candidate_name || row.candidate_email}
                      </p>
                      <p className="text-[12px] text-slate-500">{row.candidate_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {row.status}
                      <span className="block text-[11.5px] text-slate-400">
                        {row.email_delivery === "sent"
                          ? "Sent"
                          : row.email_delivery === "failed"
                            ? "Email failed"
                            : "Link created - not emailed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{session?.status || "not started"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {session?.report_status || "not available"}
                    </td>
                    <td className="px-4 py-3">
                      {session?.id ? (
                        <Link
                          href={`/app/employer/assessments/report/${session.id}`}
                          className="font-medium text-[#3157D5] hover:underline"
                        >
                          Open report
                        </Link>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
