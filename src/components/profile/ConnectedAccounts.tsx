"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormError, Input } from "@/components/ui/Field";
import { PROVIDER_LABELS, type ConnectedAccount, type ConnectedAccountProvider } from "@/lib/profile/types";

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const WORK_RECORD = "/app/candidate/work-record";

type Mode = { kind: "view" } | { kind: "switch" } | { kind: "disconnect" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Imported repositories whose owner is this GitHub account. */
function ownedBy(login: string, repositories: readonly string[]): string[] {
  const prefix = `${login.toLowerCase()}/`;
  return repositories.filter((r) => r.toLowerCase().startsWith(prefix));
}

async function lookupAccount(login: string): Promise<{ ok: true; login: string } | { ok: false; error: string }> {
  const res = await fetch("/api/passport/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: login }),
  });
  const data = (await res.json().catch(() => ({}))) as { kind?: string; user?: string; error?: string };
  if (!res.ok || data.kind !== "profile" || !data.user) return { ok: false, error: data.error ?? "That GitHub account could not be found." };
  return { ok: true, login: data.user };
}

/**
 * Connected accounts. GitHub is a username Fydell reads public repositories
 * from; it is not verified. Switching accounts can remove the projects
 * imported from the old account, then opens the repository picker for the new
 * one so the engineer can import and run a new Builder Analysis.
 */
