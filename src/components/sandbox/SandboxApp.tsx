"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";
import { SandboxWorkbench } from "./SandboxWorkbench";
import { WorkReceiptView } from "./WorkReceiptView";

type Surface = "home" | "overview" | "simulation" | "evidence" | "receipt";

export function SandboxApp({
  surface,
  runId,
  publicId,
}: {
  surface: Surface;
  runId?: string;
  publicId?: string;
}) {
  const router = useRouter();
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
    void load();
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
    if (!window.confirm("Reset this sandbox? Persisted work for this visitor will be deleted.")) return;
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

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-band)] px-4 py-2 text-app-meta text-[var(--text-secondary)]">
        Fictional candidate data. Actions in this sandbox do not affect live hiring.
      </div>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
        <div>
          <p className="text-app-meta text-[var(--text-tertiary)]">Northstar · Acme rollout</p>
          <p className="text-app-section">Solutions Engineer sandbox</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-app-meta">
          <Link href="/sandbox">Home</Link>
          <Link href="/sandbox/overview">Overview</Link>
          <Link href="/sandbox/simulation">Simulation</Link>
          {session ? <Link href={`/sandbox/evidence/${session.runId}`}>Evidence</Link> : <span className="text-[var(--text-tertiary)]">Evidence</span>}
          {session?.receiptPublicId ? (
            <Link href={`/sandbox/receipts/${session.receiptPublicId}`}>Receipt</Link>
          ) : (
            <span className="text-[var(--text-tertiary)]">Receipt</span>
          )}
        </nav>
      </header>
      {error ? (
        <div className="border-b border-[var(--border-subtle)] px-4 py-3 text-app-body text-[var(--color-risk)]">
          {error}{" "}
          <button type="button" className="text-[var(--action-ink)]" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <button type="button" className="rounded-full bg-[var(--surface-paper)] px-3 py-1.5 text-[13px] text-[#111]" disabled={busy} onClick={() => void ensureSession().then((s) => s && act({ type: "start" }))}>
          Start
        </button>
        <button type="button" className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[13px]" disabled={busy || !session} onClick={() => void act({ type: "advance" })}>
          Next event
        </button>
        <button type="button" className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[13px]" disabled={!session || session.step === "finalized"} onClick={() => setAutoplay((v) => !v)}>
          {autoplay ? "Pause" : "Auto-play"}
        </button>
        <button type="button" className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[13px]" disabled={busy} onClick={() => void reset()}>
          Restart
        </button>
        <button type="button" className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[13px]" onClick={() => router.push("/sandbox/simulation")}>
          Open candidate view
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[13px]"
          disabled={!session}
          onClick={() => session && router.push(`/sandbox/evidence/${session.runId}`)}
        >
          Open employer view
        </button>
      </div>
      <main className="px-4 py-8">
        {surface === "home" || surface === "overview" ? <Overview session={session} onCreate={() => void ensureSession()} /> : null}
        {surface === "simulation" ? (
          <SandboxWorkbench session={session} busy={busy} onAction={(body) => void act(body)} onEnsure={() => void ensureSession()} />
        ) : null}
        {surface === "evidence" ? <EvidenceReport session={session} expectedRunId={runId} onReview={(decision) => void act({ type: "review", decision })} /> : null}
        {surface === "receipt" ? <ReceiptSurface session={session} publicId={publicId} /> : null}
      </main>
    </div>
  );
}

function Overview({ session, onCreate }: { session: SandboxSessionView | null; onCreate: () => void }) {
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="text-app-page">Watch one piece of work become evidence</h1>
      <p className="mt-4 text-app-body text-[var(--text-secondary)]">
        Candidate 1 recommends a 200-user production rollout for Acme. Security then blocks production access for six weeks. The candidate revises, defends the adoption assumption, and Fydell publishes an evidence report plus a work receipt derived from the same persisted events.
      </p>
      <p className="mt-4 text-app-body text-[var(--text-secondary)]">Current step: {session?.step ?? "no session"}</p>
      {!session ? (
        <button type="button" className="mt-6 rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]" onClick={onCreate}>
          Create sandbox
        </button>
      ) : null}
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
    <section className="mx-auto max-w-3xl">
      <h1 className="text-app-page">Should we interview this candidate?</h1>
      <p className="mt-3 text-app-body text-[var(--text-secondary)]">
        {session.brief?.why ?? "Evidence is still being assembled from this run. Advance the walkthrough through Pass B before treating this as a report."}
      </p>
      {session.labels.review ? (
        <p className="mt-4 rounded-[10px] border border-[var(--border-default)] px-4 py-3 text-app-body text-[var(--text-secondary)]">
          {session.labels.review}
        </p>
      ) : null}
      <ul className="mt-8 space-y-4">
        {session.claims.map((claim) => (
          <li key={claim.id} className="border-b border-[var(--border-subtle)] pb-4">
            <p className="text-app-meta text-[var(--text-tertiary)]">
              {claim.competency} · Pass {claim.pass} · {claim.direction}
            </p>
            <p className="mt-1 text-app-body">{claim.claim}</p>
          </li>
        ))}
      </ul>
      {session.step === "review_pending" ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {(["approve", "limit", "follow_up", "reject"] as const).map((decision) => (
            <button key={decision} type="button" className="rounded-full border border-[var(--border-default)] px-3 py-1.5 text-[13px]" onClick={() => onReview(decision)}>
              {decision}
            </button>
          ))}
        </div>
      ) : null}
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
