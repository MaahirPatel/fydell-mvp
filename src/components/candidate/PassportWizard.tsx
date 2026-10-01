"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Check, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import PassportView from "@/components/passport/PassportView";
import { ruleSummary, suggestRoles } from "@/lib/passport/rules";
import type { ExtractionResult } from "@/lib/passport/github/types";
import type { PassportData, PassportProject } from "@/lib/passport/view";
import type { EngineerProfile } from "@/lib/profile/types";
import e from "./easy.module.css";

type Repo = { name: string; fullName: string; language: string | null; fork: boolean; archived: boolean; pushedAt: string | null };
type RunState = { status: "queued" | "running" | "done" | "failed"; message?: string; project?: PassportProject | null };
type StepKey = "name" | "github" | "pick" | "finish";

const MAX = 3;

const STEP_INFO: Record<StepKey, { label: string; sub: string }> = {
  name: { label: "Your name", sub: "How you appear" },
  github: { label: "Connect GitHub", sub: "Public projects only" },
  pick: { label: "Pick projects", sub: `Up to ${MAX}` },
  finish: { label: "Check and finish", sub: "Private until you share" },
};

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

function ago(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "updated today";
  if (days < 30) return `updated ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `updated ${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `updated ${years} year${years === 1 ? "" : "s"} ago`;
}

/**
 * The passport, built in four plain steps: name, GitHub, projects, finish.
 * Signed-out visitors skip the name step and get a preview they can save by
 * signing up; the sign-up link carries their picks so the run resumes.
 */
export default function PassportWizard({
  signedIn,
  profile,
  initialLogin = "",
  initialRepos = [],
}: {
  signedIn: boolean;
  profile?: EngineerProfile;
  initialLogin?: string;
  initialRepos?: string[];
}) {
  const router = useRouter();
  const steps: StepKey[] = signedIn ? ["name", "github", "pick", "finish"] : ["github", "pick", "finish"];
  const resuming = initialRepos.length > 0;

  const [step, setStep] = useState<StepKey>(resuming ? "finish" : steps[0]);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [role, setRole] = useState(profile?.role ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [input, setInput] = useState(initialLogin);
  const [login, setLogin] = useState<string | null>(initialLogin || null);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>(initialRepos.slice(0, MAX));
  const [contributions, setContributions] = useState<Record<string, string>>({});

  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");

  const index = steps.indexOf(step);
  const [furthest, setFurthest] = useState(index);
  const go = (key: StepKey) => {
    setStep(key);
    setFurthest((f) => Math.max(f, steps.indexOf(key)));
  };

  /* ---- Step 1: name --------------------------------------------------- */

  async function saveName(): Promise<boolean> {
    if (!name.trim()) {
      setNameError("Please type the name employers should see.");
      return false;
    }
    if (name === profile?.displayName && role === profile?.role) return true;
    setSavingName(true);
    setNameError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), headline: profile?.headline ?? "", role: role.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setNameError(data.error ?? "Your name could not be saved. Try again.");
        return false;
      }
      return true;
    } catch {
      setNameError("Fydell could not be reached. Check your connection.");
      return false;
    } finally {
      setSavingName(false);
    }
  }

  /* ---- Step 2: GitHub ------------------------------------------------- */

  async function findRepos(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (finding || !input.trim()) return;
    setFinding(true);
    setFindError(null);
    try {
      const res = await fetch("/api/passport/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = (await res.json()) as { kind?: string; user?: string; repositories?: Repo[]; result?: ExtractionResult; error?: string };
      if (!res.ok) throw new Error(data.error ?? "We could not look that up. Check the spelling and try again.");
      if (data.kind === "profile") {
        const list = (data.repositories ?? []).filter((r) => !r.archived);
        setLogin(data.user ?? null);
        setRepos(list);
        setSelected(list.filter((r) => !r.fork).slice(0, MAX).map((r) => r.fullName));
      } else if (data.kind === "repository" && data.result?.repository) {
        const r = data.result.repository;
        setLogin(r.fullName.split("/")[0]);
        setRepos([{ name: r.fullName.split("/")[1], fullName: r.fullName, language: null, fork: false, archived: false, pushedAt: null }]);
        setSelected([r.fullName]);
      }
    } catch (err) {
      setFindError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFinding(false);
    }
  }

  /* ---- Step 4: run the analysis ---------------------------------------- */

  const runOne = useCallback(
    async (fullName: string) => {
      setRuns((r) => ({ ...r, [fullName]: { status: "running" } }));
      try {
        const res = await fetch(signedIn ? "/api/passport/projects" : "/api/passport/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            signedIn ? { repository: fullName, contribution: contributions[fullName] ?? "", githubLogin: login } : { input: fullName },
          ),
        });
        const data = (await res.json()) as { result?: ExtractionResult; project?: PassportProject | null; passport?: PassportData; error?: string };
        const result = data.result;
        if (!res.ok || !result || result.status === "failed") {
          const message = result?.error?.message ?? data.error ?? "We could not read this project.";
          setRuns((r) => ({ ...r, [fullName]: { status: "failed", message } }));
          return;
        }
        const project = data.project ?? data.passport?.projects.find((p) => p.repoFullName === result.repository?.fullName) ?? null;
        setRuns((r) => ({
          ...r,
          [fullName]: {
            status: "done",
            project: project ? { ...project, contributionStatement: contributions[fullName] ?? project.contributionStatement } : null,
            message: result.status === "partial" ? "Done, but some files could not be read." : undefined,
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
      setPhase("running");
      setRuns(Object.fromEntries(names.map((n) => [n, { status: "queued" } as RunState])));
      for (const n of names) await runOne(n);
      setPhase("done");
      if (signedIn) router.refresh();
    },
    [runOne, signedIn, router],
  );

  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !resuming) return;
    const t = setTimeout(() => {
      resumed.current = true;
      void runAll(initialRepos.slice(0, MAX));
    }, 0);
    return () => clearTimeout(t);
  }, [resuming, initialRepos, runAll]);

  const preview = useMemo<PassportData | null>(() => {
    if (signedIn) return null;
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
      capabilities: ruleSummary(evidence, roleSuggestions, "Preview: built from the findings above. A saved passport can add a written summary."),
      updatedAt: null,
    };
  }, [runs, signedIn, login]);

  const anyDone = Object.values(runs).some((r) => r.status === "done");
  const resumeHref = `/signup?as=developer&next=${encodeURIComponent(`/app/candidate/passport/build?github=${login ?? ""}&repos=${selected.join(",")}`)}`;

  /* ---- Navigation ----------------------------------------------------- */

  const canLeave: Record<StepKey, boolean> = {
    name: name.trim().length > 0,
    github: (repos?.length ?? 0) > 0,
    pick: selected.length > 0,
    finish: true,
  };

  async function next() {
    if (step === "name" && !(await saveName())) return;
    if (!canLeave[step]) return;
    const n = steps[index + 1];
    if (n) go(n);
  }

  const nextLabel: Partial<Record<StepKey, string>> = {
    name: "Next: connect GitHub",
    github: "Next: pick projects",
    pick: "Next: check and finish",
  };

  return (
    <div className={e.wizard}>
      <nav aria-label="Passport steps" className={e.stepNav}>
        <p className={e.stepCount}>
          Step {index + 1} of {steps.length}
        </p>
        {steps.map((key, i) => {
          const done = i < index || (key === "finish" && phase === "done");
          const current = key === step;
          const reachable = i <= furthest && phase !== "running";
          return (
            <button
              key={key}
              type="button"
              className={e.stepBtn}
              aria-current={current ? "step" : undefined}
              disabled={!reachable || current}
              onClick={() => go(key)}
              aria-label={`Step ${i + 1}: ${STEP_INFO[key].label}${done ? " (done)" : ""}`}
            >
              <span className={cx(e.num, done ? e.numDone : current && e.numOn)}>{done ? <Check aria-hidden /> : i + 1}</span>
              <span className={e.stepText}>
                <strong>{STEP_INFO[key].label}</strong>
                <span>{done ? "Done" : STEP_INFO[key].sub}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className={e.panel}>
        {step === "name" ? (
          <>
            <div className={e.panelHead}>
              <h2 className={e.panelTitle}>What should employers call you?</h2>
              <p className={e.body}>This is the name at the top of your passport.</p>
            </div>
            <div className={e.field}>
              <label htmlFor="pp-name" className={e.label}>
                Your name
              </label>
              <input
                id="pp-name"
                className={e.input}
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                maxLength={120}
                autoComplete="name"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "pp-name-error" : undefined}
              />
            </div>
            <div className={e.field}>
              <label htmlFor="pp-role" className={e.label}>
                What kind of work do you do? <em>(you can skip this)</em>
              </label>
              <input
                id="pp-role"
                className={e.input}
                value={role}
                onChange={(ev) => setRole(ev.target.value)}
                maxLength={120}
                placeholder="For example: Backend engineer"
                autoComplete="organization-title"
              />
            </div>
            {nameError ? (
              <p id="pp-name-error" role="alert" className={cx(e.status, e.statusBad)}>
                <AlertCircle aria-hidden />
                {nameError}
              </p>
            ) : null}
          </>
        ) : null}

        {step === "github" ? (
          <>
            <div className={e.panelHead}>
              <h2 className={e.panelTitle}>Connect your GitHub</h2>
              <p className={e.body}>
                Type your GitHub username. We only read <strong>public</strong> projects. We never change anything and never run your code.
              </p>
            </div>
            <form onSubmit={findRepos} className={e.field} style={{ maxWidth: 680 }}>
              <label htmlFor="pp-gh" className={e.label}>
                GitHub username
              </label>
              <div className={e.row}>
                <div className={e.prefixed}>
                  <span aria-hidden>github.com/</span>
                  <input
                    id="pp-gh"
                    value={input}
                    onChange={(ev) => setInput(ev.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="your-username"
                    aria-invalid={findError ? true : undefined}
                  />
                </div>
                <button type="submit" disabled={finding || !input.trim()} className={e.btn} style={{ minHeight: 60 }}>
                  {finding ? <Loader2 aria-hidden className={e.spin} /> : null}
                  {finding ? "Looking…" : "Find my projects"}
                </button>
              </div>
            </form>
            {findError ? (
              <p role="alert" className={cx(e.status, e.statusBad)}>
                <AlertCircle aria-hidden />
                {findError}
              </p>
            ) : null}
            {repos ? (
              <p role="status" className={cx(e.status, repos.length ? e.statusOk : e.statusBad)}>
                {repos.length ? <CheckCircle2 aria-hidden /> : <AlertCircle aria-hidden />}
                {repos.length
                  ? `Found ${repos.length} public project${repos.length === 1 ? "" : "s"}. Next, pick the ones to show.`
                  : "This account has no public projects we can read."}
              </p>
            ) : null}
            <details className={e.disclosure}>
              <summary>No GitHub account? You can still do simulations.</summary>
              <p className={e.small}>
                Your simulations are listed in <Link href="/app/candidate/simulations" className={e.link} style={{ fontSize: 16, minHeight: 0 }}>My simulations</Link>. Come back to the passport any time.
              </p>
            </details>
          </>
        ) : null}

        {step === "pick" ? (
          <>
            <div className={e.h2Row} style={{ alignItems: "flex-end" }}>
              <div className={e.panelHead}>
                <h2 className={e.panelTitle}>Pick up to {MAX} projects to show</h2>
                <p className={e.body}>Choose the ones you worked on the most. Tap a card to pick it.</p>
              </div>
              <span className={e.badge} style={{ fontSize: 18, minHeight: 44 }}>
                {selected.length} of {MAX} picked
              </span>
            </div>
            <div className={e.picks}>
              {(repos ?? []).map((r) => {
                const on = selected.includes(r.fullName);
                const full = !on && selected.length >= MAX;
                return (
                  <button
                    key={r.fullName}
                    type="button"
                    className={e.pick}
                    aria-pressed={on}
                    disabled={full}
                    onClick={() => setSelected((cur) => (on ? cur.filter((x) => x !== r.fullName) : [...cur, r.fullName]))}
                  >
                    <span aria-hidden className={e.box}>
                      {on ? <Check /> : null}
                    </span>
                    <span className={e.pickText}>
                      <strong>{r.name}</strong>
                      <span>{[r.language, ago(r.pushedAt)].filter(Boolean).join(" · ") || "Public project"}</span>
                      {r.fork ? <span>A copy of someone else&apos;s project. Findings will say so.</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            {selected.map((full) => {
              const short = full.split("/")[1];
              return (
                <div key={full} className={e.field} style={{ maxWidth: "none" }}>
                  <label htmlFor={`built-${short}`} className={e.label}>
                    What did you build in {short}? <em>(optional, shown as your own words)</em>
                  </label>
                  <textarea
                    id={`built-${short}`}
                    rows={2}
                    maxLength={1000}
                    className={e.textarea}
                    value={contributions[full] ?? ""}
                    onChange={(ev) => setContributions((c) => ({ ...c, [full]: ev.target.value }))}
                    placeholder="For example: I wrote the whole API and its tests."
                  />
                </div>
              );
            })}
          </>
        ) : null}

        {step === "finish" ? (
          <>
            <div className={e.panelHead}>
              <h2 className={e.panelTitle}>{phase === "done" && anyDone ? "Your passport is ready" : "Check what employers will see"}</h2>
              <p className={e.body}>Nobody sees your passport until you make a share link.</p>
            </div>
            <div className={e.tiles}>
              <div className={e.tile}>
                <span>Name</span>
                <strong>{signedIn ? name || "Not set" : login ?? "Not set"}</strong>
              </div>
              <div className={e.tile}>
                <span>Projects</span>
                <strong>{selected.length} picked</strong>
              </div>
              <div className={e.tile}>
                <span>Who can see it</span>
                <strong>Only you</strong>
              </div>
            </div>

            {phase === "idle" ? (
              <div className={e.note}>
                <strong className={e.body} style={{ fontWeight: 700 }}>
                  What happens when you finish
                </strong>
                <p className={e.small}>
                  We read the code in the projects you picked. Everything we say about you points to the exact file and lines, so anyone can
                  check it. This takes a minute or two for each project.
                </p>
              </div>
            ) : (
              <ul className={e.runs} aria-label="Reading your projects">
                {Object.entries(runs).map(([full, run]) => (
                  <li key={full} className={e.run}>
                    <span aria-hidden className={e.runIcon}>
                      {run.status === "running" ? <Loader2 className={e.spin} /> : null}
                      {run.status === "done" ? <CheckCircle2 color="#2e6b3f" /> : null}
                      {run.status === "failed" ? <AlertCircle color="#c4323a" /> : null}
                      {run.status === "queued" ? <span className={e.num} style={{ width: 12, height: 12 }} /> : null}
                    </span>
                    <span className={e.mono}>{full.split("/")[1]}</span>
                    <span className={e.runText} aria-live="polite">
                      {run.status === "queued" && "Waiting its turn"}
                      {run.status === "running" && "Reading the code and checking every citation…"}
                      {run.status === "done" &&
                        (run.message ?? `${run.project?.evidence.length ?? 0} finding${run.project?.evidence.length === 1 ? "" : "s"}`)}
                      {run.status === "failed" && run.message}
                    </span>
                    {run.status === "failed" && phase === "done" ? (
                      <button type="button" onClick={() => void runOne(full)} className={cx(e.btn, e.btnSmall)}>
                        <RotateCcw aria-hidden /> Try again
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        <div className={e.panelFoot}>
          {index > 0 && phase !== "running" && !(step === "finish" && phase === "done") ? (
            <button type="button" onClick={() => go(steps[index - 1])} className={e.btn}>
              Back
            </button>
          ) : null}
          <span className={e.spacer} />
          {step !== "finish" ? (
            <button
              type="button"
              onClick={() => void next()}
              disabled={!canLeave[step] || savingName}
              className={cx(e.btn, e.btnPrimary)}
            >
              {savingName ? "Saving…" : nextLabel[step]}
              <ArrowRight aria-hidden />
            </button>
          ) : phase === "idle" ? (
            <button type="button" onClick={() => void runAll(selected)} disabled={selected.length === 0} className={cx(e.btn, e.btnPrimary)}>
              Finish my passport
            </button>
          ) : phase === "running" ? (
            <button type="button" disabled className={e.btn}>
              <Loader2 aria-hidden className={e.spin} /> Reading your projects…
            </button>
          ) : signedIn ? (
            anyDone ? (
              <Link href="/app/candidate/passport" className={cx(e.btn, e.btnPrimary)}>
                See my passport <ArrowRight aria-hidden />
              </Link>
            ) : (
              <button type="button" onClick={() => go("pick")} className={cx(e.btn, e.btnPrimary)}>
                Pick other projects
              </button>
            )
          ) : anyDone ? (
            <Link href={resumeHref} className={cx(e.btn, e.btnPrimary)}>
              Save my passport <ArrowRight aria-hidden />
            </Link>
          ) : (
            <button type="button" onClick={() => go("pick")} className={cx(e.btn, e.btnPrimary)}>
              Pick other projects
            </button>
          )}
        </div>

      </div>

      {preview ? (
        <div style={{ gridColumn: "1 / -1" }}>
          <PassportView passport={preview} mode="preview" />
        </div>
      ) : null}
    </div>
  );
}
