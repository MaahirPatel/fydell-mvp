"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROVIDER_LABELS, type ConnectedAccount, type ConnectedAccountProvider } from "@/lib/profile/types";

const inputClass =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-app-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] focus:outline-none";

function formatDate(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Connected-account registry UI.
 *
 * GitHub "connect" today = register the username after the passport builder
 * analyzes the engineer's repos (paste flow). OAuth is a planned follow-up;
 * the UI says so plainly instead of implying a deeper integration.
 */
export default function ConnectedAccounts({ initial }: { initial: ConnectedAccount[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initial);
  const [login, setLogin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/profile/accounts");
    const data = (await res.json()) as { accounts?: ConnectedAccount[] };
    if (data.accounts) setAccounts(data.accounts);
    router.refresh();
  }

  async function connectGithub(e: React.FormEvent) {
    e.preventDefault();
    const label = login.trim();
    if (!label || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "github", label, meta: { login: label } }),
      });
      const data = (await res.json()) as { account?: ConnectedAccount; error?: string };
      if (!res.ok || !data.account) {
        setError(data.error ?? "Could not connect GitHub.");
      } else {
        setLogin("");
        await refresh();
      }
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(provider: ConnectedAccountProvider, label?: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ provider });
      if (label) params.set("label", label);
      const res = await fetch(`/api/profile/accounts?${params.toString()}`, { method: "DELETE" });
      const data = (await res.json()) as { removed?: boolean };
      if (!res.ok || !data.removed) {
        setError("Could not disconnect the account.");
      } else {
        await refresh();
      }
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {accounts.length === 0 ? (
        <p className="text-app-body leading-[1.6] text-[var(--text-secondary)]">
          No accounts connected yet. Connecting GitHub lets employers see repository evidence on your profile.
        </p>
      ) : null}

      {accounts.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between gap-4 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-app-body font-medium text-[var(--text-primary)]">
              {PROVIDER_LABELS[a.provider]}
              <span className="ml-2 font-normal text-[var(--text-secondary)]">{a.label}</span>
            </p>
            <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">
              Connected {formatDate(a.connectedAt)}
              {" · "}last synced {formatDate(a.lastSyncedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void disconnect(a.provider, a.label)}
            disabled={busy}
            className="shrink-0 rounded-[8px] border border-[var(--border-default)] px-3 py-1.5 text-app-meta font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      ))}

      {accounts.some((a) => a.provider === "github") ? null : (
      <form onSubmit={connectGithub}>
        <p className="text-[14px] font-medium text-[var(--text-primary)]">Connect GitHub</p>
        <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">Your username. Fydell reads only the public repositories you choose.</p>
        <div className="mt-2.5 flex gap-2">
          <input
            className={inputClass}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="octocat"
            maxLength={39}
            aria-label="GitHub username"
          />
          <button
            type="submit"
            disabled={busy || !login.trim()}
            className="shrink-0 rounded-[8px] bg-[var(--control-solid)] px-4 py-2 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,0.12)] hover:bg-[var(--control-solid-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--accent-line)] disabled:cursor-not-allowed disabled:bg-[var(--surface-deep)] disabled:text-[var(--text-disabled)] disabled:shadow-none"
          >
            Connect
          </button>
        </div>
      </form>
      )}
      {error ? <p className="text-app-meta text-[var(--status-attention-ink)]">{error}</p> : null}
    </div>
  );
}
