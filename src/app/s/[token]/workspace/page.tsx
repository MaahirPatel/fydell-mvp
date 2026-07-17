"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FydellBrand from "@/components/brand/FydellBrand";
import type { CommandResult, ExecutionProvider, FileMap } from "@/lib/relay/execution-provider";
import { fetchSession, patchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";

type ChatMessage = { id: string; actor: string; text: string; at: string };

type EventRow = {
  id: string;
  sequence_number: number;
  actor: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

const HEARTBEAT_MS = 20_000;
const AUTOSAVE_MS = 15_000;
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function localKey(sessionId: string) {
  return `relay-session-${sessionId}`;
}

function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export default function RelayWorkspacePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [missionTitle, setMissionTitle] = useState<string>("");
  const [customerContext, setCustomerContext] = useState<string>("");
  const [canonicalFacts, setCanonicalFacts] = useState<string[]>([]);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [status, setStatus] = useState<string>("active");

  const [files, setFiles] = useState<FileMap>({});
  const [activeFile, setActiveFile] = useState<string>("");
  const [plan, setPlan] = useState<Record<string, string>>({ approach: "", risks: "", testStrategy: "" });
  const [handoff, setHandoff] = useState<Record<string, string>>({ summary: "", recommendation: "", followUps: "" });
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<string>("Workspace loading…");
  const [curveballText, setCurveballText] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const providerRef = useRef<ExecutionProvider | null>(null);
  const curveballTriggeredRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef<number>(50 * 60);

  const eventsToChat = useCallback((events: EventRow[]): ChatMessage[] => {
    return events
      .filter((e) => e.event_type === "customer_chat_message")
      .map((e) => ({
        id: e.id,
        actor: e.actor,
        text: String((e.payload as { text?: string })?.text || ""),
        at: e.created_at,
      }));
  }, []);

  // Initial load ----------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const resolved = await resolveSessionByToken(token);
        const stage = stageForStatus(resolved.status);
        if (stage === "consent") return router.replace(`/s/${token}/consent`);
        if (stage === "preflight") return router.replace(`/s/${token}/preflight`);
        if (stage === "submitted") return router.replace(`/s/${token}/submitted`);

        setSessionId(resolved.sessionId);
        const data = await fetchSession(resolved.sessionId);
        setStatus(data.session.status);
        setMissionTitle(data.mission?.title || "Mission");
        setCustomerContext(data.mission?.customer_context || "");
        setCanonicalFacts(data.canonicalFacts || []);
        setEndsAt(data.session.ends_at);
        durationRef.current = (data.durationMinutes || 50) * 60;
        startedAtRef.current = data.session.started_at ? new Date(data.session.started_at).getTime() : Date.now();
        setCurveballText(data.curveballText || null);
        curveballTriggeredRef.current = Boolean(data.curveballText);

        const serverState = (data.session.workspace_state || {}) as {
          files?: FileMap;
          plan?: Record<string, string>;
          handoff?: Record<string, string>;
        };

        let localFiles: FileMap | null = null;
        try {
          const raw = window.localStorage.getItem(localKey(resolved.sessionId));
          if (raw) {
            const parsed = JSON.parse(raw) as { files?: FileMap; plan?: Record<string, string>; handoff?: Record<string, string> };
            localFiles = parsed.files || null;
            if (parsed.plan) setPlan((p) => ({ ...p, ...parsed.plan }));
            if (parsed.handoff) setHandoff((h) => ({ ...h, ...parsed.handoff }));
          }
        } catch {
          // ignore corrupt local cache
        }

        const initialFiles = localFiles || serverState.files || {};
        setFiles(initialFiles);
        setActiveFile(Object.keys(initialFiles).sort()[0] || "");
        if (serverState.plan) setPlan((p) => ({ ...p, ...serverState.plan }));
        if (serverState.handoff) setHandoff((h) => ({ ...h, ...serverState.handoff }));
        setChat(eventsToChat(data.events || []));
        setTerminalOutput("Ready. Try `test`, `pytest`, `evals`, or `preview`.");
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load workspace");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Timer -------------------------------------------------------------------
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const secs = (new Date(endsAt).getTime() - Date.now()) / 1000;
      setRemaining(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  // Auto-reveal curveball partway through the session -----------------------
  useEffect(() => {
    if (!sessionId || curveballTriggeredRef.current || startedAtRef.current === null) return;
    const totalElapsed = (Date.now() - startedAtRef.current) / 1000;
    if (totalElapsed < durationRef.current * 0.3) return;
    curveballTriggeredRef.current = true;
    (async () => {
      try {
        const result = await patchSession<{ curveballText: string }>(sessionId, "curveball");
        setCurveballText(result.curveballText);
      } catch {
        curveballTriggeredRef.current = false;
      }
    })();
  }, [remaining, sessionId]);

  // Heartbeat -----------------------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(async () => {
      try {
        const result = await patchSession<{ expired: boolean; session: { status: string } }>(sessionId, "heartbeat");
        setStatus(result.session.status);
        if (result.expired) {
          setTerminalOutput((t) => `${t}\n\n[Time is up — submit your work now.]`);
        }
      } catch {
        // transient network issue — next heartbeat will retry
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [sessionId]);

  // Local backup on every change ----------------------------------------------
  useEffect(() => {
    if (!sessionId) return;
    try {
      window.localStorage.setItem(localKey(sessionId), JSON.stringify({ files, plan, handoff }));
    } catch {
      // storage full/unavailable — server autosave still covers us
    }
  }, [sessionId, files, plan, handoff]);

  // Periodic server autosave --------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      patchSession(sessionId, "save", { files, plan, handoff }).catch(() => {});
    }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [sessionId, files, plan, handoff]);

  async function ensureProvider(): Promise<ExecutionProvider> {
    if (providerRef.current) return providerRef.current;
    const { PyodideExecutionProvider } = await import("@/lib/relay/pyodide-provider");
    const provider = new PyodideExecutionProvider();
    await provider.initializeSession(files);
    providerRef.current = provider;
    return provider;
  }

  async function runCommand(command: string) {
    if (!sessionId) return;
    setRunning(true);
    setTerminalOutput(`$ ${command}\n(running…)`);
    try {
      const provider = await ensureProvider();
      const result: CommandResult = await provider.runCommand(command);
      setTerminalOutput(
        `$ ${command}\nexit ${result.exitCode} · ${result.durationMs}ms\n\n${result.stdout}${result.stderr ? `\n[stderr]\n${result.stderr}` : ""}`
      );
      await patchSession(sessionId, "command_event", {
        eventType: "command_run",
        actor: "candidate",
        sourceSurface: "terminal",
        payload: { command, ok: result.ok, exitCode: result.exitCode, durationMs: result.durationMs },
      });
    } catch (err) {
      setTerminalOutput(`$ ${command}\n[error] ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  async function onFileChange(path: string, content: string) {
    setFiles((f) => ({ ...f, [path]: content }));
    if (providerRef.current) {
      await providerRef.current.writeFile(path, content);
    }
  }

  async function sendChat() {
    if (!sessionId || !chatDraft.trim()) return;
    const text = chatDraft.trim();
    setChatDraft("");
    setChat((c) => [...c, { id: `local-${Date.now()}`, actor: "candidate", text, at: new Date().toISOString() }]);
    try {
      const result = await patchSession<{ event: EventRow; reply: EventRow | null }>(sessionId, "command_event", {
        eventType: "customer_chat_message",
        actor: "candidate",
        sourceSurface: "customer_chat",
        payload: { text },
      });
      if (result.reply) {
        setChat((c) => [
          ...c,
          {
            id: result.reply!.id,
            actor: result.reply!.actor,
            text: String((result.reply!.payload as { text?: string })?.text || ""),
            at: result.reply!.created_at,
          },
        ]);
      }
    } catch (err) {
      setChat((c) => [
        ...c,
        { id: `error-${Date.now()}`, actor: "system", text: `Message failed to send: ${err instanceof Error ? err.message : "unknown error"}`, at: new Date().toISOString() },
      ]);
    }
  }

  async function submit() {
    if (!sessionId) return;
    if (!window.confirm("Submit now? Your workspace files will be frozen for evidence review and can't be edited afterward.")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await patchSession(sessionId, "save", { files, plan, handoff });
      await patchSession(sessionId, "submit", { files, plan, handoff });
      try {
        window.localStorage.removeItem(localKey(sessionId));
      } catch {
        // best effort cleanup
      }
      router.push(`/s/${token}/submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setSubmitting(false);
    }
  }

  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const timeUp = remaining <= 0;

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#050609] text-white/60">Loading workspace…</div>;
  }
  if (error && !sessionId) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050609] px-6 text-center text-[#fda4b0]">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#07080B] text-[#F4F5F7]">
      <header className="flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#090B10] px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <FydellBrand markSize={24} wordmarkSize={16} />
          <span className="hidden text-[13px] text-white/50 sm:inline">{missionTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`rounded-full border px-3 py-1 text-[12px] ${
              timeUp ? "border-[#fda4b0]/40 text-[#fda4b0]" : "border-white/15 text-white/70"
            }`}
            style={{ fontFamily: MONO }}
          >
            {timeUp ? "TIME UP" : formatClock(remaining)}
          </span>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-4 text-[12.5px] font-semibold text-[#08090C] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </header>

      {curveballText && (
        <div className="border-b border-[#3B5BFF]/30 bg-[#3B5BFF]/10 px-4 py-2.5 text-[13px] text-[#c4cdff] sm:px-6">
          <strong className="font-semibold">Mid-session change: </strong>
          {curveballText}
        </div>
      )}
      {error && <div className="border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2 text-[13px] text-[#fda4b0]">{error}</div>}

      <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[220px_1fr_360px]">
        {/* File list */}
        <div className="min-h-[calc(100dvh-56px)] bg-[#0A0C11] p-3">
          <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Files</p>
          <ul className="space-y-0.5">
            {filePaths.map((path) => (
              <li key={path}>
                <button
                  type="button"
                  onClick={() => setActiveFile(path)}
                  className={`w-full truncate rounded-[6px] px-2 py-1.5 text-left text-[12.5px] ${
                    activeFile === path ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.04]"
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  {path}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-6 px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Plan</p>
          <div className="space-y-2 px-1">
            {(["approach", "risks", "testStrategy"] as const).map((field) => (
              <label key={field} className="block">
                <span className="text-[10.5px] capitalize text-white/40">{field.replace(/([A-Z])/g, " $1")}</span>
                <textarea
                  value={plan[field] || ""}
                  onChange={(e) => setPlan((p) => ({ ...p, [field]: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-[6px] border border-white/10 bg-black/30 px-2 py-1.5 text-[11.5px] text-white/80"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Editor + terminal */}
        <div className="flex min-h-[calc(100dvh-56px)] flex-col bg-[#0A0C11]">
          <div className="flex h-9 items-center border-b border-white/[0.06] px-3 text-[12px] text-white/50" style={{ fontFamily: MONO }}>
            {activeFile || "no file selected"}
          </div>
          <textarea
            value={activeFile ? files[activeFile] || "" : ""}
            onChange={(e) => activeFile && onFileChange(activeFile, e.target.value)}
            disabled={!activeFile}
            spellCheck={false}
            className="flex-1 resize-none bg-[#08090C] px-4 py-3 text-[13px] leading-relaxed text-white/90 outline-none"
            style={{ fontFamily: MONO, minHeight: 260 }}
          />
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
            {["test", "evals", "preview"].map((cmd) => (
              <button
                key={cmd}
                type="button"
                disabled={running}
                onClick={() => runCommand(cmd)}
                className="inline-flex h-8 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/75 hover:bg-white/[0.05] disabled:opacity-50"
              >
                Run {cmd}
              </button>
            ))}
          </div>
          <pre
            className="max-h-[220px] overflow-auto border-t border-white/[0.06] bg-black/50 px-4 py-3 text-[11.5px] leading-relaxed text-[#9CE5B0]"
            style={{ fontFamily: MONO }}
          >
            {terminalOutput}
          </pre>
        </div>

        {/* Customer chat + handoff */}
        <div className="flex min-h-[calc(100dvh-56px)] flex-col bg-[#0A0C11]">
          <div className="border-b border-white/[0.06] p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Customer context</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">{customerContext || "No additional context provided."}</p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Customer chat</p>
            {chat.length === 0 && <p className="text-[12.5px] text-white/35">No messages yet.</p>}
            {chat.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-[10px] px-3 py-2 text-[12.5px] leading-relaxed ${
                  m.actor === "candidate" ? "ml-auto bg-[#3B5BFF]/20 text-white/90" : "bg-white/[0.06] text-white/75"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
            className="flex gap-2 border-t border-white/[0.06] p-3"
          >
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Message the customer…"
              className="flex-1 rounded-[7px] border border-white/10 bg-black/30 px-3 py-2 text-[12.5px] text-white/85"
            />
            <button type="submit" className="inline-flex h-9 items-center rounded-[7px] bg-[#F1F2F4] px-3 text-[12px] font-semibold text-[#08090C]">
              Send
            </button>
          </form>

          <div className="space-y-2 border-t border-white/[0.06] p-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Handoff</p>
            {(["summary", "recommendation", "followUps"] as const).map((field) => (
              <label key={field} className="block">
                <span className="text-[10.5px] capitalize text-white/40">{field.replace(/([A-Z])/g, " $1")}</span>
                <textarea
                  value={handoff[field] || ""}
                  onChange={(e) => setHandoff((h) => ({ ...h, [field]: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-[6px] border border-white/10 bg-black/30 px-2 py-1.5 text-[11.5px] text-white/80"
                />
              </label>
            ))}
          </div>

          {canonicalFacts.length > 0 && (
            <div className="border-t border-white/[0.06] p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">Known constraints</p>
              <ul className="mt-1.5 space-y-1">
                {canonicalFacts.map((f) => (
                  <li key={f} className="text-[11.5px] leading-relaxed text-white/50">
                    · {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
