"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input, Textarea } from "@/components/ui/Field";
import { send } from "./send";

type Project = { key: string; title: string; kind: "github" | "upload" | "manual" | "work_sample"; detail: string; private: boolean; confirmed: boolean };
type Draft = { contactName: string; repos: string[]; links: string; note: string };

const draftKey = (slug: string) => `fydell:apply:${slug}`;

function readDraft(slug: string): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    return {
      contactName: typeof d.contactName === "string" ? d.contactName : "",
      repos: Array.isArray(d.repos) ? d.repos.filter((r): r is string => typeof r === "string") : [],
      links: typeof d.links === "string" ? d.links : "",
      note: typeof d.note === "string" ? d.note : "",
    };
  } catch {
    return null;
  }
}

/**
 * The applicant chooses exactly what this team will see. The draft is kept in
 * this tab's session storage so a sign-in round trip doesn't lose it.
 */
export default function ApplyForm({
  slug,
  email,
  defaultName,
  organizationName,
  projects,
}: {
  slug: string;
  email: string;
  defaultName: string;
  organizationName: string;
  projects: Project[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ contactName: defaultName, repos: [], links: "", note: "" });
  const [restored, setRestored] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = readDraft(slug);
    if (saved) {
      const known = new Set(projects.filter((p) => !p.private).map((p) => p.key));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- session storage is only readable after mount
      setDraft({ ...saved, contactName: saved.contactName || defaultName, repos: saved.repos.filter((r) => known.has(r)) });
    }
    setRestored(true);
  }, [slug, projects, defaultName]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(draftKey(slug), JSON.stringify(draft));
    } catch {
      // Storage can be unavailable (private mode); the form still works.
    }
  }, [draft, restored, slug]);

  const toggle = (repo: string) =>
    setDraft((d) => ({ ...d, repos: d.repos.includes(repo) ? d.repos.filter((r) => r !== repo) : [...d.repos, repo] }));
  const move = (repo: string, by: -1 | 1) =>
    setDraft((d) => {
      const i = d.repos.indexOf(repo);
      const j = i + by;
      if (i < 0 || j < 0 || j >= d.repos.length) return d;
      const next = [...d.repos];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, repos: next };
    });
  const byKey = new Map(projects.map((p) => [p.key, p]));
  const unconfirmed = draft.repos.filter((k) => byKey.get(k) && !byKey.get(k)?.confirmed && byKey.get(k)?.kind !== "work_sample").length;
  const links = draft.links.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasContent = draft.repos.length > 0 || links.length > 0 || draft.note.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await send<{ id: string }>(`/api/jobs/${slug}/apply`, "POST", {
      contactName: draft.contactName,
      repos: draft.repos,
      links,
      note: draft.note,
      confirmShare: confirm,
    });
    setBusy(false);
    if ("error" in result) {
      if (result.data.existingId) {
        router.push(`/app/candidate/applications/${result.data.existingId}?already=1`);
        return;
      }
      return setError(result.error);
    }
    try {
      window.sessionStorage.removeItem(draftKey(slug));
    } catch {
      // Nothing to clean up.
    }
    router.push(`/app/candidate/applications/${result.data.id}?sent=1`);
  }

  return (
    <form onSubmit={submit} className="grid gap-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="apply-name" help="How the team will address you.">
          <Input id="apply-name" value={draft.contactName} onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))} maxLength={120} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="apply-email" help="From your account. Replies come here.">
          <Input id="apply-email" value={email} readOnly aria-readonly className="text-[var(--text-secondary)]" />
        </Field>
      </div>

      <fieldset>
        <legend className="text-app-meta font-medium text-[var(--text-primary)]">Projects to share</legend>
        {projects.length === 0 ? (
          <p className="mt-2 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
            Your profile has no projects yet. You can still apply with links and a note, or{" "}
            <Link href="/passport/new" className="text-[var(--text-primary)] underline underline-offset-4">add a project</Link> first and come back. Your entries here are kept.
          </p>
        ) : (
          <>
            <p className="mt-1 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
              Each selected project is sent as a fixed version. Later edits or re-imports don&apos;t change what this team sees, and the same version is reused for other applications while it stays unchanged.
            </p>
            <ul className="mt-3 grid gap-2">
              {projects.map((p) => {
                const checked = draft.repos.includes(p.key);
                return (
                  <li key={p.key}>
                    <label
                      className={`flex items-center gap-3 rounded-[8px] border px-3.5 py-3 transition-colors ${
                        p.private
                          ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--surface-raised)] opacity-70"
                          : checked
                            ? "cursor-pointer border-[var(--border-strong)] bg-[var(--surface-selected)]"
                            : "cursor-pointer border-[var(--border-default)] bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={p.private}
                        onChange={() => toggle(p.key)}
                        className="h-4 w-4 shrink-0 accent-[var(--control-solid)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-app-meta font-medium text-[var(--text-primary)]">{p.title}</span>
                        <span className="block text-app-meta text-[var(--text-tertiary)]">
                          {p.detail}
                          {p.private
                            ? " · Private in your profile"
                            : p.kind !== "work_sample" && !p.confirmed
                              ? " · Contribution not confirmed"
                              : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {draft.repos.length > 1 ? (
              <div className="mt-4">
                <p className="text-app-meta font-medium text-[var(--text-primary)]">Order the team sees</p>
                <ol className="mt-2 grid gap-1.5">
                  {draft.repos.map((key, i) => (
                    <li key={key} className="flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] px-3 py-2 text-app-meta">
                      <span className="w-5 text-[var(--text-tertiary)]">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate text-[var(--text-body)]">{byKey.get(key)?.title ?? key}</span>
                      <Button type="button" size="sm" variant="quiet" onClick={() => move(key, -1)} disabled={i === 0} aria-label={`Move ${byKey.get(key)?.title ?? key} up`}>
                        Up
                      </Button>
                      <Button type="button" size="sm" variant="quiet" onClick={() => move(key, 1)} disabled={i === draft.repos.length - 1} aria-label={`Move ${byKey.get(key)?.title ?? key} down`}>
                        Down
                      </Button>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {unconfirmed > 0 ? (
              <p className="mt-3 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
                {unconfirmed === 1 ? "One selected project has" : `${unconfirmed} selected projects have`} no confirmed contribution. The team will see that stated plainly. You can confirm from the project page first; your entries here are kept.
              </p>
            ) : null}
          </>
        )}
      </fieldset>

      <Field label="Links" htmlFor="apply-links" optional help="Up to 5, one per line: a write-up, a pull request, a deployed project.">
        <Textarea id="apply-links" value={draft.links} onChange={(e) => setDraft((d) => ({ ...d, links: e.target.value }))} rows={3} placeholder="https://" />
      </Field>
      <Field label="Note to the team" htmlFor="apply-note" optional help={`${draft.note.length} / 2,000`}>
        <Textarea id="apply-note" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} rows={5} maxLength={2000} placeholder="Which part of your work is most relevant to this role, and why." />
      </Field>

      <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
        <label className="flex items-start gap-3 text-app-meta leading-[1.55] text-[var(--text-body)]">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--control-solid)]" />
          <span>
            Share with {organizationName}: your name and email
            {draft.repos.length === 1 ? ", 1 project version with its statements, findings and excerpts" : draft.repos.length > 1 ? `, ${draft.repos.length} project versions with their statements, findings and excerpts` : ""}
            {links.length > 0 ? `, ${links.length} link${links.length === 1 ? "" : "s"}` : ""}
            {draft.note.trim() ? ", and your note" : ""}. Nothing else from your profile is shared. You can remove a project later, and withdrawing ends their access to all of them.
          </span>
        </label>
      </div>

      <FormError>{error}</FormError>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!confirm || !hasContent || !draft.contactName.trim()}>
          Send application
        </Button>
        {!hasContent ? <p className="text-app-meta text-[var(--text-secondary)]">Include a project, a link or a note.</p> : null}
      </div>
    </form>
  );
}
