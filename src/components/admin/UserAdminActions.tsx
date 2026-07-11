"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PLATFORM_ROLES = ["super_admin", "admin", "operator", "reviewer", "support"] as const;

export default function UserAdminActions({
  userId,
  email,
  accountStatus,
  activeRoles,
}: {
  userId: string;
  email: string;
  accountStatus: string;
  activeRoles: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [role, setRole] = useState<string>("admin");

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : "Action failed");
        return;
      }
      setMessage(typeof data.message === "string" ? data.message : "Saved");
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-[13px]">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!window.confirm(`Send password-reset email to ${email}?`)) return;
          void run("send-reset");
        }}
        className="h-9 w-full rounded-[8px] border border-[rgba(255,255,255,0.12)] px-3 text-left text-[rgba(244,245,247,0.85)]"
      >
        Send password-reset email
      </button>

      {accountStatus === "suspended" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run("reactivate")}
          className="h-9 w-full rounded-[8px] border border-[rgba(255,255,255,0.12)] px-3 text-left"
        >
          Reactivate access
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Suspend application access for this user?")) return;
            void run("suspend");
          }}
          className="h-9 w-full rounded-[8px] border border-[rgba(242,107,130,0.35)] px-3 text-left text-[#F26B82]"
        >
          Suspend access
        </button>
      )}

      <div className="rounded-[8px] border border-[rgba(255,255,255,0.1)] p-3">
        <p className="mb-2 text-[12px] text-[rgba(244,245,247,0.5)]">Grant platform role</p>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mb-2 h-9 w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-[#0B0D12] px-2"
        >
          {PLATFORM_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Grant ${role} to ${email}?`)) return;
            void run("grant-role", { role });
          }}
          className="h-9 w-full rounded-[8px] bg-[#F1F2F4] text-[#08090C]"
          style={{ fontWeight: 560 }}
        >
          Grant role
        </button>
      </div>

      {activeRoles.length > 0 ? (
        <div className="space-y-2">
          {activeRoles.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`Revoke ${r} from ${email}?`)) return;
                void run("revoke-role", { role: r });
              }}
              className="h-9 w-full rounded-[8px] border border-[rgba(255,255,255,0.12)] px-3 text-left capitalize"
            >
              Revoke {r.replace("_", " ")}
            </button>
          ))}
        </div>
      ) : null}

      {message ? <p className="text-[12px] text-[rgba(244,245,247,0.62)]">{message}</p> : null}
    </div>
  );
}
