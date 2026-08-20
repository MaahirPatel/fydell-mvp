"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BriefcaseBusiness,
  FileCheck2,
  FolderOpen,
  House,
  ReceiptText,
  RotateCcw,
  Users,
} from "lucide-react";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";
import { SandboxWorkbench } from "./SandboxWorkbench";
import { WorkReceiptView } from "./WorkReceiptView";

type Surface =
  | "home"
  | "roles"
  | "candidates"
  | "work"
  | "overview"
  | "simulation"
  | "evidence"
  | "receipt"
  | "outcomes";

export function SandboxApp({
  surface,
  runId,
  publicId,
}: {
  surface: Surface;
  runId?: string;
  publicId?: string;
}) {
  const [session, setSession] = useState<SandboxSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
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

  useEffect(() => {
    if (!autoplay || busy || hidden || !session || session.step === "finalized") return;
    const id = window.setTimeout(() => {
      void act({ type: "advance", idempotencyKey: `auto:${session.step}:${session.revision}` });
    }, 1600);
    return () => window.clearTimeout(id);
  }, [act, autoplay, busy, hidden, session]);

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
    { label: "Home", href: "/sandbox", icon: House, active: surface === "home" },
    { label: "Roles", href: "/sandbox/roles", icon: BriefcaseBusiness, active: surface === "roles" || surface === "overview" },
    { label: "Candidates", href: "/sandbox/candidates", icon: Users, active: surface === "candidates" },
    { label: "Work", href: "/sandbox/work", icon: FolderOpen, active: surface === "work" || surface === "simulation" },
    { label: "Evidence", href: session ? `/sandbox/evidence/${session.runId}` : "/sandbox/evidence", icon: FileCheck2, active: surface === "evidence" },
    { label: "Work Receipts", href: session?.receiptPublicId ? `/sandbox/receipts/${session.receiptPublicId}` : "/sandbox/receipts", icon: ReceiptText, active: surface === "receipt" },
    { label: "Outcomes", href: "/sandbox/outcomes", icon: Activity, active: surface === "outcomes" },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-raised)] text-[var(--text-primary)]">
      <div className="sticky top-0 z-50 flex h-8 items-center bg-[#263a5b] px-3 text-[11.5px] text-white">
        <span className="font-medium">Sandbox</span>
        <span className="mx-auto hidden text-white/80 sm:block">
          Demo data only · Nothing here affects your live workspace.
        </span>
        <Link href="/app/employer" className="ml-auto font-medium text-white underline-offset-2 hover:underline sm:ml-0">
          Switch to live
        </Link>
      </div>
      <div className="flex min-h-[calc(100vh-32px)]">
        <aside className="sticky top-8 hidden h-[calc(100vh-32px)] w-[224px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] px-2.5 py-3 md:flex">
          <Link href="/sandbox" className="flex min-h-[48px] items-center gap-2.5 rounded-[var(--radius-control)] px-2 hover:bg-[var(--surface-hover)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-panel)] text-[11px] font-semibold">
              D
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium">Demo Sandbox</span>
              <span className="block text-[11px] text-[var(--text-tertiary)]">Sandbox</span>
            </span>
          </Link>
          <nav className="mt-5 flex flex-1 flex-col gap-0.5" aria-label="Sandbox workspace">
            {nav.map(({ label, href, icon: Icon, active }) => (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-8 items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 text-[13.5px] ${
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
          <button
            type="button"
            onClick={() => void reset()}
            disabled={busy}
            className="flex h-8 items-center gap-2 rounded-[var(--radius-control)] px-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            Reset demo
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-8 z-30 flex h-14 items-center border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 md:px-8 lg:px-12">
            <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">
              {nav.find((item) => item.active)?.label ?? "Sandbox"}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-app-meta text-[var(--text-tertiary)] sm:block">
                {session ? `Step: ${session.step.replaceAll("_", " ")}` : "Demo not started"}
              </span>
              <button
                type="button"
                onClick={() => setAutoplay((value) => !value)}
                disabled={!session || session.step === "finalized"}
                className="inline-flex h-8 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-[12.5px] font-medium disabled:opacity-40"
              >
                {autoplay ? "Pause guide" : "Guide me"}
              </button>
            </div>
          </header>

          {error ? (
            <div className="border-b border-[var(--border-subtle)] px-5 py-3 text-app-body text-[var(--color-risk)] md:px-8 lg:px-12">
              {error}{" "}
              <button type="button" className="text-[var(--action-ink)]" onClick={() => void load()}>
                Retry
              </button>
            </div>
          ) : null}

          <main className="px-5 py-7 md:px-8 lg:px-12 lg:py-9">
            <div className="mx-auto w-full max-w-[1320px]">
              {surface === "home" ? <SandboxHome session={session} onCreate={() => void ensureSession()} /> : null}
              {surface === "roles" || surface === "overview" ? <SandboxRole session={session} /> : null}
              {surface === "candidates" ? <SandboxCandidates session={session} onCreate={() => void ensureSession()} /> : null}
              {surface === "work" || surface === "simulation" ? (
                <SandboxWorkbench session={session} busy={busy} onAction={(body) => void act(body)} onEnsure={() => void ensureSession()} />
              ) : null}
              {surface === "evidence" ? <EvidenceReport session={session} expectedRunId={runId} onReview={(decision) => void act({ type: "review", decision })} /> : null}
              {surface === "receipt" ? <ReceiptSurface session={session} publicId={publicId} /> : null}
              {surface === "outcomes" ? (
                <SandboxOutcomes session={session} busy={busy} onAction={(body) => void act(body)} />
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function SandboxHome({ session, onCreate }: { session: SandboxSessionView | null; onCreate: () => void }) {
  const steps = [
    ["Review the role", "/sandbox/roles"],
    ["Experience Candidate 01 work", "/sandbox/work"],
    ["See what changed", "/sandbox/work"],
    ["Review the evidence", session ? `/sandbox/evidence/${session.runId}` : "/sandbox/evidence"],
    ["Open the Decision Brief", session ? `/sandbox/evidence/${session.runId}` : "/sandbox/evidence"],
    ["View the Demo Work Receipt", session?.receiptPublicId ? `/sandbox/receipts/${session.receiptPublicId}` : "/sandbox/receipts"],
    ["Record an interview outcome", "/sandbox/outcomes"],
  ] as const;

  return (
    <section>
      <div className="border-b border-[var(--border-subtle)] pb-6">
        <h1 className="text-app-page">Experience Fydell</h1>
        <p className="mt-2 max-w-[70ch] text-app-body text-[var(--text-secondary)]">
          Follow one Solutions Engineer hiring workflow from role definition to candidate work, evidence, interview, and portable proof.
        </p>
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <p className="text-app-section font-medium">Solutions Engineer</p>
            <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
              4 demo candidates · 1 ready · 1 defense pending · 1 in progress · 1 invited
            </p>
          </div>
          {(session?.fixture.candidates ?? [
            { candidateId: "candidate-01", label: "Candidate 01", status: "ready" as const },
            { candidateId: "candidate-02", label: "Candidate 02", status: "defense_pending" as const },
            { candidateId: "candidate-03", label: "Candidate 03", status: "in_progress" as const },
            { candidateId: "candidate-04", label: "Candidate 04", status: "invited" as const },
          ]).map((candidate) => (
            <div
              key={candidate.candidateId}
              className="flex min-h-[48px] items-center justify-between border-b border-[var(--border-subtle)] px-5 last:border-b-0"
            >
              <span className="text-app-body font-medium">{candidate.label}</span>
              <span className="text-app-meta capitalize text-[var(--text-secondary)]">
                {candidate.status.replaceAll("_", " ")}
              </span>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="text-app-section font-medium">Experience guide</p>
            <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
              Real interactions, isolated demo state.
            </p>
          </div>
          <ol>
            {steps.map(([label, href], index) => (
              <li key={label} className="border-b border-[var(--border-subtle)] last:border-b-0">
                <Link href={href} className="flex min-h-[44px] items-center gap-3 px-4 hover:bg-[var(--surface-hover)]">
                  <span className="w-4 text-app-meta tabular-nums text-[var(--text-tertiary)]">{index + 1}</span>
                  <span className="min-w-0 flex-1 text-app-body text-[var(--text-primary)]">{label}</span>
                  <span aria-hidden className="text-[var(--text-tertiary)]">→</span>
                </Link>
              </li>
            ))}
          </ol>
          {!session ? (
            <div className="border-t border-[var(--border-subtle)] p-4">
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-app-body font-medium text-[var(--control-solid-ink)]"
                onClick={onCreate}
              >
                Start demo
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SandboxRole({ session }: { session: SandboxSessionView | null }) {
  return (
    <section>
      <h1 className="text-app-page">Solutions Engineer</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">Enterprise SaaS · Active demo role</p>
      <div className="mt-7 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-app-section">What they actually do</h2>
          <p className="mt-2 max-w-[75ch] text-app-body text-[var(--text-secondary)]">
            Technical discovery, implementation design, troubleshooting, customer communication, and engineering coordination under changing requirements.
          </p>
        </div>
        <div className="border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-app-section">Evidence Fydell needs</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {(session?.fixture.competencies ?? ["Discovery judgment", "Technical translation", "Adaptation", "Commercial judgment", "Customer communication"]).map((item) => (
              <li key={item} className="text-app-body text-[var(--text-secondary)]">• {item}</li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p className="text-app-body text-[var(--text-secondary)]">High ambiguity · Customer-facing · Cross-functional</p>
          <Link href="/sandbox/work" className="text-app-body font-medium text-[var(--action-ink)] hover:underline">
            Experience candidate work →
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
  const candidates = session?.fixture.candidates ?? [
    { candidateId: "candidate-01", label: "Candidate 01", status: "ready" as const },
    { candidateId: "candidate-02", label: "Candidate 02", status: "defense_pending" as const },
    { candidateId: "candidate-03", label: "Candidate 03", status: "in_progress" as const },
    { candidateId: "candidate-04", label: "Candidate 04", status: "invited" as const },
  ];
  return (
    <section>
      <h1 className="text-app-page">Candidates</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">Demo identities only. No email is sent and no live candidate record is created.</p>
      <div className="mt-7 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
        {candidates.map((candidate) => (
          <div key={candidate.candidateId} className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_160px_140px] items-center border-b border-[var(--border-subtle)] px-4 last:border-b-0">
            <span className="text-app-body font-medium">{candidate.label}</span>
            <span className="text-app-body capitalize text-[var(--text-secondary)]">{candidate.status.replaceAll("_", " ")}</span>
            <span className="text-right">
              {candidate.candidateId === "candidate-01" ? (
                session ? (
                  <Link href="/sandbox/work" className="text-app-body font-medium text-[var(--action-ink)] hover:underline">
                    Experience view
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={onCreate}
                    className="text-app-body font-medium text-[var(--action-ink)] hover:underline"
                  >
                    Start demo
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

function EvidenceReport({
  session,
  expectedRunId,
  onReview,
}: {
  session: SandboxSessionView | null;
  expectedRunId?: string;
  onReview: (decision: "approve" | "limit" | "follow_up" | "reject") => void;
}) {
  if (!session) return <p className="text-app-body text-[var(--text-secondary)]">Create a sandbox session first.</p>;
  if (expectedRunId && expectedRunId !== session.runId) {
    return <p className="text-app-body text-[var(--text-secondary)]">This evidence report belongs to another sandbox visitor.</p>;
  }
  return (
    <section className="mx-auto max-w-[1040px]">
      <p className="text-app-meta text-[var(--text-tertiary)]">{session.fixture.candidate.label} · Solutions Engineer</p>
      <h1 className="mt-2 text-app-page">Decision Brief</h1>
      <p className="mt-3 text-app-section font-medium text-[var(--text-primary)]">
        {session.brief?.recommendation ?? "Evidence assembling"}
      </p>
      <p className="mt-2 max-w-[75ch] text-app-body text-[var(--text-secondary)]">
        {session.brief?.why ?? "Evidence is still being assembled from this run. Complete the work and defense before treating this as a decision brief."}
      </p>
      {session.labels.review ? (
        <p className="mt-4 border-y border-[var(--border-subtle)] py-3 text-app-body text-[var(--text-secondary)]">
          {session.labels.review}
        </p>
      ) : null}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h2 className="text-app-section">Evidence</h2>
          </div>
          <ul>
            {session.claims.length > 0 ? session.claims.map((claim) => (
              <li key={claim.id} className="border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0">
                <p className="text-app-meta text-[var(--text-tertiary)]">
                  {claim.competency} · {claim.direction === "supports" ? "Supporting evidence" : "Counterevidence"}
                </p>
                <p className="mt-1 text-app-body">{claim.claim}</p>
              </li>
            )) : (
              <li className="px-5 py-4 text-app-body text-[var(--text-secondary)]">
                Complete the candidate work to produce evidence.
              </li>
            )}
          </ul>
        </div>
        <div className="space-y-5">
          <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-app-section">What to ask next</h2>
            <ul className="mt-3 space-y-2">
              {(session.brief?.probes ?? [session.fixture.defenseQuestion.prompt]).map((probe) => (
                <li key={probe} className="text-app-body text-[var(--text-secondary)]">• {probe}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-app-section">Limitation</h2>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">
              This controlled scenario does not establish long-term project execution, production coding, or people management.
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <h2 className="text-app-section">Observed work timeline</h2>
        </div>
        <ol>
          {session.events.map((event) => (
            <li key={event.id} className="grid grid-cols-[52px_minmax(0,1fr)] border-b border-[var(--border-subtle)] px-5 py-2.5 text-app-body last:border-b-0">
              <span className="font-mono text-app-meta tabular-nums text-[var(--text-tertiary)]">{event.sequence}</span>
              <span className="text-[var(--text-secondary)]">{event.eventType.replaceAll("_", " ").toLowerCase()}</span>
            </li>
          ))}
        </ol>
      </div>
      {session.step === "review_pending" ? (
        <div className="mt-8 flex flex-wrap gap-2" aria-label="Review decision">
          {(["approve", "limit", "follow_up", "reject"] as const).map((decision) => (
            <button key={decision} type="button" className="h-9 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-[13px] capitalize" onClick={() => onReview(decision)}>
              {decision.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      ) : null}
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
          <p className="mt-1 text-app-meta text-[var(--text-secondary)]">Solutions Engineer</p>
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

function ReceiptSurface({ session, publicId }: { session: SandboxSessionView | null; publicId?: string }) {
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const id = publicId || session?.receiptPublicId;
    if (!id) return;
    void fetch(`/api/receipts/${id}`).then(async (res) => {
      const json = (await res.json()) as { receipt?: Record<string, unknown> };
      if (json.receipt) setReceipt(json.receipt);
    });
  }, [publicId, session?.receiptPublicId]);
  if (!receipt) {
    return <p className="text-app-body text-[var(--text-secondary)]">A work receipt is issued after review. It does not include a hiring recommendation.</p>;
  }
  return <WorkReceiptView receipt={receipt} />;
}
