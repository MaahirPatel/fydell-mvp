"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import DcfTab from "./tabs/DcfTab";
import CreditTab from "./tabs/CreditTab";
import PresentationTab from "./tabs/PresentationTab";
import {
  FINAL_QUESTIONS,
  NOTIFICATIONS,
  SCENARIO_HEADER,
  SCENARIO_TITLE,
  SIMULATION_SECONDS,
  type ScenarioNotification
} from "@/lib/scenario";
import type { Stage } from "@/lib/types";

type Phase = "work" | "final" | "done";
type TabKey = "dcf" | "credit" | "mgmt";

const TABS: { key: TabKey; label: string }[] = [
  { key: "dcf", label: "DCF Model" },
  { key: "credit", label: "Credit Agreement" },
  { key: "mgmt", label: "Management Presentation" }
];

const MANAGER_NOTIFICATION = NOTIFICATIONS.find((n) => n.stage === "manager_read");
const MANAGER_TRIGGER_SECONDS = (MANAGER_NOTIFICATION?.triggerMinute ?? 16) * 60;
const MANAGER_MIN_CHARS = MANAGER_NOTIFICATION?.minChars ?? 50;
const MANAGER_GATE_MESSAGE =
  "Send your preliminary read to the manager before submitting.";

function isManagerGateBlocking(elapsedSeconds: number, submitted: boolean): boolean {
  return elapsedSeconds >= MANAGER_TRIGGER_SECONDS && !submitted;
}

interface Props {
  token: string;
  candidateName: string;
  employerName: string;
  role: string;
  demo: boolean;
}