export default function ConnectedAccounts({ initial, repositories }: { initial: ConnectedAccount[]; repositories: readonly string[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initial);
  const [mode, setMode] = useState<Mode>({ kind: "view" });
  const [login, setLogin] = useState("");
  const github = accounts.find((a) => a.provider === "github") ?? null;
  const oldProjects = github ? ownedBy(github.label, repositories) : [];
  const [remove, setRemove] = useState<string[]>(oldProjects);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clean = login.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?github\.com\//i, "").replace(/\/+$/, "");
  const invalid = clean.length > 0 && !LOGIN.test(clean);

  function open(next: Mode) {
    setMode(next);
    setLogin("");
    setRemove(oldProjects);
    setError(null);
  }

  async function refresh() {
    const res = await fetch("/api/profile/accounts");
    const data = (await res.json().catch(() => ({}))) as { accounts?: ConnectedAccount[] };
    if (data.accounts) setAccounts(data.accounts);
    router.refresh();
  }

  async function disconnectGithub(removeRepositories: readonly string[]): Promise<boolean> {
    const res = await fetch("/api/passport/github", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeRepositories }),
    });
    return res.ok;
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!clean || invalid || busy) return;
    if (github && clean.toLowerCase() === github.label.toLowerCase()) {
      setError(`${github.label} is already connected.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const found = await lookupAccount(clean);
      if (found.ok === false) {
        setError(found.error);
        return;
      }
      if ((github || remove.length > 0) && !(await disconnectGithub(remove))) {
        setError(github ? `Could not disconnect ${github.label}. Nothing was changed.` : "Could not remove the projects. Nothing was changed.");
        return;
      }
      const res = await fetch("/api/passport/github", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: found.login }),
      });
      const data = (await res.json().catch(() => ({}))) as { githubLogin?: string; error?: string };
      if (!res.ok || !data.githubLogin) {
        setError(data.error ?? "Could not connect the new account. Try again.");
        await refresh();
        return;
      }
      router.push(`${WORK_RECORD}?github=${encodeURIComponent(data.githubLogin)}&connected=1#add-repository`);
      router.refresh();
      setMode({ kind: "view" });
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(provider: ConnectedAccountProvider, label: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      let ok: boolean;
      if (provider === "github") {
        ok = await disconnectGithub(remove);
      } else {
        const params = new URLSearchParams({ provider, label });
        const res = await fetch(`/api/profile/accounts?${params.toString()}`, { method: "DELETE" });
        ok = res.ok && ((await res.json().catch(() => ({}))) as { removed?: boolean }).removed === true;
      }
      if (!ok) setError("Could not disconnect the account.");
      else {
        setMode({ kind: "view" });
        await refresh();
      }
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const removeChoice =
    repositories.length > 0 ? (
      <fieldset className="mt-3">
        <legend className="text-app-meta font-medium text-[var(--text-primary)]">Remove imported projects</legend>
        <p className="mt-0.5 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
          Tick any project that isn&apos;t yours. It leaves your profile, share links and applications. Reviews employers already recorded are kept.
        </p>
        <ul className="mt-2 space-y-1.5">
          {repositories.map((repo) => (
            <li key={repo}>
              <label className="flex cursor-pointer items-center gap-2.5 text-app-meta text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={remove.includes(repo)}
                  onChange={(e) => setRemove((cur) => (e.target.checked ? [...cur, repo] : cur.filter((r) => r !== repo)))}
                  className="h-4 w-4 shrink-0 accent-[var(--fydell-brand-blue)]"
                />
                <span className="break-all font-mono text-[12.5px]">{repo}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    ) : null;

  return (
    <div className="space-y-4">
      {accounts.length === 0 ? (
        <p className="text-app-body leading-[1.6] text-[var(--text-secondary)]">
          No accounts connected yet. Connecting GitHub lets you pick public repositories to import.
        </p>
      ) : null}

      {accounts.map((a) => (
        <div key={a.id} className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-app-body font-medium text-[var(--text-primary)]">
                {a.provider === "github" ? <Github className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden /> : null}
                {PROVIDER_LABELS[a.provider]}
              </p>
              <p className="mt-0.5 truncate text-app-body text-[var(--text-secondary)]">
                {a.provider === "github" ? (
                  <a href={`https://github.com/${a.label}`} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline hover:underline-offset-4">
                    {a.label}
                  </a>
                ) : (
                  a.label
                )}
                {a.provider === "github" ? <span className="ml-1.5 text-app-meta text-[var(--text-tertiary)]">not verified</span> : null}
              </p>
              {a.connectedAt ? <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">Connected {formatDate(a.connectedAt)}</p> : null}
            </div>
          </div>
          {mode.kind === "view" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.provider === "github" ? (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => open({ kind: "switch" })}>
                  Switch account
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="quiet"
                disabled={busy}
                onClick={() => (a.provider === "github" ? open({ kind: "disconnect" }) : void disconnect(a.provider, a.label))}
              >
                Disconnect
              </Button>
            </div>
          ) : null}
        </div>
      ))}

      {mode.kind === "disconnect" && github ? (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3.5">
          <p className="text-app-body font-medium text-[var(--text-primary)]">Disconnect {github.label}?</p>
          <p className="mt-1 text-app-meta leading-[1.5] text-[var(--text-secondary)]">The GitHub link disappears from your profile and share links.</p>
          {removeChoice}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" loading={busy} onClick={() => void disconnect("github", github.label)}>
              Disconnect
            </Button>
            <Button size="sm" variant="quiet" disabled={busy} onClick={() => open({ kind: "view" })}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {mode.kind === "switch" || !github ? (
        <form onSubmit={connect} className={github ? "rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3.5" : ""}>
          <label htmlFor="connect-github-login" className="block text-[14px] font-medium text-[var(--text-primary)]">
            {github ? "Connect a different GitHub account" : "Connect GitHub"}
          </label>
          <p id="connect-github-help" className="mt-0.5 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
            {invalid
              ? "Use a GitHub username: up to 39 letters, numbers or single hyphens."
              : "Next you pick which public repositories to import. Fydell does not verify the account is yours."}
          </p>
          <div className="mt-2.5 flex gap-2">
            <Input
              id="connect-github-login"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="your-username"
              maxLength={60}
              autoComplete="off"
              spellCheck={false}
              invalid={invalid}
              aria-describedby="connect-github-help"
              autoFocus={mode.kind === "switch"}
            />
            <Button type="submit" size="md" variant="primary" loading={busy} disabled={!clean || invalid}>
              {github ? "Switch" : "Connect"}
            </Button>
          </div>
          {removeChoice}
          {github ? (
            <div className="mt-3">
              <Button size="sm" variant="quiet" disabled={busy} onClick={() => open({ kind: "view" })}>
                Cancel
              </Button>
            </div>
          ) : null}
        </form>
      ) : null}

      {error ? <FormError>{error}</FormError> : null}
    </div>
  );
}
