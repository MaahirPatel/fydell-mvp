"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CirclePlay,
  Crosshair,
  FileCheck2,
  House,
  ReceiptText,
  Activity,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import {
  APPLIED_AI_DISPLAY_ROLE,
  APPLIED_AI_PROOF_REQUIREMENTS,
  FLAGSHIP_PRIMARY_TARGET_IDS,
  createCandidate01PreWorkProfile,
} from "@/lib/sim-engine/proof/coverage";
import { APPLIED_AI_WORKFLOW_FIXTURE } from "@/lib/sim-engine/proof/sandbox/fixture";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";
import { DemoGuide, GUIDE_BY_SURFACE } from "./DemoGuide";
import { SandboxEvidence } from "./SandboxEvidence";
import { SandboxWorkbench } from "./SandboxWorkbench";
import { SandboxWorkReceipt } from "./SandboxWorkReceipt";

const CANDIDATE_01_PROFILE = createCandidate01PreWorkProfile();
const REQUIREMENT_COVERAGE = new Map(
  APPLIED_AI_WORKFLOW_FIXTURE.requirements.map((requirement) => [requirement.id, requirement.coverage]),
);

/**
 * `/sandbox/overview` and `/sandbox/simulation` redirect to the canonical
 * `roles` and `work` surfaces, so they are not rendered here.
 */
type Surface =
  | "home"
  | "roles"
  | "candidates"
  | "work"
  | "evidence"
  | "receipt"
  | "outcomes";

