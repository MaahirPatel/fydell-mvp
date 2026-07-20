"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import TopBar, { type ConnectionState, type RuntimeStage, type SaveState } from "@/components/relay/TopBar";
import PhaseRail from "@/components/relay/PhaseRail";
import BriefPanel, { type MissionInfo } from "@/components/relay/BriefPanel";
import FilesPanel from "@/components/relay/FilesPanel";
import EvaluationLab from "@/components/relay/EvaluationLab";
import TerminalPanel from "@/components/relay/TerminalPanel";
import ClientInbox, { type ChatMessage } from "@/components/relay/ClientInbox";
import WorkingNotes, { DEFAULT_CHECKLIST, type WorkingNotesState } from "@/components/relay/WorkingNotes";
import ShipGateModal, { type ShipFields } from "@/components/relay/ShipGateModal";
import AiWorkspacePanel from "@/components/relay/AiWorkspacePanel";
import EvidenceTrailPanel from "@/components/relay/EvidenceTrailPanel";
import RecoveryCenter from "@/components/relay/RecoveryCenter";
import {
  buildChannelSeed,
  buildCurveballSeed,
  inboxMeta,
  speakerForActor,
} from "@/lib/relay/inbox-seed";
import type { CommandResult, ExecutionProvider, FileMap } from "@/lib/relay/execution-provider";
import { fetchSession, patchSession, resolveSessionByToken, stageForStatus } from "@/lib/relay/session-client";
import { parseEvalSummary, type EvalMetrics } from "@/lib/relay/eval-summary";
import { computePhaseIndex } from "@/lib/relay/phase";
import type { PatchProposal } from "@/lib/relay/ai-patch";

