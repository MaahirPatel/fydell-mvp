"use client";

/**
 * Five-minute simulation runner.
 *
 * One problem, three steps (Inspect, Decide, Explain), one obvious action
 * per step. Dark navy header with the server-driven countdown, a small
 * three-stage progress row, a left context rail (brief, resources,
 * stakeholder), and a single scrolling main column. The stakeholder chat is
 * an overlay drawer, not a permanent sidebar. Everything autosaves; a
 * refresh restores answers, step, and the timer.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FydellMark from "@/components/brand/FydellMark";
import { ResourceViewer } from "./ResourceViewer";

const DISCLOSURE_KEY = "__aiDisclosure";

interface Disclosure {
  used: boolean;
  note?: string;
}
type Answer = string | number | string[] | Disclosure;

interface Question {
  id: string;
  kind: string;
  prompt: string;
  helpText?: string;
  options?: string[];
  maxChars?: number;
  points: number;
}
interface MicroContent {
  format: "micro";
  slug: string;
  roleKey: string;
  title: string;
  tagline: string;
  mission: string;
  companyName: string;
  durationMinutes: number;
  resources: { id: string; title: string; kind: string; content: string }[];
  stakeholder: { id: string; name: string; role: string; blurb: string };
  questions: Question[];
}
interface Message {
  id: string;
  thread: string;
  sender: string;
  body: string;
}
interface Payload {
  session: {
    id: string;
    status: string;
    durationMinutes: number;
    startedAt: string | null;
    endsAt: string | null;
  };
  content: MicroContent;
  state: {
    revision: number;
    currentTaskId: string | null;
    deliverable: Record<string, Answer>;
    workspace?: Record<string, unknown> | null;
  };
  messages: Message[];
}

const ROLE_TITLES: Record<string, string> = {
  data_analyst: "Data Analyst",
  bi_analyst: "Business Intelligence Analyst",
  solutions_engineer: "Solutions Engineer",
  implementation_consultant: "Implementation Consultant",
  technical_support_engineer: "Technical Support Engineer",
  business_systems_analyst: "Business Systems Analyst",
};

const STAGES = ["Inspect", "Decide", "Explain"] as const;

function uid() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isAnswered(v: Answer | undefined): boolean {
  return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
}

export function MicroRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [openedResources, setOpenedResources] = useState<string[]>([]);
  const [activeResource, setActiveResource] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "pending" | "error">("saved");
  const [now, setNow] = useState(() => Date.now());

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatDelivered, setChatDelivered] = useState(false);

  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const stepRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const drawerInputRef = useRef<HTMLTextAreaElement>(null);

  // ------------------------------------------------------------------ load
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the simulation");
      const p = data as Payload;
      setPayload(p);
      setMessages(p.messages.filter((m) => m.thread === "stakeholder"));
      revisionRef.current = p.state.revision;
      if (!dirtyRef.current) {
        setAnswers((p.state.deliverable || {}) as Record<string, Answer>);
        const savedStep = parseInt(p.state.currentTaskId || "0", 10);
        if (Number.isFinite(savedStep) && savedStep >= 0 && savedStep <= 2) {
          setStep(savedStep);
          stepRef.current = savedStep;
        }
        const opened = (p.state.workspace as { openedResources?: unknown } | null)?.openedResources;
        if (Array.isArray(opened)) {
          setOpenedResources(opened.filter((x): x is string => typeof x === "string"));
        }
      }
      setActiveResource((prev) => prev || p.content.resources[0]?.id || "");
      setLoadError(null);
      if (p.session.status === "submitted" || p.session.status === "analyzed" || p.session.status === "report_ready") {
        router.replace(`/sim/${sessionId}/result`);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load the simulation");
    }
  }, [sessionId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // -------------------------------------------------------------- autosave
  const persist = useCallback(async () => {
    if (savingRef.current || !dirtyRef.current) return;
    savingRef.current = true;
    dirtyRef.current = false;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseRevision: revisionRef.current,
          deliverable: answers,
          currentTaskId: String(stepRef.current),
          workspace: { openedResources },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        revisionRef.current = data.revision;
        setSaveStatus(dirtyRef.current ? "pending" : "saved");
      } else if (res.status === 409 && data.conflict) {
        revisionRef.current = data.conflict.revision;
        dirtyRef.current = true;
        setSaveStatus("pending");
      } else {
        dirtyRef.current = true;
        setSaveStatus("error");
      }
    } catch {
      dirtyRef.current = true;
      setSaveStatus("error");
    } finally {
      savingRef.current = false;
    }
  }, [sessionId, answers, openedResources]);

  useEffect(() => {
    if (!payload || payload.session.status !== "active" || !dirtyRef.current) return;
    const t = setTimeout(() => void persist(), 900);
    return () => clearTimeout(t);
  }, [answers, step, openedResources, payload, persist]);

  useEffect(() => {
    if (saveStatus !== "error") return;
    const t = setTimeout(() => void persist(), 3500);
    return () => clearTimeout(t);
  }, [saveStatus, persist]);

  const setAnswer = (id: string, value: Answer) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    dirtyRef.current = true;
    setSaveStatus("pending");
  };

  const goToStep = (s: number) => {
    setStep(s);
    stepRef.current = s;
    dirtyRef.current = true;
    setSaveStatus("pending");
    window.scrollTo({ top: 0 });
  };

  const openResource = (rid: string) => {
    setActiveResource(rid);
    setOpenedResources((prev) => {
      if (prev.includes(rid)) return prev;
      dirtyRef.current = true;
      setSaveStatus("pending");
      return [...prev, rid];
    });
    void fetch(`/api/sim/sessions/${sessionId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "resource_opened", resourceId: rid, clientEventId: `open_${rid}` }),
    }).catch(() => {});
  };

  // ------------------------------------------------------------------ chat
  useEffect(() => {
    if (drawerOpen) {
      chatEndRef.current?.scrollIntoView({ block: "end" });
      drawerInputRef.current?.focus();
    }
  }, [messages, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen && !exitOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setExitOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, exitOpen]);

  const sendChat = async () => {
    const text = chatDraft.trim();
    if (!text || chatBusy || !payload) return;
    setChatBusy(true);
    setChatError(null);
    setChatDelivered(false);
    const clientMsgId = uid();
    const optimistic: Message = { id: `local_${clientMsgId}`, thread: "stakeholder", sender: "candidate", body: text };
    setMessages((prev) => [...prev, optimistic]);
    setChatDraft("");
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stakeholderId: payload.content.stakeholder.id, text, clientMsgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Message failed to send");
      setMessages((prev) => {
        const rest = prev.filter((m) => m.id !== optimistic.id);
        const additions = [data.candidateMessage, data.reply].filter(Boolean) as Message[];
        return [...rest, ...additions];
      });
      setChatDelivered(true);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setChatDraft(text);
      setChatError(err instanceof Error ? err.message : "Message failed. Try again.");
    } finally {
      setChatBusy(false);
    }
  };

  // ---------------------------------------------------------------- submit
  const submit = async () => {
    if (submitBusy || !payload) return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      const rawDisclosure = answers[DISCLOSURE_KEY] as Disclosure | undefined;
      const note = rawDisclosure?.note?.trim();
      const disclosure: Disclosure = {
        used: Boolean(rawDisclosure?.used),
        ...(rawDisclosure?.used && note ? { note } : {}),
      };

      // Final flush so the saved state matches what we submit.
      for (let i = 0; i < 20 && savingRef.current; i++) {
        await new Promise((r) => setTimeout(r, 150));
      }
      dirtyRef.current = true;
      await persist();

      const res = await fetch(`/api/sim/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: { ...answers, [DISCLOSURE_KEY]: disclosure },
          externalAiDisclosed: disclosure.used,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      await fetch(`/api/sim/sessions/${sessionId}/analyze`, { method: "POST" }).catch(() => {});
      router.push(`/sim/${sessionId}/result`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Your work is saved.");
      setSubmitBusy(false);
    }
  };

  const startSession = async () => {
    setSubmitBusy(true);
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not start");
      }
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not start");
    } finally {
      setSubmitBusy(false);
    }
  };

  // ------------------------------------------------------------- rendering
  if (loadError)
    return (
      <Center>
        <p className="text-[15px] text-slate-700">{loadError}</p>
        <button
          onClick={() => void load()}
          className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Try again
        </button>
      </Center>
    );
  if (!payload)
    return (
      <Center>
        <p className="text-[15px] text-slate-500" role="status">
          Loading your simulation...
        </p>
      </Center>
    );

  const { content, session } = payload;
  const roleTitle = ROLE_TITLES[content.roleKey] || content.roleKey;

  // ---- pre-start ----------------------------------------------------------
  if (session.status === "accepted") {
    return (
      <Center wide>
        <p className="text-[12px] font-semibold uppercase tracking-wider text-violet-600">{roleTitle} · 5 minutes</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{content.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{content.mission}</p>
        <ul className="mt-5 space-y-2 text-[14px] text-slate-600">
          <li>· The 5-minute timer starts when you press Begin. Running out of time does not block submission.</li>
          <li>· Your answers save automatically. A refresh will not lose anything.</li>
          <li>
            · You can message {content.stakeholder.name} ({content.stakeholder.role}) at any time. Good questions
            count in your favor.
          </li>
          <li>· You get your result right after submitting.</li>
        </ul>
        <button
          onClick={() => void startSession()}
          disabled={submitBusy}
          className="mt-7 w-full rounded-xl bg-violet-600 px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {submitBusy ? "Setting up..." : "Begin: 5 minutes"}
        </button>
      </Center>
    );
  }

  const remainingMs = session.endsAt ? new Date(session.endsAt).getTime() - now : 0;
  const remaining = Math.max(0, Math.floor(remainingMs / 1000));
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const timeUp = remaining === 0;
  const locked = timeUp;

  const decideQuestions = content.questions.filter((q) => q.kind !== "text");
  const explainQuestion = content.questions.find((q) => q.kind === "text");
  const explainLimit = explainQuestion?.maxChars ?? 500;
  const explanation = explainQuestion ? String(answers[explainQuestion.id] ?? "") : "";

  const disclosure = (answers[DISCLOSURE_KEY] as Disclosure | undefined) ?? { used: false };
  const singleQ = decideQuestions.find((q) => q.kind === "single_select");
  const multiQ = decideQuestions.find((q) => q.kind === "multi_select");

  const resource = content.resources.find((r) => r.id === activeResource) || content.resources[0];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-40 bg-[#0d1730] text-white">
        <div className="mx-auto flex h-[60px] max-w-[1150px] items-center gap-4 px-4">
          <span className="inline-flex items-center gap-2" aria-label="Fydell">
            <FydellMark width={26} />
            <span
              className="text-[17px] leading-none tracking-tight text-[#F4F5F7]"
              style={{ fontWeight: 560, letterSpacing: "-0.045em" }}
            >
              fydell
            </span>
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-[13.5px] font-medium leading-tight">{content.title}</p>
            <p className="truncate text-[11.5px] text-slate-300">{roleTitle}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[12px] sm:inline" role="status" aria-live="polite">
              {saveStatus === "saved" && <span className="font-medium text-emerald-300">Saved</span>}
              {(saveStatus === "saving" || saveStatus === "pending") && (
                <span className="font-medium text-amber-300">Saving...</span>
              )}
              {saveStatus === "error" && (
                <button
                  onClick={() => void persist()}
                  className="rounded bg-red-500/20 px-2 py-0.5 font-medium text-red-200 hover:bg-red-500/30"
                >
                  Save failed. Retry
                </button>
              )}
            </span>
            <span
              className={`rounded-md px-2.5 py-1 font-mono text-[14px] font-semibold tabular-nums ${
                timeUp ? "bg-red-500/20 text-red-200" : remaining < 60 ? "bg-amber-400/20 text-amber-200" : "bg-white/10 text-white"
              }`}
              aria-label={timeUp ? "Time has ended" : `${mm} minutes ${ss} seconds remaining`}
            >
              {timeUp ? "0:00" : `${mm}:${ss}`}
            </span>
            <button
              onClick={() => setExitOpen(true)}
              className="rounded-lg border border-white/25 px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-white/10"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------------- progress */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-11 max-w-[1150px] items-center gap-1 px-4">
          {STAGES.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden className="mx-1 h-px w-6 bg-slate-300 sm:w-10" />}
              <button
                onClick={() => i < step && goToStep(i)}
                disabled={i >= step}
                aria-current={i === step ? "step" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium ${
                  i === step
                    ? "bg-violet-600 text-white"
                    : i < step
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                    i === step ? "bg-white/25" : i < step ? "bg-emerald-200" : "bg-slate-200"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                {label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {timeUp && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto max-w-[1150px] px-4 py-2 text-[13.5px] text-amber-800">
            Time has ended. Submit your current work. Nothing has been lost.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------- workspace */}
      <main className="mx-auto flex max-w-[1150px] flex-col gap-5 px-4 py-6 pb-16 lg:flex-row">
        {/* left context rail */}
        <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-[124px] lg:w-[240px] lg:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Your task</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-700">{content.mission}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resources</p>
            <ul className="mt-2 space-y-1">
              {content.resources.map((r) => {
                const opened = openedResources.includes(r.id);
                const active = resource?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => openResource(r.id)}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium ${
                        active ? "bg-violet-50 text-violet-800" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          opened ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {opened ? "✓" : "·"}
                      </span>
                      <span className="min-w-0 truncate">{r.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-violet-300"
          >
            <p className="text-[13.5px] font-semibold text-slate-900">Ask {content.stakeholder.name.split(" ")[0]}</p>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {content.stakeholder.role}. Good questions count in your favor.
            </p>
          </button>
        </aside>

        {/* main task column */}
        <div className="min-w-0 flex-1 space-y-4">
          {resource && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <p className="text-[13.5px] font-semibold text-slate-900">{resource.title}</p>
                <p className="text-[11.5px] text-slate-400">Resource</p>
              </div>
              <ResourceViewer kind={resource.kind === "table" ? "markdown" : resource.kind} content={resource.content} />
            </section>
          )}

          {/* --- Step 1: Inspect --------------------------------------- */}
          {step === 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Step 1 of 3</p>
              <h2 className="mt-1 text-[17px] font-semibold text-slate-900">Inspect the resources</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
                Read your task on the left, then open each resource and look for what matters. You have opened{" "}
                {openedResources.length} of {content.resources.length}. If something is unclear, ask{" "}
                {content.stakeholder.name.split(" ")[0]}.
              </p>
              <button
                onClick={() => goToStep(1)}
                className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-[15px] font-semibold text-white hover:bg-violet-700"
              >
                Continue to decision
              </button>
            </section>
          )}

          {/* --- Step 2: Decide ----------------------------------------- */}
          {step === 1 && (
            <>
              {decideQuestions.map((q, qi) => (
                <section key={q.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">
                    {qi === 0 ? "Step 2 of 3 · Decide" : "Decide"}
                  </p>
                  <h2 className="mt-1 text-[16px] font-semibold text-slate-900">{q.prompt}</h2>
                  {q.helpText && <p className="mt-1 text-[13.5px] text-slate-500">{q.helpText}</p>}

                  {q.kind === "single_select" && (
                    <div className="mt-4 space-y-2" role="radiogroup" aria-label={q.prompt}>
                      {(q.options || []).map((o) => (
                        <label
                          key={o}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] ${
                            answers[q.id] === o
                              ? "border-violet-500 bg-violet-50 text-slate-900"
                              : "border-slate-200 text-slate-700 hover:border-slate-300"
                          } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === o}
                            disabled={locked}
                            onChange={() => setAnswer(q.id, o)}
                            className="h-4 w-4 accent-violet-600"
                          />
                          {o}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.kind === "multi_select" && (
                    <div className="mt-4 space-y-2" role="group" aria-label={q.prompt}>
                      {(q.options || []).map((o) => {
                        const selected = Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(o);
                        return (
                          <label
                            key={o}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] ${
                              selected
                                ? "border-violet-500 bg-violet-50 text-slate-900"
                                : "border-slate-200 text-slate-700 hover:border-slate-300"
                            } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={locked}
                              onChange={() => {
                                const current = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                                setAnswer(q.id, selected ? current.filter((x) => x !== o) : [...current, o]);
                              }}
                              className="h-4 w-4 accent-violet-600"
                            />
                            {o}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.kind === "number" && (
                    <input
                      type="number"
                      step="any"
                      value={answers[q.id] === undefined ? "" : String(answers[q.id])}
                      disabled={locked}
                      onChange={(e) => setAnswer(q.id, e.target.value === "" ? "" : Number(e.target.value))}
                      aria-label={q.prompt}
                      className="mt-4 w-56 rounded-xl border border-slate-300 px-3 py-3 font-mono text-[15px] focus:border-violet-500 focus:outline-none disabled:bg-slate-50"
                    />
                  )}
                </section>
              ))}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToStep(0)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={() => goToStep(2)}
                  className="rounded-xl bg-violet-600 px-5 py-3 text-[15px] font-semibold text-white hover:bg-violet-700"
                >
                  Continue to explanation
                </button>
              </div>
            </>
          )}

          {/* --- Step 3: Explain ----------------------------------------- */}
          {step === 2 && (
            <>
              {explainQuestion && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Step 3 of 3 · Explain</p>
                  <h2 className="mt-1 text-[16px] font-semibold text-slate-900">{explainQuestion.prompt}</h2>
                  {explainQuestion.helpText && (
                    <p className="mt-1 text-[13.5px] text-slate-500">{explainQuestion.helpText}</p>
                  )}
                  <textarea
                    value={explanation}
                    disabled={locked}
                    onChange={(e) => setAnswer(explainQuestion.id, e.target.value.slice(0, explainLimit))}
                    rows={5}
                    maxLength={explainLimit}
                    aria-label={explainQuestion.prompt}
                    className="mt-4 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-[15px] leading-relaxed focus:border-violet-500 focus:outline-none disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-right text-[12px] text-slate-400" aria-live="polite">
                    {explanation.length} / {explainLimit}
                  </p>
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-[16px] font-semibold text-slate-900">Review before you submit</h2>
                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Your decision</dt>
                    <dd className="mt-0.5 text-[15px] text-slate-800">
                      {singleQ && isAnswered(answers[singleQ.id]) ? String(answers[singleQ.id]) : "Not chosen yet. Go back to Decide."}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Evidence you selected</dt>
                    <dd className="mt-0.5 text-[15px] text-slate-800">
                      {multiQ && Array.isArray(answers[multiQ.id]) && (answers[multiQ.id] as string[]).length > 0 ? (
                        <ul className="list-disc space-y-0.5 pl-5">
                          {(answers[multiQ.id] as string[]).map((v) => (
                            <li key={v}>{v}</li>
                          ))}
                        </ul>
                      ) : (
                        "Nothing selected yet. Go back to Decide."
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Your explanation</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-[15px] text-slate-800">
                      {explanation.trim() || "Not written yet."}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={disclosure.used}
                    onChange={(e) =>
                      setAnswer(DISCLOSURE_KEY, { used: e.target.checked, note: disclosure.note })
                    }
                    className="mt-0.5 h-4 w-4 accent-violet-600"
                  />
                  <span className="text-[15px] text-slate-800">
                    I used an external AI tool while completing this simulation.
                  </span>
                </label>
                {disclosure.used && (
                  <input
                    type="text"
                    value={disclosure.note ?? ""}
                    onChange={(e) => setAnswer(DISCLOSURE_KEY, { used: true, note: e.target.value.slice(0, 200) })}
                    maxLength={200}
                    placeholder="Optional: which tool and how you used it"
                    aria-label="How you used the AI tool (optional)"
                    className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[14px] focus:border-violet-500 focus:outline-none"
                  />
                )}
                <p className="mt-3 text-[12.5px] text-slate-500">
                  Disclosure is welcome. It does not lower your score by itself.
                </p>
              </section>

              {submitError && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700" role="alert">
                  {submitError}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToStep(1)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  onClick={() => void submit()}
                  disabled={submitBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-[15px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {submitBusy && <Spinner />}
                  {submitBusy ? "Submitting..." : "Submit my work"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ------------------------------------------------------ chat drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Message ${content.stakeholder.name}`}>
          <button aria-label="Close conversation" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold text-slate-900">{content.stakeholder.name}</p>
                <p className="text-[12.5px] text-slate-500">
                  {content.stakeholder.role} · {content.companyName}
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg px-2.5 py-1 text-[13px] font-medium text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <p className="text-[13.5px] text-slate-400">{content.stakeholder.blurb} Ask about anything that seems unclear.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                    m.sender === "candidate" ? "ml-auto bg-violet-600 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              ))}
              {chatBusy && (
                <p className="flex items-center gap-2 text-[12px] text-slate-400" role="status">
                  <Spinner dark /> Sending...
                </p>
              )}
              {!chatBusy && !chatError && chatDelivered && (
                <p className="text-right text-[11.5px] text-slate-400" role="status">
                  Delivered
                </p>
              )}
              <div ref={chatEndRef} />
            </div>
            {chatError && (
              <div className="flex items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-5 py-2">
                <p className="text-[12.5px] text-red-700">{chatError}</p>
                <button
                  onClick={() => void sendChat()}
                  className="shrink-0 rounded-lg bg-red-600 px-3 py-1 text-[12px] font-semibold text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}
            <form
              className="flex shrink-0 items-end gap-2 border-t border-slate-200 bg-white p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void sendChat();
              }}
            >
              <textarea
                ref={drawerInputRef}
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder={`Message ${content.stakeholder.name.split(" ")[0]}...`}
                aria-label="Message"
                className="min-h-[46px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-[14px] focus:border-violet-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!chatDraft.trim() || chatBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
              >
                {chatBusy && <Spinner />}
                Send
              </button>
            </form>
          </aside>
        </div>
      )}

      {/* ------------------------------------------------------- exit dialog */}
      {exitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Leave this simulation?">
          <button aria-label="Stay" onClick={() => setExitOpen(false)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-[16px] font-semibold text-slate-900">Leave this simulation?</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
              Your work is saved and you can come back. The timer keeps running while you are away.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setExitOpen(false)}
                autoFocus
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Stay
              </button>
              <button
                onClick={() => router.push("/app/candidate")}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-violet-700"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-t-transparent ${
        dark ? "border-slate-400" : "border-white/70"
      }`}
    />
  );
}

function Center({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-2xl border border-slate-200 bg-white p-8 shadow-sm`}>
        {children}
      </div>
    </div>
  );
}