export function SandboxApp({ surface, publicId }: { surface: Surface; runId?: string; publicId?: string }) {
  const [session, setSession] = useState<SandboxSessionView | null>(null);
  const [publicReceipt, setPublicReceipt] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [backoff, setBackoff] = useState(2000);
  const failCount = useRef(0);

  const load = useCallback(async () => {
    const res = await fetch("/api/sandbox", { credentials: "same-origin" });
    const json = (await res.json()) as { session?: SandboxSessionView | null; error?: string };
    if (!res.ok && res.status === 503) {
      setError("Interactive demo temporarily unavailable");
      return;
    }
    setSession(json.session ?? null);
  }, []);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/sandbox/actions", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as { session?: SandboxSessionView; error?: string };
        if (!res.ok) {
          setError(json.error ?? "Action failed");
          return;
        }
        if (json.session) setSession(json.session);
        failCount.current = 0;
        setBackoff(2000);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (surface !== "receipt" || !publicId) return;
    const controller = new AbortController();
    void fetch(`/api/receipts/${encodeURIComponent(publicId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const json = (await response.json()) as {
          receipt?: Record<string, unknown>;
          integrityHash?: string;
        };
        if (json.receipt) {
          setPublicReceipt({ ...json.receipt, integrityHash: json.integrityHash ?? json.receipt.integrityHash });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [publicId, surface]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (hidden || session?.step === "finalized") return;
    if (!session && surface === "home") return;
    let cancelled = false;
    const tick = async () => {
      try {
        await load();
        failCount.current = 0;
        setBackoff(2000);
      } catch {
        failCount.current += 1;
        setBackoff(Math.min(16000, 2000 * 2 ** failCount.current));
      }
    };
    const id = window.setInterval(() => {
      if (!cancelled) void tick();
    }, backoff);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [backoff, hidden, load, session, surface]);

  async function ensureSession() {
    if (session) return session;
    const res = await fetch("/api/sandbox", { method: "POST", credentials: "same-origin" });
    const json = (await res.json()) as { session?: SandboxSessionView; error?: string };
    if (!res.ok || !json.session) {
      setError(json.error ?? "Could not create sandbox");
      return null;
    }
    setSession(json.session);
    return json.session;
  }

  async function reset() {
    if (
      !window.confirm(
        "Reset Sandbox? This removes your demo changes and restores the original fixture. Your live workspace is unaffected.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/sandbox/reset", { method: "POST", credentials: "same-origin" });
      const json = (await res.json()) as { session?: SandboxSessionView; error?: string };
      if (!res.ok) setError(json.error ?? "Reset failed");
      else setSession(json.session ?? null);
    } finally {
      setBusy(false);
    }
  }

  if (error === "Interactive demo temporarily unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--surface-canvas)] px-6">
        <p className="text-app-body text-[var(--text-secondary)]">{error}</p>
      </main>
    );
  }

  const nav = [
    { label: "Proof overview", href: "/sandbox", icon: House, active: surface === "home" },
    {
      label: "Role proof",
      href: "/sandbox/roles",
      icon: Crosshair,
      active: surface === "roles" || surface === "candidates",
    },
    {
      label: "Verification episode",
      href: "/sandbox/work",
      icon: CirclePlay,
      active: surface === "work",
    },
    {
      label: "Evidence",
      href: session ? `/sandbox/evidence/${session.runId}` : "/sandbox/evidence",
      icon: FileCheck2,
      active: surface === "evidence",
    },
    {
      label: "Work receipt",
      href: session?.receiptPublicId ? `/sandbox/receipts/${session.receiptPublicId}` : "/sandbox/receipts",
      icon: ReceiptText,
      active: surface === "receipt",
    },
    {
      label: "Outcomes",
      href: "/sandbox/outcomes",
      icon: Activity,
      active: surface === "outcomes",
    },
  ];

  const guideKey =
    surface === "work" || surface === "evidence" || surface === "receipt" ? surface : null;
  const guide = guideKey ? GUIDE_BY_SURFACE[guideKey] : null;

  return (
    <div className="min-h-screen bg-[var(--surface-raised)] text-[var(--text-primary)]">
      <div className="sticky top-0 z-50 flex h-[30px] items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 text-app-meta">
        <span className="font-medium text-[var(--text-secondary)]">Sandbox · Fictional data</span>
        <span className="mx-auto hidden text-[var(--text-secondary)] lg:block">
          You&rsquo;re exploring a Fydell sandbox. Actions here do not affect live hiring decisions.
        </span>
        <button
          type="button"
          onClick={() => void reset()}
          disabled={busy}
          className="text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline disabled:opacity-50"
        >
          Reset demo
        </button>
        <Link
          href="/app/employer"
          className="inline-flex h-[22px] items-center rounded-[var(--radius-tag)] bg-[var(--control-solid)] px-2.5 text-app-caption font-medium text-[var(--control-solid-ink)]"
        >
          Use Fydell with your team
        </Link>
      </div>

      <div className="sticky top-[30px] z-40 flex h-12 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4">
        <Link href="/sandbox" className="inline-flex items-center gap-2" aria-label="Fydell sandbox home">
          <FydellMark width={22} />
          <span className="text-app-body font-semibold tracking-[-0.026em]">fydell</span>
        </Link>
        <span className="ml-2 min-w-0 truncate text-app-body text-[var(--text-secondary)] sm:ml-4">
          Applied AI proof sandbox
        </span>
        <span className="ml-auto hidden font-mono text-app-meta text-[var(--text-tertiary)] sm:block">
          {APPLIED_AI_WORKFLOW_FIXTURE.fixtureVersion}
        </span>
      </div>

      <nav
        aria-label="Sandbox mobile navigation"
        className="sticky top-[78px] z-30 flex min-h-11 gap-1 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-1.5 md:hidden"
      >
        {nav.map(({ label, href, active }) => (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-8 shrink-0 items-center rounded-[var(--radius-control)] px-2.5 text-app-meta ${
              active
                ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex min-h-[calc(100vh-78px)]">
        <aside className="sticky top-[78px] hidden h-[calc(100vh-78px)] w-[196px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-4 md:flex">
          <nav className="flex flex-1 flex-col gap-0.5" aria-label="Sandbox">
            {nav.map(({ label, href, icon: Icon, active }) => (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-8 items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 text-app-body ${
                  active
                    ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.7} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <p className="px-2.5 text-app-meta text-[var(--text-tertiary)]">
            {APPLIED_AI_WORKFLOW_FIXTURE.fixtureVersion}
          </p>
        </aside>

        <div className="min-w-0 flex-1">
          {error ? (
            <div className="border-b border-[var(--border-subtle)] px-5 py-3 text-app-body text-[var(--fydell-risk)] md:px-8">
              {error}{" "}
              <button type="button" className="text-[var(--action-ink)]" onClick={() => void load()}>
                Retry
              </button>
            </div>
          ) : null}

          <main className="px-5 py-7 md:px-8 lg:py-9">
            <div className="mx-auto w-full max-w-[1240px]">
              {surface === "home" ? <SandboxHome session={session} onCreate={() => void ensureSession()} /> : null}
              {surface === "roles" ? <SandboxRole /> : null}
              {surface === "candidates" ? <SandboxCandidates session={session} onCreate={() => void ensureSession()} /> : null}
              {surface === "work" ? (
                <SandboxWorkbench
                  session={session}
                  busy={busy}
                  onAction={(body) => void act(body)}
                  onEnsure={() => void ensureSession()}
                />
              ) : null}
              {surface === "evidence" ? (
                <SandboxEvidence session={session} busy={busy} onAction={(body) => void act(body)} />
              ) : null}
              {surface === "receipt" ? (
                <SandboxWorkReceipt session={session} receiptPayload={publicReceipt} publicId={publicId} />
              ) : null}
              {surface === "outcomes" ? (
                <SandboxOutcomes session={session} busy={busy} onAction={(body) => void act(body)} />
              ) : null}
            </div>
          </main>
        </div>
      </div>

      {guide && !guideDismissed ? (
        <DemoGuide guide={guide} onDismiss={() => setGuideDismissed(true)} onRestart={() => void reset()} />
      ) : null}
    </div>
  );
}

function SandboxHome({ session, onCreate }: { session: SandboxSessionView | null; onCreate: () => void }) {
  const candidates = session?.fixture.candidates ?? APPLIED_AI_WORKFLOW_FIXTURE.candidates;
  const counts = candidates.reduce<Record<string, number>>((summary, candidate) => {
    summary[candidate.status] = (summary[candidate.status] ?? 0) + 1;
    return summary;
  }, {});
  const countSummary = Object.entries(counts)
    .map(([status, count]) => `${count} ${status.replaceAll("_", " ")}`)
    .join(" · ");
  const completedActions = session
    ? Object.values(session.progress).filter(Boolean).length
    : 0;
  const totalActions = session ? Object.keys(session.progress).length : 10;
  const next =
    !session
      ? { label: "Start verification episode", onClick: onCreate }
      : session.step === "review_pending"
        ? { label: "Review audited evidence", href: `/sandbox/evidence/${session.runId}` }
        : session.step === "finalized"
          ? session.receiptPublicId
            ? { label: "Open portable receipt", href: `/sandbox/receipts/${session.receiptPublicId}` }
            : { label: "Record outcome", href: "/sandbox/outcomes" }
          : session.step === "pass_a_processing" || session.step === "pass_b_processing"
            ? { label: "Open evidence status", href: `/sandbox/evidence/${session.runId}` }
            : { label: "Continue verification episode", href: "/sandbox/work" };
  const proofFlow = [
    ["Role proof", "Eight Applied AI requirements define the evidence boundary.", "/sandbox/roles"],
    ["Existing proof", "Candidate 01 has support for 6 of 8 requirements.", "/sandbox/roles"],
    ["Gaps", `${FLAGSHIP_PRIMARY_TARGET_IDS.join(", ")} need targeted verification.`, "/sandbox/roles"],
    ["Targeted episode", "Inspect, change, measure, revise, and defend the workflow.", "/sandbox/work"],
    ["Audited evidence", "Claims stay linked to supporting and counterevidence events.", session ? `/sandbox/evidence/${session.runId}` : "/sandbox/evidence"],
    ["Portable receipt", "Explicit review can issue a versioned, integrity-hashed record.", session?.receiptPublicId ? `/sandbox/receipts/${session.receiptPublicId}` : "/sandbox/receipts"],
  ] as const;

  return (
    <section>
      <div className="border-b border-[var(--border-subtle)] pb-6">
        <h1 className="text-app-page">Applied AI proof workflow</h1>
        <p className="mt-2 max-w-[70ch] text-app-body text-[var(--text-secondary)]">
          Follow one isolated fictional session from role requirements and existing proof to targeted work, audited evidence, and a portable receipt.
        </p>
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="text-app-section font-medium">Proof sequence</h2>
            <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
              Existing support is reused; the episode targets only the remaining gaps.
            </p>
          </div>
          <ol>
            {proofFlow.map(([label, description, href], index) => (
              <li key={label} className="border-b border-[var(--border-subtle)] last:border-b-0">
                <Link href={href} className="grid min-h-[62px] grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 hover:bg-[var(--surface-hover)]">
                  <span className="font-mono text-app-meta tabular-nums text-[var(--text-tertiary)]">{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block text-app-body font-medium">{label}</span>
                    <span className="mt-0.5 block text-app-meta text-[var(--text-secondary)]">{description}</span>
                  </span>
                  <span aria-hidden className="text-[var(--text-tertiary)]">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-app-section font-medium">Current session</h2>
            <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
              {session ? `${session.fixture.simulationTitle} · v${session.revision}` : APPLIED_AI_WORKFLOW_FIXTURE.simulationVersion.title}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
            <div>
              <dt className="text-app-meta text-[var(--text-tertiary)]">Stage</dt>
              <dd className="mt-1 text-app-body capitalize">{session ? session.episodeStage.replaceAll("_", " ").toLowerCase() : "Not started"}</dd>
            </div>
            <div>
              <dt className="text-app-meta text-[var(--text-tertiary)]">Progress</dt>
              <dd className="mt-1 text-app-body tabular-nums">{session ? `${completedActions}/${totalActions} actions` : "0/10 actions"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-app-meta text-[var(--text-tertiary)]">Fixture candidates</dt>
              <dd className="mt-1 text-app-body text-[var(--text-secondary)]">{candidates.length} total · {countSummary}</dd>
            </div>
          </dl>
          <div className="border-t border-[var(--border-subtle)] p-4">
            {"onClick" in next ? (
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
                onClick={next.onClick}
              >
                {next.label}
              </button>
            ) : (
              <Link href={next.href} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]">
                {next.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SandboxRole() {
  const requirements = APPLIED_AI_PROOF_REQUIREMENTS.map((requirement) => {
    const sources = CANDIDATE_01_PROFILE.sources.filter((source) => source.requirementId === requirement.id);
    return {
      ...requirement,
      coverage: REQUIREMENT_COVERAGE.get(requirement.id) ?? "NOT_PROVEN",
      sourceSummary: sources.length
        ? `${sources.length} ${sources[0].kind.replaceAll("_", " ").toLowerCase()} source${sources.length === 1 ? "" : "s"}`
        : "No qualifying existing source",
    };
  });
  return (
    <section>
      <h1 className="text-app-page">{APPLIED_AI_DISPLAY_ROLE} role proof</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">
        Isolated flagship demo · proof spec {CANDIDATE_01_PROFILE.specVersion} · not a published employer evaluation
      </p>
      <div className="mt-7 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-app-section">Role boundary</h2>
          <p className="mt-2 max-w-[75ch] text-app-body text-[var(--text-secondary)]">
            Diagnose, evaluate, harden, and defend a production-style AI workflow under changing reliability, latency, cost, and product constraints.
          </p>
        </div>
        <div className="grid grid-cols-[72px_minmax(0,1fr)] border-b border-[var(--border-subtle)] px-4 py-2.5 text-app-meta text-[var(--text-tertiary)] sm:grid-cols-[96px_minmax(0,1fr)_180px_150px]">
          <span>Requirement</span><span>Evidence boundary</span><span className="hidden sm:block">Source support</span><span className="hidden sm:block">Status</span>
        </div>
        <ul>
          {requirements.map((item) => (
            <li key={item.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 sm:grid-cols-[96px_minmax(0,1fr)_180px_150px]">
              <span className="font-mono text-app-meta text-[var(--text-tertiary)]">{item.id}</span>
              <span className="min-w-0">
                <span className="block text-app-body font-medium">{item.title}</span>
                <span className="mt-0.5 block text-app-meta text-[var(--text-secondary)]">{item.description}</span>
                <span className="mt-1 block text-app-meta text-[var(--text-tertiary)] sm:hidden">{item.sourceSummary}</span>
              </span>
              <span className="hidden text-app-meta text-[var(--text-secondary)] sm:block">{item.sourceSummary}</span>
              <span className="col-start-2 mt-1 text-app-meta text-[var(--text-secondary)] sm:col-start-auto sm:mt-0">{item.coverage.replaceAll("_", " ").toLowerCase()}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-start justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-app-body text-[var(--text-secondary)]">
            Candidate 01 · 6/8 supported · exact verification gaps: PR-AI-04, PR-AI-05, PR-AI-07, PR-AI-08
          </p>
          <Link href="/sandbox/work" className="text-app-body font-medium text-[var(--action-ink)] hover:underline">
            Open verification episode →
          </Link>
        </div>
      </div>
    </section>
  );
}

function SandboxCandidates({
  session,
  onCreate,
}: {
  session: SandboxSessionView | null;
  onCreate: () => void;
}) {
  const candidates = session?.fixture.candidates ?? APPLIED_AI_WORKFLOW_FIXTURE.candidates;
  return (
    <section>
      <h1 className="text-app-page">Candidates</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">Demo identities only. No email is sent and no live candidate record is created.</p>
      <div className="mt-7 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
        {candidates.map((candidate) => (
          <div key={candidate.candidateId} className="grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_160px_170px]">
            <span className="min-w-0">
              <span className="block text-app-body font-medium">{candidate.label}</span>
              <span className="mt-0.5 block text-app-meta text-[var(--text-tertiary)]">
                {candidate.candidateId === "candidate-01" ? "6/8 supported · gaps PR-AI-04/05/07/08" : "Fixture row · proof not scored"}
              </span>
            </span>
            <span className="hidden text-app-body capitalize text-[var(--text-secondary)] sm:block">{candidate.status.replaceAll("_", " ")}</span>
            <span className="text-right">
              {candidate.candidateId === "candidate-01" ? (
                session ? (
                  <Link href="/sandbox/work" className="text-app-body font-medium text-[var(--action-ink)] hover:underline">
                    Open verification episode
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onCreate}
                    className="text-app-body font-medium text-[var(--action-ink)] hover:underline"
                  >
                    Start verification episode
                  </button>
                )
              ) : (
                <span className="text-app-meta text-[var(--text-tertiary)]">Demo state</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SandboxOutcomes({
  session,
  busy,
  onAction,
}: {
  session: SandboxSessionView | null;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [finding, setFinding] = useState<
    "confirmed" | "contradicted" | "still_unclear" | "not_asked"
  >(session?.interviewFinding ?? "confirmed");
  const [outcome, setOutcome] = useState<"advance" | "hold" | "close" | "hired">(
    session?.hiringOutcome ?? "advance",
  );
  const findingOptions = [
    ["confirmed", "Confirmed"],
    ["contradicted", "Contradicted"],
    ["still_unclear", "Still unclear"],
    ["not_asked", "Not asked"],
  ] as const;
  const outcomeOptions = [
    ["advance", "Advance"],
    ["hold", "Hold"],
    ["close", "Close"],
    ["hired", "Hired"],
  ] as const;
  return (
    <section className="mx-auto max-w-[960px]">
      <h1 className="text-app-page">Outcomes</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">
        Interview findings connect employer judgment back to the evidence without claiming predictive performance.
      </p>
      <div className="mt-7 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <p className="text-app-section">{session?.fixture.candidate.label ?? "Candidate 01"}</p>
          <p className="mt-1 text-app-meta text-[var(--text-secondary)]">Applied AI Engineer</p>
        </div>
        <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
          <div>
            <p className="text-app-meta text-[var(--text-tertiary)]">Interview finding</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {findingOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFinding(value)}
                  aria-pressed={finding === value}
                  className={`h-9 rounded-[var(--radius-control)] border px-3 text-left text-app-body hover:bg-[var(--surface-hover)] ${
                    finding === value
                      ? "border-[var(--text-primary)] bg-[var(--surface-selected)]"
                      : "border-[var(--border-strong)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-app-meta text-[var(--text-tertiary)]">Hiring outcome</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {outcomeOptions.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOutcome(value)}
                  aria-pressed={outcome === value}
                  className={`h-9 rounded-[var(--radius-control)] border px-3 text-left text-app-body hover:bg-[var(--surface-hover)] ${
                    outcome === value
                      ? "border-[var(--text-primary)] bg-[var(--surface-selected)]"
                      : "border-[var(--border-strong)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] px-5 py-4">
          <p className="text-app-body text-[var(--text-secondary)]">
            Fydell evidence → interview finding → outcome
          </p>
          <button
            type="button"
            disabled={busy || session?.step !== "finalized"}
            onClick={() =>
              onAction({
                type: "record_outcome",
                finding,
                outcome,
                idempotencyKey: `outcome:${finding}:${outcome}`,
              })
            }
            className="h-9 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)] disabled:opacity-40"
          >
            {session?.hiringOutcome ? "Update outcome" : "Record outcome"}
          </button>
        </div>
      </div>
    </section>
  );
}

