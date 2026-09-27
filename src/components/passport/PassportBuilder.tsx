"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, GitFork, Loader2, RotateCcw } from "lucide-react";
import PassportView from "./PassportView";
import { ruleSummary, suggestRoles } from "@/lib/passport/rules";
import type { ExtractionResult } from "@/lib/passport/github/types";
import type { PassportData, PassportProject } from "@/lib/passport/view";

type Repo = { name: string; fullName: string; language: string | null; fork: boolean; archived: boolean; pushedAt: string | null };
type RunState = { status: "queued" | "running" | "done" | "failed"; message?: string; project?: PassportProject | null };

const MAX = 3;

export default function PassportBuilder({
  signedIn,
  initialLogin = "",
  initialRepos = [],
  showPreview = true,
}: {
  signedIn: boolean;
  initialLogin?: string;
  initialRepos?: string[];
  showPreview?: boolean;
}) {
  const router = useRouter();
  const [input, setInput] = useState(initialLogin);
  const [login, setLogin] = useState<string | null>(initialLogin || null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<string[]>(initialRepos.slice(0, MAX));
  const [contributions, setContributions] = useState<Record<string, string>>({});
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [savedPassport, setSavedPassport] = useState<PassportData | null>(null);
  const [phase, setPhase] = useState<"input" | "select" | "run" | "done">(initialRepos.length ? "run" : "input");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runOne = useCallback(
    async (fullName: string) => {
      setRuns((r) => ({ ...r, [fullName]: { status: "running" } }));
      try {
        const res = await fetch(signedIn ? "/api/passport/projects" : "/api/passport/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            signedIn
              ? { repository: fullName, contribution: contributions[fullName] ?? "", githubLogin: login }
              : { input: fullName },
          ),
        });
        const data = (await res.json()) as { result?: ExtractionResult; project?: PassportProject | null; passport?: PassportData; error?: string };
        const result = data.result;
        if (!res.ok || !result || result.status === "failed") {
          const message = result?.error?.message ?? data.error ?? "The analysis could not be completed.";
          setRuns((r) => ({ ...r, [fullName]: { status: "failed", message } }));
          return;
        }
        if (data.passport) setSavedPassport(data.passport);
        const project = data.project ?? data.passport?.projects.find((p) => p.repoFullName === result.repository?.fullName) ?? null;
        setRuns((r) => ({
          ...r,
          [fullName]: {
            status: "done",
            project: project ? { ...project, contributionStatement: contributions[fullName] ?? project.contributionStatement } : null,
            message: result.status === "partial" ? "Partial: some files could not be retrieved." : undefined,
          },
        }));
      } catch {
        setRuns((r) => ({ ...r, [fullName]: { status: "failed", message: "Fydell could not be reached. Check your connection." } }));
      }
    },
    [signedIn, contributions, login],
  );

  const runAll = useCallback(
    async (names: string[]) => {
      setPhase("run");
      setRuns(Object.fromEntries(names.map((n) => [n, { status: "queued" } as RunState])));
      for (const name of names) await runOne(name);
      setPhase("done");
      if (signedIn) router.refresh();
    },
    [runOne, signedIn, router],
  );

  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || initialRepos.length === 0) return;
    const timer = setTimeout(() => {
      resumed.current = true;
      void runAll(initialRepos.slice(0, MAX));
    }, 0);
    return () => clearTimeout(timer);
  }, [initialRepos, runAll]);

  async function findRepositories(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/passport/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = (await res.json()) as { kind?: string; user?: string; repositories?: Repo[]; result?: ExtractionResult; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      if (data.kind === "profile") {
        setLogin(data.user ?? null);
        const list = (data.repositories ?? []).filter((r) => !r.archived);
        setRepos(list);
        setSelected(list.filter((r) => !r.fork).slice(0, MAX).map((r) => r.fullName));
        setPhase("select");
      } else if (data.kind === "repository" && data.result?.repository) {
        const full = data.result.repository.fullName;
        setLogin(full.split("/")[0]);
        setSelected([full]);
        await runAll([full]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const preview = useMemo<PassportData | null>(() => {
    if (signedIn && savedPassport) return savedPassport;
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
      capabilities: ruleSummary(evidence, roleSuggestions, "Preview: built by rules from verified findings. Saved passports can add an AI interpretation."),
      updatedAt: null,
    };
  }, [runs, signedIn, savedPassport, login]);

  const resumeHref = `/signup?as=developer&next=${encodeURIComponent(
    `/app/candidate/passport?github=${login ?? ""}&repos=${selected.join(",")}`,
  )}`;

  return (
    <div className="space-y-8">
      {phase === "input" || phase === "select" ? (
        <form onSubmit={findRepositories} className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-2)] sm:p-6">
          <label htmlFor="github-input" className="text-[14px] font-medium">
            GitHub profile or public repository
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="github-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="github.com/your-username"
              autoComplete="off"
              spellCheck={false}
              className="platform-input h-11 flex-1 font-mono text-[14px]"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "github-error" : "github-help"}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--control-solid)] px-5 text-[14.5px] font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {loading ? "Looking up" : "Find repositories"}
            </button>
          </div>
          {error ? (
            <p id="github-error" role="alert" className="mt-2 flex items-center gap-1.5 text-[13px] text-[var(--evidence-counter)]">
              <AlertCircle className="h-4 w-4" aria-hidden /> {error}
            </p>
          ) : (
            <p id="github-help" className="mt-2 text-[12.5px] text-[var(--text-tertiary)]">
              Public repositories only. Fydell reads code at a pinned commit and never runs it.
            </p>
          )}
        </form>
      ) : null}

      {phase === "select" ? (
        <section aria-labelledby="select-heading" className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-2)]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
            <h2 id="select-heading" className="text-[16px] font-medium">Choose up to {MAX} repositories</h2>
            <p className="text-[12.5px] text-[var(--text-tertiary)]">{repos.length} public repositories for {login}</p>
          </div>
          {repos.length === 0 ? (
            <p className="px-6 py-6 text-[14px] text-[var(--text-secondary)]">This account has no public, active repositories to analyze.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
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
                        className="mt-1 h-4 w-4 accent-[var(--brand-teal)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[13.5px] font-medium">{r.name}</span>
                          {r.fork ? (
                            <span className="badge badge-attention inline-flex gap-1"><GitFork className="h-3 w-3" aria-hidden /> Fork</span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] text-[var(--text-tertiary)]">
                          {r.language ?? "Language unknown"}
                          {r.pushedAt ? ` · updated ${new Date(r.pushedAt).toLocaleDateString()}` : ""}
                        </span>
                      </span>
                    </label>
                    {checked ? (
                      <textarea
                        value={contributions[r.fullName] ?? ""}
                        onChange={(e) => setContributions((c) => ({ ...c, [r.fullName]: e.target.value }))}
                        maxLength={1000}
                        rows={2}
                        placeholder="Optional: what did you build in this project? This is shown as your statement, separate from the evidence."
                        aria-label={`Your contribution to ${r.name}`}
                        className="platform-input mt-2 text-[13.5px]"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4 sm:px-6">
            <p className="text-[12.5px] text-[var(--text-tertiary)]">Forks may contain other people&apos;s work; findings will say so.</p>
            <button
              type="button"
              onClick={() => void runAll(selected)}
              disabled={selected.length === 0}
              className="inline-flex h-10 items-center rounded-full bg-[var(--control-solid)] px-5 text-[14px] font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)] disabled:opacity-50"
            >
              Build passport from {selected.length} repositor{selected.length === 1 ? "y" : "ies"}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "run" || phase === "done" ? (
        <section aria-label="Analysis progress" className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-2)]">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {Object.entries(runs).map(([name, run]) => (
              <li key={name} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6">
                <span aria-hidden className="flex h-5 w-5 items-center justify-center">
                  {run.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-teal)]" /> : null}
                  {run.status === "done" ? <Check className="h-4 w-4 text-[var(--evidence-support)]" /> : null}
                  {run.status === "failed" ? <AlertCircle className="h-4 w-4 text-[var(--evidence-counter)]" /> : null}
                  {run.status === "queued" ? <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" /> : null}
                </span>
                <span className="font-mono text-[13.5px]">{name}</span>
                <span className="text-[12.5px] text-[var(--text-tertiary)]" aria-live="polite">
                  {run.status === "queued" && "Waiting"}
                  {run.status === "running" && "Reading files from GitHub and checking citations"}
                  {run.status === "done" && (run.message ?? `${run.project?.evidence.length ?? 0} verified findings`)}
                  {run.status === "failed" && run.message}
                </span>
                {run.status === "failed" ? (
                  <button
                    type="button"
                    onClick={() => void runOne(name)}
                    className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)] underline underline-offset-4"
                  >
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
                className="text-[13.5px] font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
              >
                Change repositories
              </button>
              {signedIn ? (
                <Link href="/app/candidate/passport" className="inline-flex h-10 items-center rounded-full bg-[var(--control-solid)] px-5 text-[14px] font-medium text-[var(--control-solid-ink)]">
                  Saved · manage sharing
                </Link>
              ) : preview ? (
                <Link href={resumeHref} className="inline-flex h-10 items-center rounded-full bg-[var(--control-solid)] px-5 text-[14px] font-medium text-[var(--control-solid-ink)]">
                  Save your passport
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {preview && showPreview ? <PassportView passport={preview} mode={signedIn ? "owner" : "preview"} /> : null}
    </div>
  );
}
