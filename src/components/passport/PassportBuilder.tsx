"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, ChevronDown, GitFork, Loader2, RotateCcw } from "lucide-react";
import PassportView from "./PassportView";
import { IMPORTS_CHANGED_EVENT } from "./ImportJobsPanel";
import { Button } from "@/components/ui/Button";
import { StatusTag } from "@/components/ui/StatusTag";
import "./passport.css";
import { ruleSummary, suggestRoles } from "@/lib/passport/rules";
import { SKIP_REASON_LABEL, shortSha } from "@/lib/passport/record-states";
import type { ScopePreview } from "@/lib/passport/github/extract";
import type { ExtractionResult } from "@/lib/passport/github/types";
import type { PassportData, PassportProject } from "@/lib/passport/view";

type Repo = { name: string; fullName: string; language: string | null; fork: boolean; archived: boolean; pushedAt: string | null };
type OkPreview = Extract<ScopePreview, { ok: true }>;
type ScopeState =
  | { status: "loading" }
  | { status: "ready"; preview: OkPreview }
  | { status: "error"; message: string; retryable: boolean };
type StartState = { status: "idle" | "starting" | "started" } | { status: "error"; message: string };
type RunState = { status: "queued" | "running" | "done" | "failed"; message?: string; project?: PassportProject | null };

const MAX = 3;
const primaryCls =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--control-solid)] px-5 text-app-body font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)] disabled:opacity-50";

