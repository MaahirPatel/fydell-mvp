"use client";

import Link from "next/link";
import { useInviteModal } from "./InviteCandidateModal";
import { useInvitationActions } from "./useInvitationActions";

export interface CandidateRow {
  invitationId: string;
  name: string;
  email: string;
  roleTitle: string;
  simulation: string;
  status: string;
  statusLabel: string;
  progress: string;
  result: string | null;
  sessionId: string | null;
  reportReady: boolean;
  canResend: boolean;
  canRevoke: boolean;
  emailDelivery?: string | null;
}

export default function CandidatesTable({ rows }: { rows: CandidateRow[] }) {
  const { open } = useInviteModal();
  const { act, busyId, notice } = useInvitationActions();

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-[16px] font-medium text-slate-900">No candidates yet</p>
        <p className="mt-1 text-[14.5px] text-slate-500">
          Invite a candidate to a five-minute simulation to see them here.
        </p>
        <button
          type="button"
          onClick={() => open()}
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#3157D5] px-4 text-[14px] font-semibold text-white hover:bg-[#2848b8]"
        >
          Invite candidate
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {notice && (
        <p className="mb-2 break-all rounded-lg bg-blue-50 px-3 py-2 text-[13.5px] text-blue-800">
          {notice}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-slate-200 text-[12px] uppercase tracking-wide text-slate-400">
              <th className="px-4 py-2.5 font-semibold">Candidate</th>
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Simulation</th>
              <th className="px-4 py-2.5 font-semibold">Invitation</th>
              <th className="px-4 py-2.5 font-semibold">Progress</th>
              <th className="px-4 py-2.5 font-semibold">Result</th>
              <th className="px-4 py-2.5 font-semibold" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.invitationId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{r.name || r.email}</td>
                <td className="px-4 py-3 text-slate-600">{r.email}</td>
                <td className="px-4 py-3 text-slate-600">{r.roleTitle}</td>
                <td className="px-4 py-3 text-slate-600">{r.simulation}</td>
                <td className="px-4 py-3 text-slate-600">
                  <span>{r.statusLabel}</span>
                  {r.emailDelivery === "failed" && (
                    <span className="mt-1 block text-[12px] font-medium text-red-600">
                      Email failed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{r.progress}</td>
                <td className="px-4 py-3">
                  {r.result ? (
                    <span className="whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-[12.5px] font-semibold text-blue-700">
                      {r.result}
                    </span>
                  ) : (
                    <span className="text-slate-400">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                    {r.reportReady && r.sessionId && (
                      <Link
                        href={`/app/employer/assessments/report/${r.sessionId}`}
                        className="text-[13.5px] font-semibold text-blue-700 hover:text-blue-600"
                      >
                        View report
                      </Link>
                    )}
                    {r.canResend && (
                      <>
                        <button
                          type="button"
                          onClick={() => void act(r.invitationId, "resend")}
                          disabled={busyId === r.invitationId}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(r.invitationId, "copy")}
                          disabled={busyId === r.invitationId}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Copy link
                        </button>
                      </>
                    )}
                    {r.canRevoke && (
                      <button
                        type="button"
                        onClick={() => void act(r.invitationId, "revoke")}
                        disabled={busyId === r.invitationId}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
