"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import type {
  GeneratedSimulation,
  SimulationNotification,
  SimulationTask
} from "@/lib/platform-types";

function fmt(seconds: number) {
  const t = Math.max(0, seconds);
  const m = String(Math.floor(t / 60)).padStart(2, "0");
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return `${m}:${s}`;
}

export default function ImmersiveWorkstation({
  simulation,
  kiosk
}: {
  simulation: GeneratedSimulation;
  kiosk: boolean;
}) {
  const totalSec = simulation.durationMinutes * 60;
  const [elapsed, setElapsed] = useState(0);
  const [docId, setDocId] = useState(simulation.documents[0]?.id ?? "");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [managerSubmitted, setManagerSubmitted] = useState(false);
  const [phase, setPhase] = useState<"work" | "final" | "done">("work");
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const remaining = totalSec - elapsed;
  const managerTrigger =
    (simulation.notifications.find((n) => n.stage === "manager_read")?.triggerMinute ?? 16) * 60;
  const managerMin =
    simulation.notifications.find((n) => n.stage === "manager_read")?.minChars ?? 50;

  const visibleNotifs = simulation.notifications.filter(
    (n) => elapsed >= n.triggerMinute * 60
  );

  const isTaskDone = (t: SimulationTask) => {
    const v = (responses[t.id] || "").trim();
    if (t.minChars) return v.length >= t.minChars;
    return v.length > 0;
  };

  const workbookComplete = simulation.tasks.every(isTaskDone);
  const managerBlocked = elapsed >= managerTrigger && !managerSubmitted;

  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(stream.getVideoTracks().some((t) => t.enabled));
      setMicOn(stream.getAudioTracks().some((t) => t.enabled));
      setMediaError(null);
    } catch {
      setMediaError("Camera/microphone access was denied. You can still complete the simulation.");
    }
  }, []);

  useEffect(() => {
    if (kiosk) startMedia();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [kiosk, startMedia]);

  useEffect(() => {
    if (phase !== "work") return;
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = Math.min(totalSec, e + 1);
        if (next >= totalSec) {
          if (!managerBlocked && workbookComplete) setPhase("final");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, totalSec, managerBlocked, workbookComplete]);

  useEffect(() => {
    if (!kiosk) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [kiosk]);

  function requestFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  function submitManagerRead() {
    const t = (responses.manager_read || "").trim();
    if (t.length < managerMin) return;
    setManagerSubmitted(true);
  }

  function tryFinish() {
    if (managerBlocked) return;
    if (!workbookComplete) return;
    setPhase("final");
  }

  const activeDoc = simulation.documents.find((d) => d.id === docId);

  if (phase === "done") {
    return (
      <div className="immersive-bg flex min-h-screen flex-col items-center justify-center px-6 text-center text-white">
        <Logo size={28} variant="dark" />
        <h1 className="mt-6 font-serif text-3xl">Session complete</h1>
        <p className="mt-3 max-w-md text-white/65">
          Your responses have been captured. Close this window to return to your dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="immersive-bg flex min-h-screen flex-col text-white">
      {kiosk && (
        <div className="kiosk-banner">
          Focused session - stay in this window. Leaving may be logged.{" "}
          <button type="button" className="underline" onClick={requestFullscreen}>
            Enter fullscreen
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full flex-col border-b border-white/10 bg-[#12121a] px-5 py-5 lg:w-72 lg:border-b-0 lg:border-r">
          <Logo size={22} variant="dark" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/40">Scenario</p>
          <h1 className="mt-1 text-lg leading-snug">{simulation.title}</h1>
          <p className="text-sm text-white/50">{simulation.role}</p>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/40">Time</p>
          <p className="font-display text-4xl font-bold tabular text-[#8eb0ff]">{fmt(remaining)}</p>

          {kiosk && (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-xs font-semibold uppercase text-white/45">Proctoring</p>
              <div className="mt-2 overflow-hidden rounded-lg bg-black aspect-video">
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <span className={camOn ? "text-teal" : "text-white/40"}>● Cam</span>
                <span className={micOn ? "text-teal" : "text-white/40"}>● Mic</span>
              </div>
              {mediaError && <p className="mt-2 text-xs text-coral-200">{mediaError}</p>}
              {!streamRef.current && (
                <button type="button" className="platform-btn-ghost mt-2 !h-8 w-full !text-xs" onClick={startMedia}>
                  Enable camera & mic
                </button>
              )}
            </div>
          )}

          <div className="mt-6 text-xs text-white/45">
            Workbook: {simulation.tasks.filter(isTaskDone).length}/{simulation.tasks.length}
          </div>

          {phase === "work" && (
            <button
              type="button"
              onClick={tryFinish}
              disabled={!workbookComplete || managerBlocked}
              className="platform-btn-primary mt-6 w-full disabled:opacity-40"
            >
              Submit workbook
            </button>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6">
          {phase === "work" ? (
            <div className="mx-auto max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
                <p className="text-xs font-semibold uppercase text-teal">Mandate</p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{simulation.scenarioHeader}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {simulation.documents.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDocId(d.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      docId === d.id ? "bg-white text-[#0a0a0f]" : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    {d.title}
                  </button>
                ))}
              </div>

              {activeDoc && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0e1a]/95 p-6 text-white shadow-lg">
                  <h2 className="text-xl text-white">{activeDoc.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#9aa4b8]">{activeDoc.content}</p>
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-teal/30 bg-teal/5 p-6">
                <p className="text-xs font-semibold uppercase text-teal">Your workbook</p>
                <div className="mt-4 grid gap-4">
                  {simulation.tasks.map((task) => (
                    <TaskField
                      key={task.id}
                      task={task}
                      value={responses[task.id] ?? ""}
                      onChange={(v) => setResponses((r) => ({ ...r, [task.id]: v }))}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs text-white/50">
                  Read each document tab above, then complete every workbook field below.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl">
              <h2 className="font-serif text-2xl">Final reflections</h2>
              <div className="mt-6 grid gap-4">
                {simulation.finalQuestions.map((q, i) => (
                  <div key={q.stage} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <label className="block text-sm font-medium">
                      <span className="text-teal">{i + 1}.</span> {q.prompt}
                    </label>
                    <textarea
                      className="platform-input mt-2 min-h-[100px]"
                      value={responses[q.stage] ?? ""}
                      onChange={(e) =>
                        setResponses((r) => ({ ...r, [q.stage]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="platform-btn-primary mt-6"
                onClick={() => setPhase("done")}
              >
                Submit final response
              </button>
            </div>
          )}
        </main>

        {/* Updates rail */}
        {phase === "work" && (
          <aside className="w-full border-t border-white/10 bg-[#0e0e14] lg:w-80 lg:border-t-0 lg:border-l">
            <p className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white/45">
              Updates
            </p>
            <div className="space-y-3 p-4">
              {visibleNotifs.length === 0 ? (
                <p className="text-sm text-white/40">Complete workbook fields while you wait for pings.</p>
              ) : (
                visibleNotifs.map((n) => (
                  <NotifCard
                    key={n.stage}
                    n={n}
                    value={responses[n.stage] ?? ""}
                    onChange={(v) => setResponses((r) => ({ ...r, [n.stage]: v }))}
                    isManagerGate={n.stage === "manager_read"}
                    managerSubmitted={managerSubmitted}
                    managerMin={managerMin}
                    onSubmitManagerRead={submitManagerRead}
                  />
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function TaskField({
  task,
  value,
  onChange
}: {
  task: SimulationTask;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white/85">{task.label}</span>
      {task.type === "textarea" ? (
        <>
          <textarea
            className="platform-input mt-1.5 min-h-[88px]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={task.placeholder}
          />
          {task.minChars && (
            <p className="mt-1 text-xs text-white/40">
              {value.trim().length}/{task.minChars} characters
            </p>
          )}
        </>
      ) : task.type === "select" ? (
        <select
          className="platform-select mt-1.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {task.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : task.type === "radio" ? (
        <div className="mt-2 grid gap-2">
          {task.options?.map((o) => (
            <label
              key={o.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                value === o.value ? "border-teal/50 bg-teal/10" : "border-white/10"
              }`}
            >
              <input
                type="radio"
                name={task.id}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      ) : (
        <input
          className="platform-input mt-1.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={task.placeholder}
        />
      )}
    </label>
  );
}

function NotifCard({
  n,
  value,
  onChange,
  isManagerGate,
  managerSubmitted,
  managerMin,
  onSubmitManagerRead
}: {
  n: SimulationNotification;
  value: string;
  onChange: (v: string) => void;
  isManagerGate: boolean;
  managerSubmitted: boolean;
  managerMin: number;
  onSubmitManagerRead: () => void;
}) {
  const ready = value.trim().length >= (n.minChars ?? 0);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm">
      <p className="text-xs font-semibold text-teal">{n.from}</p>
      <p className="mt-1 text-white/75">{n.body}</p>
      <textarea
        className="platform-input mt-2 min-h-[72px] !text-sm"
        value={value}
        disabled={isManagerGate && managerSubmitted}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your response..."
      />
      {isManagerGate && !managerSubmitted && (
        <button
          type="button"
          disabled={!ready}
          onClick={onSubmitManagerRead}
          className="platform-btn-primary mt-2 !h-8 !text-xs disabled:opacity-40"
        >
          Send to manager ({value.trim().length}/{managerMin})
        </button>
      )}
      {isManagerGate && managerSubmitted && (
        <p className="mt-2 text-xs text-teal">Sent - Stage 2 unlocked</p>
      )}
    </div>
  );
}
