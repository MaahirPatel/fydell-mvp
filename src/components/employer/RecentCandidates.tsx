"use client";

import Link from "next/link";
import { useInviteModal } from "./InviteCandidateModal";
import { useInvitationActions } from "./useInvitationActions";

export interface RecentCandidateRow {
  invitationId: string;
  candidate: string;
  roleTitle: string;
  simulation: string;
  status: string;
  statusLabel: string;
  result: string | null;
  sessionId: string | null;
  reportReady: boolean;
}

export default function RecentCandidates({ rows }: { rows: RecentCandidateRow[] }) {
  const { open } = useInviteModal();
  const { act, busyId, notice } = useInvitationActions();

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-[15px] text-slate-600">No candidates yet.</p>
        <button
          type="button"
          onClick={() => open()}
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-violet-600 px-4 text-[14px] font-semibold text-white hover:bg-violet-500"
        >
          Invite your first candidate
        </button>
      </div>
    );
  }

  return (
    <div>
      {notice && (
        <p className="mb-2 break-all rounded-lg bg-blue-50 px-3 py-2 text-[13.5px] text-blue-800">
          {notice}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2.5 font-semibold">Candidate</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Simulation</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Result</th>
              <th className="px-4 py-2.5 font-semibold" aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.invitationId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{r.candidate}</td>
                <td className="px-4 py-3 text-slate-600">{r.roleTitle}</td>
                <td className="px-4 py-3 text-slate-600">{r.simulation}</td>
                <td className="px-4 py-3 text-slate-600">{r.statusLabel}</td>
                <td className="px-4 py-3">
                  {r.result ? (
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[12.5px] font-semibold text-violet-700">
                      {r.result}
                    </span>
                  ) : (
                    <span className="text-slate-400">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.reportReady && r.sessionId ? (
                    <Link
                      href={`/app/employer/assessments/report/${r.sessionId}`}
                      className="text-[13.5px] font-semibold text-violet-700 hover:text-violet-600"
                    >
                      View report
                    </Link>
                  ) : ["sent", "opened"].includes(r.status) ? (
                    <button
                      type="button"
                      onClick={() => void act(r.invitationId, "resend")}
                      disabled={busyId === r.invitationId}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Resend
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
