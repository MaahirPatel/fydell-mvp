"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = [
  "new",
  "reviewing",
  "contacted",
  "qualified",
  "needs_information",
  "approved",
  "rejected",
  "archived",
];

export default function PilotRequestActions({
  id,
  currentStatus,
  convertedOrganizationId,
}: {
  id: string;
  currentStatus: string;
  convertedOrganizationId?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: "status" | "note" | "process-email" | "approve") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/pilot-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, status, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Action failed");
        return;
      }
      if (action === "approve") {
        setMessage(
          data.reused
            ? "Organization already linked (idempotent)."
            : data.inviteError
              ? `Workspace created. Invite warning: ${data.inviteError}`
              : "Pilot approved. Organization created and employer invited."
        );
      } else {
        setMessage("Saved");
        setNote("");
      }
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[12px] text-[rgba(244,245,247,0.5)]">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0B0D12] px-3 text-[13px]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-[12px] text-[rgba(244,245,247,0.5)]">
          Internal note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0B0D12] px-3 py-2 text-[13px]"
          placeholder="Add context for the team"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("status")}
          className="h-9 rounded-[8px] bg-[#F1F2F4] px-3 text-[12.5px] text-[#08090C]"
          style={{ fontWeight: 560 }}
        >
          Update status
        </button>
        <button
          type="button"
          disabled={busy || !note.trim()}
          onClick={() => run("note")}
          className="h-9 rounded-[8px] border border-[rgba(255,255,255,0.12)] px-3 text-[12.5px] text-[rgba(244,245,247,0.8)]"
        >
          Add note
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("process-email")}
          className="h-9 rounded-[8px] border border-[rgba(255,255,255,0.12)] px-3 text-[12.5px] text-[rgba(244,245,247,0.8)]"
        >
          Process email queue
        </button>
        <button
          type="button"
          disabled={busy || Boolean(convertedOrganizationId)}
          onClick={() => {
            if (
              !window.confirm(
                "Approve this pilot? This creates an organization and invites the employer."
              )
            ) {
              return;
            }
            void run("approve");
          }}
          className="h-9 rounded-[8px] border border-[rgba(103,217,160,0.35)] px-3 text-[12.5px] text-[#67D9A0] disabled:opacity-40"
        >
          {convertedOrganizationId ? "Workspace linked" : "Approve pilot"}
        </button>
      </div>
      {message ? <p className="text-[12px] text-[rgba(244,245,247,0.62)]">{message}</p> : null}
    </div>
  );
}