type EventRow = {
  id: string;
  session_id: string;
  sequence_number: number;
  actor: string;
  event_type: string;
  source_surface: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type RelayCommand = "test" | "evals" | "preview" | "reconcile";
type CenterTab = "files" | "evals" | "brief" | "evidence";
type MobileZone = "inbox" | "workspace" | "notes";

const HEARTBEAT_MS = 20_000;
const AUTOSAVE_MS = 15_000;

const EMPTY_SHIP_FIELDS: ShipFields = { whatBuilt: "", verification: "", limitations: "" };
const EMPTY_NOTES: WorkingNotesState = { knowledge: "", unknowns: "", risks: "", checklist: [] };

function localKey(sessionId: string) {
  return `relay-session-${sessionId}`;
}

export default function RelayWorkspacePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mission, setMission] = useState<MissionInfo>({
    title: "",
    objective: "",
    customerContext: "",
    expectedOutcome: "",
    systemsContext: "",
    technicalEnvironment: "",
    constraints: "",
    securityConsiderations: "",
    successMeasures: "",
  });
  const [canonicalFacts, setCanonicalFacts] = useState<string[]>([]);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [status, setStatus] = useState<string>("active");

  const [files, setFiles] = useState<FileMap>({});
  const [activeFile, setActiveFile] = useState<string>("");
  const [notes, setNotes] = useState<WorkingNotesState>(EMPTY_NOTES);
  const [handoff, setHandoff] = useState<ShipFields>(EMPTY_SHIP_FIELDS);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [curveballKey, setCurveballKey] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");

  const [terminalOutput, setTerminalOutput] = useState<string>("Workspace loading…");
  const [curveballText, setCurveballText] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [runtimeStage, setRuntimeStage] = useState<RuntimeStage>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [connection, setConnection] = useState<ConnectionState>("online");
  const [monacoReady, setMonacoReady] = useState(false);

  const [centerTab, setCenterTab] = useState<CenterTab>("files");
  const [briefVariant, setBriefVariant] = useState<"brief" | "requirements">("brief");
  const [mobileZone, setMobileZone] = useState<MobileZone>("workspace");
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [shipGateOpen, setShipGateOpen] = useState(false);

  const [evalMetrics, setEvalMetrics] = useState<EvalMetrics | null>(null);
  const [evalLastRunAt, setEvalLastRunAt] = useState<string | null>(null);
  const [evalLastRunOk, setEvalLastRunOk] = useState<boolean | null>(null);

  const providerRef = useRef<ExecutionProvider | null>(null);
  const filesRef = useRef<FileMap>({});
  const curveballTriggeredRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const durationRef = useRef<number>(55 * 60);
  const localEditCountRef = useRef(0);
  const localEvalsRunCountRef = useRef(0);
  const wasCrashedOrErrorRef = useRef(false);

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
        setMission({
          title: data.mission?.title || "Mission",
          objective: data.mission?.objective || "",
          customerContext: data.mission?.customer_context || "",
          expectedOutcome: data.mission?.expected_outcome || "",
          systemsContext: data.mission?.systems_context || "",
          technicalEnvironment: data.mission?.technical_environment || "",
          constraints: data.mission?.constraints || "",
          securityConsiderations: data.mission?.security_considerations || "",
          successMeasures: data.mission?.success_measures || "",
        });
        setCanonicalFacts(data.canonicalFacts || []);
        setEndsAt(data.session.ends_at);
        durationRef.current = (data.durationMinutes || 55) * 60;
        startedAtRef.current = data.session.started_at ? new Date(data.session.started_at).getTime() : Date.now();
        setCurveballText(data.curveballText || null);
        setCurveballKey(data.session.curveball_key || null);
        curveballTriggeredRef.current = Boolean(data.curveballText);

        const serverState = (data.session.workspace_state || {}) as {
          files?: FileMap;
          handoff?: Partial<ShipFields> & Record<string, string>;
          notes?: Partial<WorkingNotesState>;
        };

        let localFiles: FileMap | null = null;
        try {
          const raw = window.localStorage.getItem(localKey(resolved.sessionId));
          if (raw) {
            const parsed = JSON.parse(raw) as {
              files?: FileMap;
              handoff?: Partial<ShipFields>;
              notes?: Partial<WorkingNotesState>;
            };
            localFiles = parsed.files || null;
            if (parsed.handoff) setHandoff((h) => ({ ...h, ...parsed.handoff }));
            if (parsed.notes) {
              setNotes((n) => ({
                ...n,
                ...parsed.notes,
                checklist: parsed.notes?.checklist?.length ? parsed.notes.checklist : n.checklist,
              }));
            }
          }
        } catch {
          // ignore corrupt local cache — fall back to server snapshot
        }

        const initialFiles = localFiles || serverState.files || {};
        setFiles(initialFiles);
        filesRef.current = initialFiles;
        setActiveFile(Object.keys(initialFiles).sort()[0] || "");
        if (serverState.handoff) {
          setHandoff((h) => ({
            whatBuilt: serverState.handoff?.whatBuilt ?? h.whatBuilt,
            verification: serverState.handoff?.verification ?? h.verification,
            limitations: serverState.handoff?.limitations ?? h.limitations,
          }));
        }
        if (serverState.notes) {
          setNotes((n) => ({
            ...n,
            ...serverState.notes,
            checklist: serverState.notes?.checklist?.length ? serverState.notes.checklist : n.checklist,
          }));
        }
        const rows = (data.events || []) as EventRow[];
        setEvents(rows);
        setTerminalOutput("Ready. Try `test`, `evals`, `preview`, or `reconcile`.");
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load workspace");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setConnection(navigator.onLine ? "online" : "offline");
    const goOnline = () => setConnection("online");
    const goOffline = () => setConnection("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (!sessionId || curveballTriggeredRef.current || startedAtRef.current === null) return;
    const totalElapsed = (Date.now() - startedAtRef.current) / 1000;
    if (totalElapsed < durationRef.current * 0.3) return;
    curveballTriggeredRef.current = true;
    (async () => {
      try {
        const result = await patchSession<{ curveballText: string; event?: EventRow }>(sessionId, "curveball");
        setCurveballText(result.curveballText);
        if (result.event) setEvents((prev) => [...prev, result.event as EventRow]);
      } catch {
        curveballTriggeredRef.current = false;
      }
    })();
  }, [remaining, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(async () => {
      try {
        const result = await patchSession<{ expired: boolean; session: { status: string } }>(sessionId, "heartbeat");
        setStatus(result.session.status);
        if (result.expired) {
          setTerminalOutput((t) => `${t}\n\n[Time is up — ship your work now.]`);
        }
      } catch {
        // transient network issue — next heartbeat will retry
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      window.localStorage.setItem(localKey(sessionId), JSON.stringify({ files, handoff, notes }));
      setSaveState((s) => (s === "syncing" ? s : "local"));
    } catch {
      setSaveState("error");
      setError(
        "Browser storage is full or blocked. Local recovery may fail — keep a copy of critical edits and retry after freeing space."
      );
    }
  }, [sessionId, files, handoff, notes]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      setSaveState("syncing");
      patchSession(sessionId, "save", { files, handoff, notes })
        .then(() => setSaveState("synced"))
        .catch(() => setSaveState("error"));
    }, AUTOSAVE_MS);
    return () => clearInterval(id);
  }, [sessionId, files, handoff, notes]);

  const recoveryAlert = runtimeStage === "crashed" || saveState === "error";
  useEffect(() => {
    if (recoveryAlert && !wasCrashedOrErrorRef.current) setRecoveryOpen(true);
    wasCrashedOrErrorRef.current = recoveryAlert;
  }, [recoveryAlert]);

  async function ensureProvider(): Promise<ExecutionProvider> {
    if (providerRef.current && runtimeStage === "ready") return providerRef.current;
    setRuntimeStage("booting");
    setTerminalOutput((t) => `${t}\n\n[runtime] Booting Python in the browser…`);
    try {
      const { PyodideExecutionProvider } = await import("@/lib/relay/pyodide-provider");
      const provider = new PyodideExecutionProvider();
      await provider.initializeSession(filesRef.current);
      providerRef.current = provider;
      setRuntimeStage("ready");
      setTerminalOutput((t) => `${t}\n[runtime] Python ready.`);
      return provider;
    } catch (err) {
      setRuntimeStage("crashed");
      providerRef.current = null;
      throw err;
    }
  }

  async function syncProviderFiles(provider: ExecutionProvider) {
    for (const [path, content] of Object.entries(filesRef.current)) {
      await provider.writeFile(path, content);
    }
  }

  async function logEvent(eventType: string, sourceSurface: string, payload: Record<string, unknown>) {
    if (!sessionId) return;
    try {
      const result = await patchSession<{ event: EventRow; reply?: EventRow | null }>(sessionId, "command_event", {
        eventType,
        actor: "candidate",
        sourceSurface,
        payload,
      });
      setEvents((prev) => [...prev, result.event]);
      return result;
    } catch {
      return null;
    }
  }

  async function runCommand(command: RelayCommand) {
    if (!sessionId) return;
    setRunning(true);
    setCenterTab((t) => (command === "evals" ? "evals" : t));
    setTerminalOutput(`$ ${command}\n(running…)`);
    try {
      let provider: ExecutionProvider;
      try {
        provider = await ensureProvider();
      } catch (bootErr) {
        setTerminalOutput(
          `$ ${command}\n[runtime crashed] ${bootErr instanceof Error ? bootErr.message : String(bootErr)}\nRetrying with a fresh worker…`
        );
        providerRef.current = null;
        setRuntimeStage("idle");
        provider = await ensureProvider();
      }
      await syncProviderFiles(provider);
      const result: CommandResult = await provider.runCommand(command);
      const combined = `$ ${command}\nexit ${result.exitCode} · ${result.durationMs}ms\n\n${result.stdout}${result.stderr ? `\n[stderr]\n${result.stderr}` : ""}`;
      setTerminalOutput(combined);

      let evalPayloadExtras: Record<string, unknown> = {};
      if (command === "evals") {
        localEvalsRunCountRef.current += 1;
        const parsed = parseEvalSummary(result.stdout);
        setEvalMetrics(parsed);
        setEvalLastRunAt(new Date().toISOString());
        setEvalLastRunOk(result.ok);
        // Surface the real integrity signal from EVAL_SUMMARY_JSON on the
        // event itself (not just local UI state) so the evidence engine's
        // data_integrity_vigilance trait can see whether the eval harness
        // caught the naive-join data-integrity defect — see
        // src/lib/fde/evidence/signals.ts payloadHasIntegritySignal.
        if (parsed) {
          evalPayloadExtras = {
            integrity_caught: parsed.integrityCaught,
            rows_dropped_naive: parsed.rowsDroppedNaive,
          };
        }
      }

      await logEvent("command_run", "terminal", {
        command,
        ok: result.ok,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        ...evalPayloadExtras,
      });
    } catch (err) {
      setRuntimeStage("crashed");
      providerRef.current = null;
      setTerminalOutput(`$ ${command}\n[error] ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  }

  async function onFileChange(path: string, content: string) {
    localEditCountRef.current += 1;
    setFiles((f) => ({ ...f, [path]: content }));
    if (providerRef.current) {
      try {
        await providerRef.current.writeFile(path, content);
      } catch {
        providerRef.current = null;
        setRuntimeStage("crashed");
      }
    }
  }

  async function applyAiPatch(proposal: PatchProposal) {
    localEditCountRef.current += 1;
    setFiles((f) => ({ ...f, [proposal.file]: proposal.after }));
    if (providerRef.current) {
      try {
        await providerRef.current.writeFile(proposal.file, proposal.after);
      } catch {
        providerRef.current = null;
        setRuntimeStage("crashed");
      }
    }
    await logEvent("ai_patch_applied", "ai_workspace", {
      file: proposal.file,
      source: proposal.source,
      summary: proposal.summary.slice(0, 300),
    });
  }

  const inboxJson = files["data/inbox_thread.json"] || null;
  const inbox = useMemo(() => inboxMeta(inboxJson), [inboxJson]);

  const messages = useMemo<ChatMessage[]>(() => {
    const curveballRevealedAt = events.find((e) => e.event_type === "curveball_revealed")?.created_at || null;
    const seed = buildChannelSeed(inboxJson);
    const curveballSeed = buildCurveballSeed(
      curveballKey,
      curveballText,
      curveballRevealedAt,
      inboxJson
    );
    const live: ChatMessage[] = events
      .filter((e) => e.event_type === "customer_chat_message")
      .map((e) => {
        const speaker = speakerForActor(e.actor, inboxJson);
        return {
          id: e.id,
          actor: e.actor,
          authorName: speaker.name,
          authorRole: speaker.role,
          text: String((e.payload as { text?: string })?.text || ""),
          at: e.created_at,
        };
      });
    return [...seed, ...curveballSeed, ...live].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [events, curveballKey, curveballText, inboxJson]);

  async function sendMessage() {
    if (!sessionId || !chatDraft.trim()) return;
    const text = chatDraft.trim();
    const tempId = `local-${Date.now()}`;
    setChatDraft("");
    setEvents((prev) => [
      ...prev,
      {
        id: tempId,
        session_id: sessionId,
        sequence_number: -1,
        actor: "candidate",
        event_type: "customer_chat_message",
        source_surface: "customer_chat",
        payload: { text },
        created_at: new Date().toISOString(),
      },
    ]);
    try {
      const result = await patchSession<{ event: EventRow; reply: EventRow | null }>(sessionId, "command_event", {
        eventType: "customer_chat_message",
        actor: "candidate",
        sourceSurface: "customer_chat",
        payload: { text },
      });
      setEvents((prev) => [...prev.filter((e) => e.id !== tempId), result.event, ...(result.reply ? [result.reply] : [])]);
    } catch (err) {
      setEvents((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          session_id: sessionId,
          sequence_number: -1,
          actor: "system",
          event_type: "customer_chat_message",
          source_surface: "customer_chat",
          payload: { text: `Message failed to send: ${err instanceof Error ? err.message : "unknown error"}` },
          created_at: new Date().toISOString(),
        },
      ]);
    }
  }

  function updateNotesField(key: "knowledge" | "unknowns" | "risks", value: string) {
    setNotes((n) => ({ ...n, [key]: value }));
  }

  function toggleChecklistItem(id: string) {
    setNotes((n) => {
      const checklist = n.checklist.length > 0 ? n.checklist : DEFAULT_CHECKLIST;
      return { ...n, checklist: checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) };
    });
  }

  function restoreLocalSnapshot() {
    if (!sessionId) return;
    try {
      const raw = window.localStorage.getItem(localKey(sessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { files?: FileMap; handoff?: Partial<ShipFields>; notes?: Partial<WorkingNotesState> };
      if (parsed.files) {
        setFiles(parsed.files);
        filesRef.current = parsed.files;
      }
      if (parsed.handoff) setHandoff((h) => ({ ...h, ...parsed.handoff }));
      if (parsed.notes) setNotes((n) => ({ ...n, ...parsed.notes }));
    } catch {
      setError("Could not read the local snapshot — it may be corrupted.");
    }
  }

  async function reinitWorker() {
    providerRef.current = null;
    setRuntimeStage("idle");
    try {
      await ensureProvider();
    } catch {
      // ensureProvider already sets runtimeStage to "crashed" on failure
    }
  }

  async function reportTechnicalIssue(description: string) {
    await logEvent("technical_issue_reported", "recovery_center", { description });
  }

  async function shipNow(fields: ShipFields) {
    if (!sessionId) return;
    setHandoff(fields);
    setSubmitting(true);
    setError(null);
    try {
      await patchSession(sessionId, "save", { files, handoff: fields, notes });
      await patchSession(sessionId, "submit", { files, handoff: fields, notes });
      try {
        window.localStorage.removeItem(localKey(sessionId));
      } catch {
        // best effort cleanup
      }
      setShipGateOpen(false);
      router.push(`/s/${token}/submitted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
      setSubmitting(false);
    }
  }

  function exitSafely() {
    if (window.confirm("Exit the workspace? Your progress is autosaved, and you can resume from the Action Inbox.")) {
      router.push("/app/fde");
    }
  }

  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const candidateMessageCount = useMemo(
    () => events.filter((e) => e.actor === "candidate" && (e.event_type === "customer_chat_message" || e.event_type === "stakeholder_message")).length,
    [events]
  );
  const notesFilled = useMemo(() => [notes.knowledge, notes.unknowns, notes.risks].some((v) => v.trim().length > 0), [notes]);
  const handoffFilled = useMemo(() => Object.values(handoff).some((v) => v.trim().length > 0), [handoff]);
  const phaseIndex = computePhaseIndex({
    started: true,
    chatMessageCount: candidateMessageCount,
    planFilled: notesFilled,
    editCount: localEditCountRef.current,
    evalsRunCount: localEvalsRunCountRef.current,
    curveballRevealed: Boolean(curveballText),
    handoffFilled,
  });

  const timeUp = remaining <= 0;
  void status;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050609] text-white/60">Loading workspace…</div>
    );
  }
  if (error && !sessionId) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#050609] px-6 text-center text-[#fda4b0]">
        {error}
      </div>
    );
  }

  const columnHeight = "min-h-[calc(100dvh-146px)] lg:min-h-[calc(100dvh-104px)]";
  const CENTER_TABS: { id: CenterTab; label: string }[] = [
    { id: "files", label: "Files" },
    { id: "evals", label: "Evaluation Lab" },
    { id: "brief", label: "Brief" },
    { id: "evidence", label: "Evidence" },
  ];
  const MOBILE_ZONES: { id: MobileZone; label: string }[] = [
    { id: "inbox", label: "Inbox" },
    { id: "workspace", label: "Workspace" },
    { id: "notes", label: "Notes" },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#07080B] text-[#F4F5F7]">
      <TopBar
        missionTitle={mission.title}
        connection={connection}
        saveState={saveState}
        runtimeStage={runtimeStage}
        editorReady={monacoReady}
        remainingSeconds={remaining}
        submitting={submitting}
        onExit={exitSafely}
        onOpenRecovery={() => setRecoveryOpen(true)}
        recoveryAlert={recoveryAlert}
        onOpenShipGate={() => setShipGateOpen(true)}
      />

      <PhaseRail index={phaseIndex} />

      {curveballText && (
        <div className="border-b border-[#3B5BFF]/25 bg-[#3B5BFF]/[0.06] px-4 py-2 text-[12.5px] text-[#c4cdff] sm:px-6">
          <strong className="font-medium">Mid-session change: </strong>
          {curveballText}
        </div>
      )}
      {error && (
        <div className="border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2 text-[13px] text-[#fda4b0]">{error}</div>
      )}
      {timeUp && (
        <div className="border-b border-[#fda4b0]/30 bg-[#fda4b0]/10 px-4 py-2 text-[13px] text-[#fda4b0]">
          Time is up — ship your work now.
        </div>
      )}

      <div className="flex border-b border-white/[0.06] bg-[#08090D] lg:hidden">
        {MOBILE_ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => setMobileZone(z.id)}
            className={cn(
              "flex-1 border-b-2 px-2 py-2.5 text-[12.5px] font-medium transition-colors",
              mobileZone === z.id ? "border-[#3B5BFF] text-white" : "border-transparent text-white/40"
            )}
          >
            {z.label}
          </button>
        ))}
      </div>

      <div className="grid gap-px bg-white/[0.06] lg:grid-cols-[7fr_11fr_7fr]">
        <div className={cn(mobileZone === "inbox" ? "block" : "hidden", "lg:block", columnHeight, "bg-[#0A0C11]")}>
          <ClientInbox
            canonicalFacts={canonicalFacts}
            messages={messages}
            draft={chatDraft}
            onDraftChange={setChatDraft}
            onSend={sendMessage}
            channelName={inbox.channel}
            participants={inbox.participants}
          />
        </div>

        <div className={cn(mobileZone === "workspace" ? "flex" : "hidden", "lg:flex", columnHeight, "flex-col bg-[#0A0C11]")}>
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-2.5 py-1.5">
            <div className="flex gap-1 overflow-x-auto">
              {CENTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCenterTab(tab.id)}
                  className={cn(
                    "shrink-0 rounded-[6px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                    centerTab === tab.id ? "bg-white/[0.08] text-white" : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              className="shrink-0 rounded-[6px] border border-white/12 px-2.5 py-1.5 text-[12px] text-white/60 hover:bg-white/[0.05]"
            >
              AI assistant
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {centerTab === "files" && (
              <FilesPanel
                filePaths={filePaths}
                activeFile={activeFile}
                content={files[activeFile] || ""}
                onSelectFile={setActiveFile}
                onChange={(value) => onFileChange(activeFile, value)}
                onMount={() => setMonacoReady(true)}
              />
            )}
            {centerTab === "evals" && (
              <EvaluationLab
                metrics={evalMetrics}
                lastRunAt={evalLastRunAt}
                lastRunOk={evalLastRunOk}
                onRunEvals={() => runCommand("evals")}
                running={running}
              />
            )}
            {centerTab === "brief" && (
              <div className="h-full overflow-y-auto">
                <div className="flex gap-1 px-6 pt-5">
                  {(["brief", "requirements"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBriefVariant(v)}
                      className={cn(
                        "rounded-[6px] px-2.5 py-1 text-[11.5px] font-medium capitalize transition-colors",
                        briefVariant === v ? "bg-white/[0.08] text-white" : "text-white/40 hover:text-white/70"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <BriefPanel mission={mission} canonicalFacts={canonicalFacts} variant={briefVariant} />
              </div>
            )}
            {centerTab === "evidence" && <EvidenceTrailPanel events={events} />}
          </div>

          <TerminalPanel onRun={runCommand} running={running} output={terminalOutput} />
        </div>

        <div className={cn(mobileZone === "notes" ? "flex" : "hidden", "lg:flex", columnHeight, "flex-col bg-[#0A0C11]")}>
          <WorkingNotes notes={notes} onChange={updateNotesField} onToggleChecklistItem={toggleChecklistItem} />
        </div>
      </div>

      {aiDrawerOpen && (
        <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/50" onClick={() => setAiDrawerOpen(false)}>
          <div
            className="flex h-full w-full max-w-[400px] flex-col border-l border-white/10 bg-[#0A0C11]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h2 className="text-[14px] font-medium text-white">AI assistant</h2>
              <button
                type="button"
                onClick={() => setAiDrawerOpen(false)}
                className="text-[13px] text-white/45 hover:text-white/80"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <AiWorkspacePanel activeFile={activeFile} activeFileContent={files[activeFile] || ""} onApply={applyAiPatch} />
            </div>
          </div>
        </div>
      )}

      <RecoveryCenter
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        onRestoreSnapshot={restoreLocalSnapshot}
        onReinitWorker={reinitWorker}
        onReportIssue={reportTechnicalIssue}
        runtimeCrashed={runtimeStage === "crashed"}
        storageError={saveState === "error"}
      />

      <ShipGateModal open={shipGateOpen} initial={handoff} submitting={submitting} onClose={() => setShipGateOpen(false)} onShip={shipNow} />
    </div>
  );
}
