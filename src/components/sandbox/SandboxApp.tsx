"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  CircleHelp,
  CirclePlay,
  Crosshair,
  FileCheck2,
  House,
  ReceiptText,
  Search,
  Settings,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";
import { DemoGuide, GUIDE_BY_SURFACE } from "./DemoGuide";
import { SandboxEvidence } from "./SandboxEvidence";
import { SandboxLiveSimulation } from "./SandboxLiveSimulation";
import { SandboxWorkReceipt } from "./SandboxWorkReceipt";
import { FIXTURE_LABEL } from "./sample-artifacts";

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

export function SandboxApp({ surface }: { surface: Surface; runId?: string; publicId?: string }) {
  const [session, setSession] = useState<SandboxSessionView | null>(null);
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
    { label: "Overview", href: "/sandbox", icon: House, active: surface === "home" },
    {
      label: "Role calibration",
      href: "/sandbox/roles",
      icon: Crosshair,
      active: surface === "roles" || surface === "overview" || surface === "candidates",
    },
    {
      label: "Live simulation",
      href: "/sandbox/work",
      icon: CirclePlay,
      active: surface === "work" || surface === "simulation",
    },
    {
      label: "Evidence",
      href: session ? `/sandbox/evidence/${session.runId}` : "/sandbox/evidence",
      icon: FileCheck2,
      active: surface === "evidence" || surface === "outcomes",
    },
    {
      label: "Work receipt",
      href: session?.receiptPublicId ? `/sandbox/receipts/${session.receiptPublicId}` : "/sandbox/receipts",
      icon: ReceiptText,
      active: surface === "receipt",
    },
  ];

  const guideKey =
    surface === "work" || surface === "simulation"
      ? "simulation"
      : surface === "evidence"
        ? "evidence"
        : surface === "receipt"
          ? "receipt"
          : null;
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
          className="inline-flex h-[22px] items-center rounded-[var(--radius-tag)] bg-[var(--control-solid)] px-2.5 text-[11.5px] font-medium text-[var(--control-solid-ink)]"
        >
          Use Fydell with your team
        </Link>
      </div>

      <div className="sticky top-[30px] z-40 flex h-12 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4">
        <Link href="/sandbox" className="inline-flex items-center gap-2" aria-label="Fydell sandbox home">
          <FydellMark width={22} />
          <span className="text-[15px] font-semibold tracking-[-0.026em]">fydell</span>
        </Link>
        <span className="ml-4 inline-flex items-center gap-1.5 text-app-body text-[var(--text-secondary)]">
          Northstar sandbox
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
        </span>
        <label className="ml-auto hidden h-8 min-w-[220px] items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-default)] px-2.5 text-app-meta text-[var(--text-tertiary)] md:flex">
          <Search className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
          <input
            type="search"
            placeholder="Search"
            className="w-full bg-transparent text-app-meta text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </label>
        <CircleHelp className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
        <Settings className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
      </div>

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
          <p className="px-2.5 text-app-meta text-[var(--text-tertiary)]">{FIXTURE_LABEL}</p>
        </aside>

        <div className="min-w-0 flex-1">
          {error ? (
            <div className="border-b border-[var(--border-subtle)] px-5 py-3 text-app-body text-[var(--color-risk)] md:px-8">
              {error}{" "}
              <button type="button" className="text-[var(--action-ink)]" onClick={() => void load()}>
                Retry
              </button>
            </div>
          ) : null}

          <main className="px-5 py-7 md:px-8 lg:py-9">
            <div className="mx-auto w-full max-w-[1240px]">
              {surface === "home" ? <SandboxHome session={session} onCreate={() => void ensureSession()} /> : null}
              {surface === "roles" || surface === "overview" ? <SandboxRole session={session} /> : null}
              {surface === "candidates" ? <SandboxCandidates session={session} onCreate={() => void ensureSession()} /> : null}
              {surface === "work" || surface === "simulation" ? <SandboxLiveSimulation /> : null}
              {surface === "evidence" ? <SandboxEvidence /> : null}
              {surface === "receipt" ? <SandboxWorkReceipt /> : null}
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