function ScopeCard({
  name,
  scope,
  contribution,
  onContribution,
  onRetry,
}: {
  name: string;
  scope: ScopeState;
  contribution: string;
  onContribution: (v: string) => void;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (scope.status === "loading") {
    return (
      <li className="flex items-center gap-3 px-5 py-4 sm:px-6">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" aria-hidden />
        <span className="text-[15px] font-medium">{name}</span>
        <span className="text-app-meta text-[var(--text-tertiary)]">Resolving revision and file list</span>
      </li>
    );
  }
  if (scope.status === "error") {
    return (
      <li className="px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <AlertCircle className="h-4 w-4 text-[var(--fydell-risk)]" aria-hidden />
          <span className="text-[15px] font-medium">{name}</span>
          <StatusTag tone="risk">Cannot import</StatusTag>
        </div>
        <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{scope.message}</p>
        {scope.retryable ? (
          <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 text-app-meta font-medium underline underline-offset-4">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Check again
          </button>
        ) : null}
      </li>
    );
  }
  const p = scope.preview;
  const skipped = Object.values(p.skipReasons).reduce((a, b) => a + b, 0);
  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[15px] font-medium">{p.repository.fullName}</span>
        <span className="font-mono text-app-meta text-[var(--text-tertiary)]" title={p.commitSha}>
          {p.revisionRef} @ {shortSha(p.commitSha)}
        </span>
        {p.repository.fork ? (
          <StatusTag tone="changed">
            <GitFork className="mr-1 h-3 w-3" aria-hidden /> Fork
          </StatusTag>
        ) : null}
      </div>
      <p className="mt-1.5 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
        Will read <strong className="font-medium text-[var(--text-primary)]">{p.selectedFiles.length}</strong> of {p.totalFiles} files
        {skipped ? `; ${skipped} excluded` : ""}. Code is read at this commit and never run.
      </p>
      <p className="mt-1 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
        Access: public read only, with no GitHub sign-in or token. Result: a new report for this revision in your work record, private until you share it, with a work receipt.
      </p>
      {p.notices.map((n) => (
        <p key={n} className="mt-1 text-app-meta text-[var(--fydell-changed)]">
          {n}
        </p>
      ))}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="mt-2 inline-flex items-center gap-1 text-app-meta font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        {open ? "Hide" : "Show"} included and excluded files
      </button>
      {open ? (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3">
            <p className="text-app-caption font-medium text-[var(--text-secondary)]">Included ({p.selectedFiles.length})</p>
            <ul className="mt-1.5 max-h-48 overflow-auto font-mono text-app-caption leading-[1.7] text-[var(--text-primary)]">
              {p.selectedFiles.map((f) => (
                <li key={f.path} className="truncate" title={f.path}>
                  {f.path}
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 rounded-[8px] border border-[var(--border-subtle)] p-3">
            <p className="text-app-caption font-medium text-[var(--text-secondary)]">Excluded by reason</p>
            {skipped === 0 ? (
              <p className="mt-1.5 text-app-caption text-[var(--text-tertiary)]">Nothing excluded.</p>
            ) : (
              <ul className="mt-1.5 space-y-0.5 text-app-caption text-[var(--text-primary)]">
                {Object.entries(p.skipReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, n]) => (
                    <li key={reason} className="flex justify-between gap-3">
                      <span>{SKIP_REASON_LABEL[reason] ?? reason}</span>
                      <span className="font-mono text-[var(--text-tertiary)]">{n}</span>
                    </li>
                  ))}
              </ul>
            )}
            <p className="mt-2 text-app-caption leading-[1.5] text-[var(--text-tertiary)]">
              Limits: {p.limits.maxFilesPerRepository} files, {Math.round(p.limits.maxBytesPerFile / 1024)} KB per file,{" "}
              {Math.round(p.limits.maxBytesPerRepository / 1024 / 1024)} MB total.
            </p>
          </div>
        </div>
      ) : null}
      <label className="mt-3 block">
        <span className="text-app-meta font-medium">Your contribution (optional)</span>
        <textarea
          value={contribution}
          onChange={(e) => onContribution(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="What did you build or change here? Shown as your statement, separate from the findings."
          className="platform-input mt-1 text-app-body"
        />
      </label>
    </li>
  );
}

export default function PassportBuilder({
  signedIn,
  initialLogin = "",
  initialRepos = [],
  showPreview = true,
  onImportsStarted,
}: {
  signedIn: boolean;
  initialLogin?: string;
  initialRepos?: string[];
  showPreview?: boolean;
  /** Called after imports are accepted by the server. */
  onImportsStarted?: (repositories: string[], githubLogin: string | null) => void;
}) {
  const [input, setInput] = useState(initialLogin);
  const [login, setLogin] = useState<string | null>(initialLogin || null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<string[]>(initialRepos.slice(0, MAX));
  const [contributions, setContributions] = useState<Record<string, string>>({});
  const [scopes, setScopes] = useState<Record<string, ScopeState>>({});
  const [start, setStart] = useState<StartState>({ status: "idle" });
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [phase, setPhase] = useState<"input" | "select" | "scope" | "run" | "done">(initialRepos.length ? (signedIn ? "scope" : "run") : "input");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadScope = useCallback(async (fullName: string) => {
    setScopes((s) => ({ ...s, [fullName]: { status: "loading" } }));
    try {
      const res = await fetch("/api/passport/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: fullName, preview: true }),
      });
      const data = (await res.json()) as { preview?: OkPreview; error?: string; code?: string };
      if (!res.ok || !data.preview) {
        setScopes((s) => ({
          ...s,
          [fullName]: { status: "error", message: data.error ?? "This repository could not be checked.", retryable: res.status === 503 || res.status === 429 },
        }));
        return;
      }
      const preview = data.preview;
      setScopes((s) => ({ ...s, [fullName]: { status: "ready", preview } }));
    } catch {
      setScopes((s) => ({ ...s, [fullName]: { status: "error", message: "Fydell could not be reached. Check your connection.", retryable: true } }));
    }
  }, []);

  const reviewScope = useCallback(
    (names: string[]) => {
      setPhase("scope");
      setStart({ status: "idle" });
      setScopes({});
      for (const n of names) void loadScope(n);
    },
    [loadScope],
  );

  // Signed-out preview: analysis runs inline and nothing is saved.
  const runPreview = useCallback(async (fullName: string) => {
    setRuns((r) => ({ ...r, [fullName]: { status: "running" } }));
    try {
      const res = await fetch("/api/passport/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: fullName }),
      });
      const data = (await res.json()) as { result?: ExtractionResult; project?: PassportProject | null; error?: string };
      const result = data.result;
      if (!res.ok || !result || result.status === "failed") {
        setRuns((r) => ({ ...r, [fullName]: { status: "failed", message: result?.error?.message ?? data.error ?? "The analysis could not be completed." } }));
        return;
      }
      setRuns((r) => ({
        ...r,
        [fullName]: { status: "done", project: data.project ?? null, message: result.status === "partial" ? "Partial: some files could not be retrieved." : undefined },
      }));
    } catch {
      setRuns((r) => ({ ...r, [fullName]: { status: "failed", message: "Fydell could not be reached. Check your connection." } }));
    }
  }, []);

  const runAllPreviews = useCallback(
    async (names: string[]) => {
      setPhase("run");
      setRuns(Object.fromEntries(names.map((n) => [n, { status: "queued" } as RunState])));
      for (const name of names) await runPreview(name);
      setPhase("done");
    },
    [runPreview],
  );

  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || initialRepos.length === 0) return;
    resumed.current = true;
    const names = initialRepos.slice(0, MAX);
    const timer = setTimeout(() => (signedIn ? reviewScope(names) : void runAllPreviews(names)), 0);
    return () => clearTimeout(timer);
  }, [initialRepos, signedIn, reviewScope, runAllPreviews]);

  async function findRepositories(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/passport/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, preview: true }),
      });
      const data = (await res.json()) as { kind?: string; user?: string; repositories?: Repo[]; preview?: OkPreview; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.kind === "profile") {
        setLogin(data.user ?? null);
        const list = (data.repositories ?? []).filter((r) => !r.archived);
        setRepos(list);
        setSelected(list.filter((r) => !r.fork).slice(0, 1).map((r) => r.fullName));
        setPhase("select");
      } else if (data.kind === "preview" && data.preview) {
        const full = data.preview.repository.fullName;
        // A repository's owner may be an organization or someone else; it is not the engineer's account.
        setLogin(null);
        setSelected([full]);
        if (signedIn) {
          setPhase("scope");
          setScopes({ [full]: { status: "ready", preview: data.preview } });
        } else {
          await runAllPreviews([full]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const ready = selected.filter((n) => scopes[n]?.status === "ready");
  const anyLoading = selected.some((n) => scopes[n]?.status === "loading");

  async function startImports() {
    if (start.status === "starting" || ready.length === 0) return;
    setStart({ status: "starting" });
    const failures: string[] = [];
    const started: string[] = [];
    for (const name of ready) {
      const scope = scopes[name];
      if (scope?.status !== "ready") continue;
      try {
        const res = await fetch("/api/passport/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repository: scope.preview.repository.fullName,
            commitSha: scope.preview.commitSha,
            revisionRef: scope.preview.revisionRef,
            contribution: contributions[name] ?? "",
            githubLogin: login,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) failures.push(`${name}: ${data.error ?? "could not start"}`);
        else started.push(scope.preview.repository.fullName);
      } catch {
        failures.push(`${name}: Fydell could not be reached`);
      }
    }
    if (started.length) {
      window.dispatchEvent(new Event(IMPORTS_CHANGED_EVENT));
      onImportsStarted?.(started, login);
    }
    if (failures.length) setStart({ status: "error", message: failures.join(". ") });
    else {
      setStart({ status: "started" });
      setPhase("input");
      setInput("");
      setScopes({});
    }
  }

  const preview = useMemo<PassportData | null>(() => {
    const projects = Object.values(runs).flatMap((r) => (r.project ? [r.project] : []));
    if (!projects.length) return null;
    const evidence = projects.flatMap((p) => p.evidence);
    const roleSuggestions = suggestRoles(evidence);
    return {
      displayName: login ?? "",
      headline: "",
      githubLogin: login,
      projects,
      roleSuggestions,
      capabilities: ruleSummary(evidence, roleSuggestions, "Preview: grouped by rules from validated findings. Nothing has been saved."),
      updatedAt: null,
    };
  }, [runs, login]);

  const resumeHref = `/signup?as=developer&next=${encodeURIComponent(`/app/candidate/work-record?github=${login ?? ""}&repos=${selected.join(",")}`)}`;

  return (
    <div className="space-y-6">
      {phase === "input" || phase === "select" ? (
        <form onSubmit={findRepositories} className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 sm:p-6">
          <label htmlFor="github-input" className="text-app-body font-medium">
            GitHub username or public repository
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="github-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="github.com/your-username or owner/repository"
              autoComplete="off"
              spellCheck={false}
              className="platform-input h-11 flex-1 text-[15px]"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "github-error" : "github-help"}
            />
            <button type="submit" disabled={loading || !input.trim()} className={`${primaryCls} h-11`}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {loading ? "Looking up" : "Find repositories"}
            </button>
          </div>
          {error ? (
            <p id="github-error" role="alert" className="mt-2 flex items-center gap-1.5 text-app-meta text-[var(--fydell-risk)]">
              <AlertCircle className="h-4 w-4" aria-hidden /> {error}
            </p>
          ) : (
            <p id="github-help" className="mt-2 text-app-meta text-[var(--text-tertiary)]">
              Public repositories only. No GitHub sign-in or token is needed. Fydell reads code at a pinned commit and never runs it.
            </p>
          )}
          {start.status === "started" ? (
            <p role="status" className="mt-3 flex items-center gap-1.5 text-app-meta text-[var(--fydell-good)]">
              <Check className="h-4 w-4" aria-hidden /> Import started. Progress is shown under Imports.
            </p>
          ) : null}
        </form>
      ) : null}

      {phase === "select" ? (
        <section aria-labelledby="select-heading" className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
            <h2 id="select-heading" className="text-app-body font-medium">
              Choose up to {MAX} repositories
            </h2>
            <p className="text-app-meta text-[var(--text-tertiary)]">
              {repos.length} public repositories for {login}
            </p>
          </div>
          {repos.length === 0 ? (
            <p className="px-6 py-6 text-app-body text-[var(--text-secondary)]">This account has no public, active repositories to analyze.</p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-[var(--border-subtle)] overflow-auto">
              {repos.map((r) => {
                const checked = selected.includes(r.fullName);
                const disabled = !checked && selected.length >= MAX;
                return (
                  <li key={r.fullName} className="px-5 py-3 sm:px-6">
                    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => setSelected((s) => (checked ? s.filter((x) => x !== r.fullName) : [...s, r.fullName]))}
                        className="mt-1 h-4 w-4 accent-[var(--fydell-brand-blue)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[15px] font-medium" title={r.fullName}>
                            {r.name}
                          </span>
                          {r.fork ? (
                            <StatusTag tone="changed">
                              <GitFork className="mr-1 h-3 w-3" aria-hidden /> Fork
                            </StatusTag>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-app-meta text-[var(--text-tertiary)]">
                          {r.language ?? "Language unknown"}
                          {r.pushedAt ? ` · updated ${new Date(r.pushedAt).toLocaleDateString()}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4 sm:px-6">
            <p className="text-app-meta text-[var(--text-tertiary)]">Start with the project that best shows your work. Forks are labeled in the report.</p>
            <button
              type="button"
              onClick={() => (signedIn ? reviewScope(selected) : void runAllPreviews(selected))}
              disabled={selected.length === 0}
              className={primaryCls}
            >
              {signedIn ? "Review scope" : "Preview findings"}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "scope" ? (
        <section aria-labelledby="scope-heading" className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
            <h2 id="scope-heading" className="text-app-body font-medium">
              Confirm what will be analyzed
            </h2>
            <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">
              Each import is pinned to the commit shown. Later pushes do not change this report; you can analyze a new revision any time.
            </p>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]" aria-live="polite">
            {selected.map((name) => (
              <ScopeCard
                key={name}
                name={name}
                scope={scopes[name] ?? { status: "loading" }}
                contribution={contributions[name] ?? ""}
                onContribution={(v) => setContributions((c) => ({ ...c, [name]: v }))}
                onRetry={() => void loadScope(name)}
              />
            ))}
          </ul>
          {start.status === "error" ? (
            <p role="alert" className="border-t border-[var(--border-subtle)] px-5 py-3 text-app-meta text-[var(--fydell-risk)] sm:px-6">
              {start.message}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4 sm:px-6">
            <Button variant="quiet" size="md" onClick={() => setPhase(repos.length ? "select" : "input")}>
              Back
            </Button>
            <Button variant="primary" shape="pill" size="cta" loading={start.status === "starting"} disabled={ready.length === 0 || anyLoading} onClick={() => void startImports()}>
              Import {ready.length || ""} {ready.length === 1 ? "repository" : "repositories"}
            </Button>
          </div>
        </section>
      ) : null}

      {phase === "run" || phase === "done" ? (
        <section aria-label="Preview progress" className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {Object.entries(runs).map(([name, run]) => (
              <li key={name} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
                <span aria-hidden className="flex h-5 w-5 items-center justify-center">
                  {run.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-[var(--fydell-brand-blue)]" /> : null}
                  {run.status === "done" ? <Check className="h-4 w-4 text-[var(--fydell-good)]" /> : null}
                  {run.status === "failed" ? <AlertCircle className="h-4 w-4 text-[var(--fydell-risk)]" /> : null}
                  {run.status === "queued" ? <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" /> : null}
                </span>
                <span className="text-[15px] font-medium">{name}</span>
                <span className="text-app-meta text-[var(--text-tertiary)]" aria-live="polite">
                  {run.status === "queued" && "Waiting"}
                  {run.status === "running" && "Reading files from GitHub and checking citations"}
                  {run.status === "done" && (run.message ?? `${run.project?.evidence.length ?? 0} findings`)}
                  {run.status === "failed" && run.message}
                </span>
                {run.status === "failed" ? (
                  <button type="button" onClick={() => void runPreview(name)} className="ml-auto inline-flex items-center gap-1.5 text-app-meta font-medium underline underline-offset-4">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Try again
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {phase === "done" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => {
                  setPhase(repos.length ? "select" : "input");
                  setRuns({});
                }}
                className="text-app-body font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
              >
                Change repositories
              </button>
              {preview ? (
                <Link href={resumeHref} className={primaryCls}>
                  Save to my Passport
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {preview && showPreview ? <PassportView passport={preview} mode="preview" /> : null}
    </div>
  );
}
