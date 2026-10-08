"use client";

import { useState } from "react";
import { Check, Copy, Eye, Link2 } from "lucide-react";
import type { ShareField, VersionPolicy } from "@/lib/passport/view";
import { Button } from "@/components/ui/Button";

type Share = {
  id: string;
  label: string;
  fields: ShareField[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessedAt: string | null;
  versionPolicy: VersionPolicy;
  repos: string[] | null;
};

/** `title` is set for manual projects, which have no analyzed version. */
type ShareProject = { repo: string; commit: string; findings: number; title?: string; confirmed: boolean };

const FIELD_LABEL: Record<ShareField, string> = {
  projects: "Projects, contribution context and decisions",
  evidence: "Source-linked findings and your notes on them",
  roles: "Role suggestions and gaps",
  capabilities: "Demonstrated-in-code summary",
};

const EXPIRY_OPTIONS = [
  { value: "", label: "Until I revoke it" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function expiryFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function shareStatus(s: Share): "active" | "revoked" | "expired" {
  if (s.revokedAt) return "revoked";
  if (s.expiresAt && Date.parse(s.expiresAt) <= Date.now()) return "expired";
  return "active";
}

export default function SharePanel({ initialShares, projects }: { initialShares: Share[]; projects: ShareProject[] }) {
  const [shares, setShares] = useState(initialShares);
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<ShareField[]>(["projects", "evidence", "roles", "capabilities"]);
  // Tracks what the engineer unticked, so projects added or made shareable
  // after the page loaded are included without a reload.
  const [excluded, setExcluded] = useState<string[]>([]);
  const repos = projects.filter((p) => p.confirmed).map((p) => p.repo).filter((r) => !excluded.includes(r));
  const [policy, setPolicy] = useState<VersionPolicy>("pinned");
  const [expiryDays, setExpiryDays] = useState<string>("");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const previewHref = `/app/candidate/work-record/preview?${new URLSearchParams({
    fields: fields.join(","),
    repos: repos.join(","),
    policy,
    ...(label ? { label } : {}),
  }).toString()}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (repos.length === 0) {
      return setError(projects.some((p) => p.confirmed) ? "Choose at least one project to include." : "Confirm your contribution on at least one project before sharing it.");
    }
    setBusy(true);
    setError(null);
    const expiresAt = expiryDays ? expiryFromNow(Number(expiryDays)) : undefined;
    try {
      const res = await fetch("/api/passport/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, fields, repos, versionPolicy: policy, expiresAt }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; shares?: Share[]; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not create the link. Your choices are kept; try again.");
        return;
      }
      setCreated(data.url);
      setCopied(false);
      setShares(data.shares ?? shares);
      setLabel("");
    } catch {
      setError("Fydell could not be reached. Your choices are kept; try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setRevoking(true);
    setError(null);
    try {
      const res = await fetch(`/api/passport/shares/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { shares?: Share[]; error?: string };
      if (!res.ok) return setError(data.error ?? "Could not revoke the link. Try again.");
      setShares(data.shares ?? shares);
      setConfirming(null);
    } catch {
      setError("Fydell could not be reached. The link is still active; try again.");
    } finally {
      setRevoking(false);
    }
  }

  const toggleRepo = (repo: string) => setExcluded((cur) => (cur.includes(repo) ? cur.filter((r) => r !== repo) : [...cur, repo]));

  return (
    <section id="share" aria-labelledby="sharing-heading" className="scroll-mt-20 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <h2 id="sharing-heading" className="text-[15px] font-semibold tracking-[-0.01em]">Sharing</h2>
        <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">Private until you create a link. Revoke it any time.</p>
      </div>
      <form onSubmit={create} className="space-y-4 px-4 py-4">
        <div>
          <label htmlFor="share-label" className="text-app-meta font-medium">Who is this link for?</label>
          <input id="share-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="e.g. Platform team, backend role" className="platform-input mt-1.5" />
        </div>

        <fieldset>
          <legend className="text-app-meta font-medium">Projects</legend>
          <div className="mt-1.5 grid gap-1.5">
            {projects.map((p) => (
              <label key={p.repo} className="flex items-start gap-2 text-app-body">
                <input
                  type="checkbox"
                  checked={repos.includes(p.repo)}
                  disabled={!p.confirmed}
                  aria-describedby={p.confirmed ? undefined : `share-unconfirmed-${p.repo}`}
                  onChange={() => toggleRepo(p.repo)}
                  className="mt-1 h-4 w-4 accent-[var(--accent)] disabled:cursor-not-allowed"
                />
                <span className="min-w-0">
                  {p.title ? (
                    <>
                      <span className="block truncate text-[13.5px] text-[var(--text-primary)]">{p.title}</span>
                      <span className="block text-app-meta text-[var(--text-tertiary)]">Your description, no source analyzed</span>
                    </>
                  ) : (
                    <>
                      <span className="block truncate font-mono text-[13px] text-[var(--text-primary)]">{p.repo}</span>
                      <span className="block text-app-meta text-[var(--text-tertiary)]">
                        {p.findings} finding{p.findings === 1 ? "" : "s"} · version {p.commit}
                      </span>
                    </>
                  )}
                  {p.confirmed ? null : (
                    <span id={`share-unconfirmed-${p.repo}`} className="block text-app-meta text-[var(--text-secondary)]">
                      Draft, not shared. Confirm your contribution on this project to include it.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-app-meta font-medium">Include</legend>
          <div className="mt-1.5 grid gap-1.5">
            {(Object.keys(FIELD_LABEL) as ShareField[]).map((f) => (
              <label key={f} className="flex items-center gap-2 text-app-body">
                <input
                  type="checkbox"
                  checked={fields.includes(f)}
                  disabled={f === "projects"}
                  onChange={() => setFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                {FIELD_LABEL[f]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-app-meta font-medium">When you re-analyze a project</legend>
          <div className="mt-1.5 grid gap-1.5">
            <label className="flex items-start gap-2 text-app-body">
              <input type="radio" name="share-policy" checked={policy === "pinned"} onChange={() => setPolicy("pinned")} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
              <span>
                Keep showing these versions
                <span className="block text-app-meta text-[var(--text-tertiary)]">The recipient sees exactly what you see now.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-app-body">
              <input type="radio" name="share-policy" checked={policy === "follow"} onChange={() => setPolicy("follow")} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
              <span>
                Update to the newest analysis
                <span className="block text-app-meta text-[var(--text-tertiary)]">New findings appear on the same link automatically.</span>
              </span>
            </label>
          </div>
        </fieldset>

        <div>
          <label htmlFor="share-expiry" className="text-app-meta font-medium">Link works</label>
          <select id="share-expiry" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value)} className="platform-input mt-1.5">
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-app-meta leading-[1.55] text-[var(--text-secondary)]">
          Anyone with the link sees {repos.length} project{repos.length === 1 ? "" : "s"} and the items above
          {expiryDays ? ` for ${expiryDays} days` : " until you revoke it"}. They never see your email, simulation history, or employer notes.
          Revoking stops the page and any employer review built on it; copies someone already saved cannot be recalled.
        </p>

        {error && !confirming ? <p role="alert" className="text-app-meta text-[var(--evidence-counter)]">{error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            aria-busy={busy || undefined}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-[var(--control-solid)] px-3 text-[13px] font-medium text-[var(--control-solid-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.12)] hover:bg-[var(--control-solid-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--accent-line)] disabled:cursor-wait"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden /> {busy ? "Creating…" : "Create share link"}
          </button>
          <a
            href={previewHref}
            target="_blank"
            rel="noopener"
            aria-disabled={repos.length === 0}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] px-3 text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] ${repos.length === 0 ? "pointer-events-none opacity-50" : ""}`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden /> Preview as recipient
          </a>
        </div>
        {created ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3">
            <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-[var(--accent-ink)]">{created}</code>
            <button
              type="button"
              onClick={() => {
                setCopyFailed(false);
                navigator.clipboard.writeText(created).then(
                  () => setCopied(true),
                  () => setCopyFailed(true),
                );
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-app-meta font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <p role="status" className="w-full text-[13px] text-[var(--accent-ink)]">
              {copyFailed ? "Your browser blocked copying. Select the link above and copy it." : "Copy it now. The full link is shown only once."}
            </p>
          </div>
        ) : null}
      </form>
      {shares.length ? (
        <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {shares.map((s) => {
            const status = shareStatus(s);
            const scope = [
              s.repos ? `${s.repos.length} project${s.repos.length === 1 ? "" : "s"}` : "All projects",
              s.versionPolicy === "pinned" ? "fixed versions" : "updates automatically",
              status === "active" && s.expiresAt ? `expires ${shortDate(s.expiresAt)}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-app-body font-medium">{s.label || "Untitled link"}</span>
                  <span className="block text-app-meta text-[var(--text-tertiary)]">{scope}</span>
                  <span className="block text-app-meta text-[var(--text-tertiary)]">
                    Created {shortDate(s.createdAt)}
                    {s.lastAccessedAt ? ` · last opened ${shortDate(s.lastAccessedAt)}` : " · not opened yet"}
                  </span>
                </span>
                {status !== "active" ? (
                  <span className="text-app-meta text-[var(--text-tertiary)]">{status === "revoked" ? "Revoked" : "Expired"}</span>
                ) : confirming === s.id ? null : (
                  <Button size="sm" variant="quiet" aria-label={`Revoke ${s.label || "untitled link"}`} onClick={() => setConfirming(s.id)}>
                    Revoke
                  </Button>
                )}
                {status === "active" && confirming === s.id ? (
                  <div className="w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3.5 py-3">
                    <p className="text-app-meta leading-[1.5] text-[var(--text-primary)]">
                      Anyone using this link loses access immediately, including employers reviewing it. Copies they already saved cannot be recalled.
                    </p>
                    {error ? <p role="alert" className="mt-1.5 text-app-meta text-[var(--evidence-counter)]">{error}</p> : null}
                    <div className="mt-2.5 flex gap-2">
                      <Button size="sm" variant="destructive" loading={revoking} onClick={() => void revoke(s.id)}>
                        Revoke link
                      </Button>
                      <Button size="sm" variant="quiet" disabled={revoking} onClick={() => setConfirming(null)}>
                        Keep it
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