function fmt(total: number): string {
  const t = Math.max(0, total);
  const mm = Math.floor(t / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function Simulation({
  token,
  candidateName,
  employerName,
  role,
  demo
}: Props) {
  const router = useRouter();

  // ---- clock (counts scenario-seconds elapsed) ----------------------------
  const tickMs = demo ? 200 : 1000;
  const tickAmount = demo ? 6 : 1;
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const remaining = SIMULATION_SECONDS - elapsed;

  // ---- state --------------------------------------------------------------
  const [phase, setPhase] = useState<Phase>("work");
  const [tab, setTab] = useState<TabKey>("dcf");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<Record<string, "idle" | "saving" | "saved">>(
    {}
  );
  const [managerSubmitted, setManagerSubmitted] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [finalSubmitting, setFinalSubmitting] = useState(false);
  const [finalError, setFinalError] = useState<string | null>(null);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const managerSubmittedRef = useRef(managerSubmitted);
  managerSubmittedRef.current = managerSubmitted;

  // ---- timer effect -------------------------------------------------------
  // The interval owns both ticking the clock and auto-advancing to the final
  // questions when time runs out (setState lives in the interval callback, not
  // the effect body). Only runs during the work phase.
  useEffect(() => {
    if (phase !== "work") return;
    const id = setInterval(() => {
      const next = Math.min(SIMULATION_SECONDS, elapsedRef.current + tickAmount);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= SIMULATION_SECONDS) {
        const blocked = isManagerGateBlocking(next, managerSubmittedRef.current);
        if (blocked) {
          setGateMessage(MANAGER_GATE_MESSAGE);
        } else {
          setGateMessage(null);
          setPhase("final");
        }
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [phase, tickMs, tickAmount]);

  // ---- response autosave --------------------------------------------------
  const persist = useCallback(
    async (stage: Stage, text: string) => {
      setSaveState((s) => ({ ...s, [stage]: "saving" }));
      try {
        await fetch(`/api/apply/${token}/response`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage, text })
        });
        setSaveState((s) => ({ ...s, [stage]: "saved" }));
      } catch {
        setSaveState((s) => ({ ...s, [stage]: "idle" }));
      }
    },
    [token]
  );

  const onChangeResponse = useCallback(
    (stage: Stage, text: string) => {
      setResponses((r) => ({ ...r, [stage]: text }));
      setSaveState((s) => ({ ...s, [stage]: "saving" }));
      clearTimeout(saveTimers.current[stage]);
      saveTimers.current[stage] = setTimeout(() => persist(stage, text), 800);
    },
    [persist]
  );

  // ---- visible notifications ----------------------------------------------
  const visibleNotifications = useMemo(
    () => NOTIFICATIONS.filter((n) => elapsed >= n.triggerMinute * 60),
    [elapsed]
  );

  const managerGateReady = (responses.manager_read ?? "").trim().length >= MANAGER_MIN_CHARS;

  function submitManagerRead() {
    if (!managerGateReady) return;
    setManagerSubmitted(true);
    clearTimeout(saveTimers.current.manager_read);
    persist("manager_read", responses.manager_read ?? "");
  }

  // ---- stage indicators ---------------------------------------------------
  const currentStage = phase === "final" ? 3 : managerSubmitted ? 2 : 1;

  // ---- finishing ----------------------------------------------------------
  function tryFinish() {
    if (isManagerGateBlocking(elapsed, managerSubmitted)) {
      setGateMessage(MANAGER_GATE_MESSAGE);
      return;
    }
    setGateMessage(null);
    setPhase("final");
  }

  async function submitFinal() {
    if (isManagerGateBlocking(elapsed, managerSubmitted)) {
      setFinalError(MANAGER_GATE_MESSAGE);
      return;
    }
    setFinalSubmitting(true);
    setFinalError(null);
    try {
      const res = await fetch(`/api/apply/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          timeSpentSeconds: Math.min(SIMULATION_SECONDS, elapsed)
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit. Please try again.");
      }
      setPhase("done");
      router.push(`/apply/${token}/complete`);
    } catch (err) {
      setFinalError(err instanceof Error ? err.message : "Could not submit.");
      setFinalSubmitting(false);
    }
  }

  const timerUrgent = remaining <= 120;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#03050d]">
      {/* ---------------- Sidebar ---------------- */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/[0.08] bg-[#060914] px-6 py-7 text-white">
        <Logo size={24} variant="dark" />

        <div className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
            Scenario
          </p>
          <h1 className="mt-1.5 text-lg leading-snug text-white">{SCENARIO_TITLE}</h1>
          <p className="mt-1 text-sm text-white/55">
            {employerName} | {role}
          </p>
        </div>

        <div className="mt-9">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
            Time remaining
          </p>
          <div
            className={`mt-1 font-display text-5xl font-bold tabular ${
              timerUrgent ? "text-[#67e8f9] animate-pulse-dot" : "text-[#8eb0ff]"
            }`}
          >
            {fmt(remaining)}
          </div>
        </div>

        <div className="mt-9 grid gap-2.5">
          {[1, 2, 3].map((n) => {
            const active = n <= currentStage;
            const current = n === currentStage && phase !== "final";
            return (
              <div
                key={n}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
                  active
                    ? "border-teal/40 bg-teal/15"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold tabular ${
                    active ? "bg-teal text-navy" : "bg-white/10 text-white/40"
                  }`}
                >
                  {n}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    active ? "text-white" : "text-white/40"
                  }`}
                >
                  Stage {n}
                  {current && (
                    <span className="ml-1 text-xs font-normal text-teal">now</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-6">
          {gateMessage && (
            <p className="mb-3 text-sm text-coral">{gateMessage}</p>
          )}
          {phase === "work" && (
            <button
              onClick={tryFinish}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#5b8cff] to-[#7c5cff] px-5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
            >
              Submit Simulation
            </button>
          )}
          <p className="mt-3 text-xs leading-relaxed text-white/40">
            Use any tools you want, including AI. We measure your reasoning.
          </p>
        </div>
      </aside>

      {/* ---------------- Center: materials or final ---------------- */}
      <main className="flex-1 overflow-y-auto scroll-slim bg-[radial-gradient(circle_at_70%_0%,rgba(124,92,255,0.14),transparent_32%),linear-gradient(180deg,#07101f,#03050d)] px-8 py-7">
        {phase === "work" ? (
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8fa2ff]">
                Mandate from your manager
              </p>
              <p className="mt-2 text-[0.97rem] leading-relaxed text-white/68">
                {SCENARIO_HEADER}
              </p>
            </div>

            {/* Tab bar */}
            <div className="sticky top-0 z-10 mt-6 flex gap-1 rounded-xl border border-white/[0.08] bg-[#060914]/88 p-1 backdrop-blur">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    tab === t.key
                      ? "bg-[#7c5cff]/24 text-white"
                      : "text-white/48 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#060914]/80 p-6 shadow-[var(--shadow-card)]">
              {tab === "dcf" && <DcfTab />}
              {tab === "credit" && <CreditTab />}
              {tab === "mgmt" && <PresentationTab />}
            </div>
          </div>
        ) : (
          <FinalQuestions
            candidateName={candidateName}
            responses={responses}
            onChange={onChangeResponse}
            onSubmit={submitFinal}
            submitting={finalSubmitting}
            error={finalError}
          />
        )}
      </main>

      {/* ---------------- Right rail: Updates ---------------- */}
      {phase === "work" && (
        <aside className="flex w-[380px] shrink-0 flex-col border-l border-white/[0.08] bg-[#060914]">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">
              Updates
            </h2>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto scroll-slim p-5">
            {visibleNotifications.length === 0 ? (
              <p className="mt-6 text-center text-sm text-white/42">
                No updates yet. A colleague may reach out as you work.
              </p>
            ) : (
              visibleNotifications.map((n) => (
                <NotificationCard
                  key={n.stage}
                  n={n}
                  value={responses[n.stage] ?? ""}
                  saveState={saveState[n.stage] ?? "idle"}
                  onChange={(text) => onChangeResponse(n.stage, text)}
                  isManagerGate={n.stage === "manager_read"}
                  managerSubmitted={managerSubmitted}
                  managerResponseReady={managerGateReady}
                  onSubmitManagerRead={submitManagerRead}
                />
              ))
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

// ===========================================================================
function NotificationCard({
  n,
  value,
  saveState,
  onChange,
  isManagerGate,
  managerSubmitted,
  managerResponseReady,
  onSubmitManagerRead
}: {
  n: ScenarioNotification;
  value: string;
  saveState: "idle" | "saving" | "saved";
  onChange: (text: string) => void;
  isManagerGate: boolean;
  managerSubmitted: boolean;
  managerResponseReady: boolean;
  onSubmitManagerRead: () => void;
}) {
  const isMarket = n.kind === "market";
  return (
    <div className="animate-slide-in rounded-2xl border border-white/[0.08] bg-[#07101f] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div
        className={`flex items-center gap-2 rounded-t-2xl border-b border-white/[0.06] px-4 py-2.5 text-xs font-semibold ${
          isMarket ? "bg-[#f5b942]/10 text-[#f5b942]" : "bg-[#7c5cff]/10 text-[#b8a9ff]"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${isMarket ? "bg-[#f5b942]" : "bg-[#7c5cff]"}`}
        />
        {isMarket ? "Market Update" : `From: ${n.from}`}
      </div>
      <div className="px-4 py-3">
        <p className="text-sm leading-relaxed text-white/66">{n.body}</p>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-white/62">
            {n.responseLabel}
          </span>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isManagerGate && managerSubmitted}
            rows={isManagerGate ? 4 : 3}
            placeholder="Type your response..."
            className="mt-1.5 w-full resize-y rounded-xl border border-white/[0.08] bg-[#03050d] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/28 focus:border-[#7c5cff] disabled:opacity-60"
          />
        </label>

        <div className="mt-2 flex items-center justify-between">
          {isManagerGate ? (
            managerSubmitted ? (
              <span className="text-xs font-semibold text-[#3dd68c]">
                Sent to manager - Stage 2 unlocked
              </span>
            ) : (
              <span
                className={`text-xs ${
                  managerResponseReady ? "text-[#3dd68c]" : "text-white/38"
                }`}
              >
                {value.trim().length}/{MANAGER_MIN_CHARS} characters
              </span>
            )
          ) : (
            <span className="text-xs text-white/38">
              {saveState === "saving"
                ? "Saving..."
                : saveState === "saved"
                  ? "Saved"
                  : "Optional"}
            </span>
          )}

          {isManagerGate && !managerSubmitted && (
            <button
              onClick={onSubmitManagerRead}
              disabled={!managerResponseReady}
              className="inline-flex h-9 items-center rounded-lg bg-gradient-to-r from-[#5b8cff] to-[#7c5cff] px-4 text-sm font-semibold text-white transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Send & proceed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
function FinalQuestions({
  candidateName,
  responses,
  onChange,
  onSubmit,
  submitting,
  error
}: {
  candidateName: string;
  responses: Record<string, string>;
  onChange: (stage: Stage, text: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#8fa2ff]">
        Final reflections
      </p>
      <h1 className="mt-1 text-2xl text-white">
        Three last questions{candidateName ? `, ${candidateName.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-2 text-white/58">
        Take a moment. These tell us more than any model output.
      </p>

      <div className="mt-7 grid gap-5">
        {FINAL_QUESTIONS.map((q, i) => (
          <div
            key={q.stage}
            className="rounded-2xl border border-white/[0.08] bg-[#060914]/82 p-5 shadow-[var(--shadow-card)]"
          >
            <label className="block">
              <span className="flex items-baseline gap-2 text-base font-semibold text-white">
                <span className="text-[#8fa2ff] tabular">{i + 1}.</span>
                {q.prompt}
              </span>
              <textarea
                value={responses[q.stage] ?? ""}
                onChange={(e) => onChange(q.stage, e.target.value)}
                rows={4}
                placeholder="Your answer..."
                className="mt-3 w-full resize-y rounded-xl border border-white/[0.08] bg-[#03050d] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#7c5cff]"
              />
            </label>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral-600">
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-6 inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5b8cff] to-[#7c5cff] px-8 font-semibold text-white shadow-[0_18px_44px_rgba(124,92,255,0.24)] transition-all duration-200 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {submitting && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        Submit Final Response
      </button>
    </div>
  );
}
