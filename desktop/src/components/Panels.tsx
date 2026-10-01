import { useCallback, useEffect, useRef, useState } from "react";
import { api, ChatMessage, Diagnostics, Receipt, SessionEvent, StakeholderView, SyncPhase, SyncView, TestRunResult } from "../lib/tauri";
import {
  formatDiagnostics,
  mergeChatMessagesView,
  chatSenderName,
  formatChatTime,
  syncPhaseLabel,
  testRunIntro,
  testRunHeadline,
  isStaleResult,
  STALE_RESULTS_LABEL,
} from "../lib/pure";
import { messageOf } from "../App";
import { Dialog, EmptyState, ProvenanceTag } from "./ui";

export interface Milestone {
  id: string;
  title: string;
  body: string;
  _shown?: boolean;
  _acked?: boolean;
}

/* ---------------- markdown (tiny, safe) ---------------- */

function renderMarkdown(src: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = src.split("\n");
  let html = "";
  let inCode = false;
  let inList = false;
  for (const raw of lines) {
    const line = raw;
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html += "</code></pre>";
        inCode = false;
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<pre><code>";
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      html += esc(line) + "\n";
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      if (inList) { html += "</ul>"; inList = false; }
      const lvl = h[1].length;
      html += `<h${lvl}>${inline(esc(h[2]))}</h${lvl}>`;
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)/);
    if (li) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(esc(li[1]))}</li>`;
      continue;
    }
    if (inList) { html += "</ul>"; inList = false; }
    if (line.trim() === "") continue;
    html += `<p>${inline(esc(line))}</p>`;
  }
  if (inList) html += "</ul>";
  if (inCode) html += "</code></pre>";
  return html;
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/* ---------------- brief ---------------- */

export function BriefPanel() {
  const [html, setHtml] = useState("");
  useEffect(() => {
    api.readFile("BRIEF.md").then((f) => setHtml(renderMarkdown(f.content))).catch(() => setHtml("<p class='muted'>No brief found.</p>"));
  }, []);
  return (
    <>
      <h3>Candidate brief</h3>
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

/* ---------------- tests ---------------- */

export function TestsPanel({ onTestsRun, onStatus }: { onTestsRun: () => void; onStatus?: (s: "running" | "passed" | "failed") => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Parse test output into file:line problems for the Problems view.
  const [problems, setProblems] = useState<{ file: string; line: number; text: string }[]>([]);

  const parseProblems = useCallback((stdout: string, stderr: string) => {
    const found: { file: string; line: number; text: string }[] = [];
    const text = stdout + "\n" + stderr;
    // Python traceback frames: File "path", line N, in ...
    const tbRe = /File "([^"]+)", line (\d+), in (\S+)/g;
    let m: RegExpExecArray | null;
    while ((m = tbRe.exec(text)) !== null) {
      found.push({ file: m[1], line: parseInt(m[2], 10), text: `in ${m[3]}` });
    }
    // Assertion/error summary lines: FAILED path::test - message (pytest)
    const failRe = /^(FAILED|ERROR)\s+(\S+)\s*-\s*(.+)$/gm;
    while ((m = failRe.exec(text)) !== null) {
      found.push({ file: m[2].split("::")[0], line: 0, text: m[3].slice(0, 120) });
    }
    return found.slice(0, 50);
  }, []);
  const [stale, setStale] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    onStatus?.("running");
    try {
      // The run is recorded server-side (remote) or by the Rust command
      // (local); the panel does not post a second event.
      const r = await api.runTests();
      setResult(r);
      setProblems(parseProblems(r.stdout, r.stderr));
      setStale(false);
      onStatus?.(r.status === "completed" && (r.failed ?? 0) === 0 && (r.errors ?? 0) === 0 ? "passed" : "failed");
      onTestsRun();
    } catch (e) {
      setError(messageOf(e));
      onStatus?.("failed");
    } finally {
      setRunning(false);
    }
  }, [onTestsRun, onStatus, parseProblems]);

  // DESK-12: once the saved files differ from the ones the tests ran
  // against, say so instead of presenting old results as current.
  useEffect(() => {
    if (!result?.workspace_fingerprint) return;
    let cancelled = false;
    const check = async () => {
      try {
        const current = await api.workspaceFingerprint();
        if (!cancelled) setStale(isStaleResult(result.workspace_fingerprint, current));
      } catch {
        /* workspace unavailable: keep the last known label */
      }
    };
    void check();
    const t = setInterval(() => void check(), 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [result]);

  const headline = result ? testRunHeadline(result) : null;
  const provided = result?.tests.filter((t) => t.origin === "provided") ?? [];
  const own = result?.tests.filter((t) => t.origin === "candidate") ?? [];

  return (
    <>
      <h3>
        Tests <ProvenanceTag kind="observed" />
      </h3>
      <p className="muted">
        {testRunIntro(result?.mode ?? "remote")} After you submit, your reviewer also runs additional tests you cannot see.
      </p>
      <button className="btn" onClick={run} disabled={running}>
        {running ? "Running…" : "Run tests"}
      </button>
      {error && (
        <div className="error mt-3" role="alert">
          {error} Your work is saved.
        </div>
      )}
      {!result && !running && !error && (
        <EmptyState
          icon="flask"
          title="No runs yet"
          body="Run the tests to see real results for the files you have saved. Each result is linked to the exact version it ran against."
          actionLabel="Run tests"
          onAction={run}
        />
      )}
      {running && (
        <div className="muted mt-3" role="status">
          Running tests against your saved files…
        </div>
      )}
      {result && headline && (
        <section className="mt-3" aria-label="Test output" aria-live="polite">
          {stale && (
            <div className="muted" role="status">
              {STALE_RESULTS_LABEL}
            </div>
          )}
          <div className="summary-line">
            <span className={headline.tone === "ok" ? "pass" : headline.tone === "fail" ? "fail" : undefined}>
              {headline.text}
            </span>
            <span className="muted"> · {(result.duration_ms / 1000).toFixed(1)}s</span>
            {result.snapshot_hash && (
              <span className="muted" title={result.snapshot_hash}>
                {" "}
                · version {result.snapshot_hash.slice(0, 8)}
              </span>
            )}
          </div>
          {result.status_reason && headline.text !== result.status_reason && (
            <p className="muted">{result.status_reason}</p>
          )}
          {result.restored_trusted.length > 0 && (
            <p className="muted">
              You changed {result.restored_trusted.join(", ")}. The original provided tests were used; put new
              checks in your own test file instead.
            </p>
          )}
          {result.ignored.some((i) => i.reason === "runner_config_not_used") && (
            <p className="muted">
              Not used by the runner: {result.ignored.filter((i) => i.reason === "runner_config_not_used").map((i) => i.path).join(", ")}.
            </p>
          )}
          {[
            ["Provided tests", provided],
            ["Your tests", own],
          ].map(([label, list]) =>
            (list as typeof provided).length > 0 ? (
              <div key={label as string} className="mt-3">
                <div className="muted">{label as string}</div>
                {(list as typeof provided).map((t) => (
                  <div key={t.id} className="test-row">
                    <span className={t.outcome === "passed" ? "pass" : t.outcome === "skipped" ? undefined : "fail"}>
                      {t.outcome}
                    </span>
                    <span>{t.id}</span>
                  </div>
                ))}
              </div>
            ) : null
          )}
          <h4 className="mt-3">Test output</h4>
          <div className="output">
            {result.stdout || "(no output)"}
            {result.stderr ? "\n--- stderr ---\n" + result.stderr : ""}
          </div>
          {problems.length > 0 && (
            <div className="problems">
              <div className="section-label">Problems ({problems.length})</div>
              {problems.map((p, i) => (
                <div key={i} className="problem-row">
                  <span className="mono">{p.file}{p.line > 0 ? `:${p.line}` : ""}</span>
                  <span className="muted">{p.text}</span>
                </div>
              ))}
            </div>
          )}
          {result.truncated && <div className="muted">Output truncated.</div>}
        </section>
      )}
    </>
  );
}

/* ---------------- team: real platform-backed chat ----------------
   Stakeholder messages come from the platform (GET/POST /api/sim/sessions/
   [id]/messages) — the replies are scenario-authored and always labeled
   simulated. When the platform is unreachable, a clearly-labeled offline
   scripted fallback answers instead. Polling runs only while this panel is
   mounted, every 15s. */

export const CHAT_POLL_MS = 15_000;

export function TeamPanel() {
  const [stakeholders, setStakeholders] = useState<StakeholderView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Soft-skills surface: track the latest stakeholder message time per
  // stakeholder so reply latency is observed evidence, not a guess.
  const lastStakeholderMsgAt = useRef<Map<string, number>>(new Map());
  const bottomRef = useCallback((el: HTMLDivElement | null) => {
    el?.scrollIntoView({ block: "end" });
  }, []);

  const load = useCallback(async (quiet: boolean) => {
    try {
      const [sts, messages] = await Promise.all([
        api.listStakeholders(),
        api.listMessages(),
      ]);
      setStakeholders(sts);
      setMsgs((prev) => mergeChatMessagesView(prev, messages));
      // Record stakeholder message times for latency tracking.
      for (const m of messages) {
        if (m.sender !== "candidate" && m.stakeholderId) {
          const t = new Date(m.createdAt).getTime();
          if (Number.isFinite(t)) {
            const prevT = lastStakeholderMsgAt.current.get(m.stakeholderId) ?? 0;
            if (t > prevT) lastStakeholderMsgAt.current.set(m.stakeholderId, t);
          }
        }
      }
      setSelectedId((prev) => prev ?? sts[0]?.id ?? null);
      setOnline(true);
      if (!quiet) setError(null);
    } catch (e) {
      setOnline(false);
      if (!quiet) setError(messageOf(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const t = setInterval(() => void load(true), CHAT_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !selectedId) return;
    setDraft("");
    setSending(true);
    setError(null);
    // Soft-skills evidence: how long since this stakeholder last wrote.
    const stakeholderLastAt = lastStakeholderMsgAt.current.get(selectedId) ?? null;
    const replyLatencyMs =
      stakeholderLastAt != null ? Math.max(0, Date.now() - stakeholderLastAt) : null;
    try {
      if (online) {
        const refreshed = await api.sendMessage(selectedId, text);
        setMsgs((prev) => mergeChatMessagesView(prev, refreshed));
        try {
          await api.appendEvent("message_sent", {
            chars: text.length,
            stakeholder_id: selectedId,
            reply_latency_ms: replyLatencyMs,
          });
        } catch {}
      } else {
        // Offline fallback: clearly labeled, local only.
        const now = new Date().toISOString();
        setMsgs((prev) =>
          mergeChatMessagesView(prev, [
            {
              id: `local-${Date.now()}`,
              thread: "team",
              sender: "candidate",
              stakeholderId: null,
              body: text,
              createdAt: now,
            },
            {
              id: `local-reply-${Date.now()}`,
              thread: "team",
              sender: "stakeholder",
              stakeholderId: selectedId,
              body: "You're offline right now, so this is a scripted local reply — not the scenario. Reconnect and the real team thread will load.",
              createdAt: now,
            },
          ])
        );
      }
    } catch (e) {
      setError(messageOf(e));
      setDraft(text);
    } finally {
      setSending(false);
    }
  }, [draft, sending, selectedId, online]);

  const selected = stakeholders.find((s) => s.id === selectedId) ?? null;

  return (
    <>
      <h3>
        Team thread <ProvenanceTag kind="generated" />
      </h3>
      <p className="muted">
        Everyone here except you is <strong>simulated</strong> — scripted by the
        scenario, not a real coworker. Your own messages are observed evidence.
      </p>
      {!online && loaded && (
        <div className="offline-banner" role="status">
          <span className="tag tag-attention">Offline</span>
          <span className="muted">
            Can't reach the platform. Messages are scripted locally until you
            reconnect.
          </span>
          <button className="btn ghost sm" onClick={() => void load(false)}>
            Retry
          </button>
        </div>
      )}
      {error && loaded && online && <div className="error mb-2">{error}</div>}
      {loaded && stakeholders.length > 0 && (
        <div className="stakeholder-row" role="tablist" aria-label="Stakeholders">
          {stakeholders.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === selectedId}
              className={`stakeholder-tab ${s.id === selectedId ? "active" : ""}`}
              onClick={() => setSelectedId(s.id)}
              title={s.role}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {loaded && stakeholders.length === 0 && msgs.length === 0 ? (
        <EmptyState
          icon="chat"
          title="No team thread"
          body="The scenario's team thread couldn't load. Your work is unaffected — try loading it again."
          actionLabel="Retry"
          onAction={() => void load(false)}
        />
      ) : (
        <div className="chat-scroll">
          {msgs.map((m) => {
            const mine = m.sender === "candidate";
            const simulated = !mine;
            return (
              <div key={m.id} className={`msg ${mine ? "me" : ""} ${simulated ? "simulated" : ""}`}>
                <div className="who">
                  {chatSenderName(m, stakeholders)}{" "}
                  {simulated && <ProvenanceTag kind="generated" />}
                  <span className="msg-time">{formatChatTime(m.createdAt)}</span>
                </div>
                <div className="bubble">{m.body}</div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}
      <div className="composer">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder={
            selected ? `Message ${selected.name}…` : "Ask the team…"
          }
          aria-label="Message the simulated team"
          disabled={!selectedId || sending}
        />
        <button
          className="btn ghost"
          onClick={() => void send()}
          disabled={!draft.trim() || !selectedId || sending}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </>
  );
}

/* ---------------- submit ---------------- */

/**
 * The handoff questions, in plain words, keyed to the platform's handoff
 * contract (src/lib/simulations/handoff.ts: whatChanged, testing,
 * remainingRisks, nextSteps) so reviewers' completeness checks see them.
 */
const HANDOFF_QUESTIONS = [
  { key: "whatChanged", label: "What did you change?", help: "Which files, and why that fixes the problem.", rows: 4 },
  { key: "testing", label: "How did you test it?", help: "Which tests you ran or added. We compare this with your real test runs.", rows: 3 },
  { key: "remainingRisks", label: "What is still unsure or unfinished?", help: "Saying what you did not finish is a good thing. It is not a penalty.", rows: 3 },
  { key: "nextSteps", label: "What should the team do next?", help: "Follow-ups, monitoring or cleanup. One line is fine.", rows: 2 },
] as const;

type HandoffKey = (typeof HANDOFF_QUESTIONS)[number]["key"];

export function SubmitPanel({ onSubmitted, sessionId }: { onSubmitted: (r: Receipt) => void; sessionId: string | null }) {
  const [answers, setAnswers] = useState<Record<HandoffKey, string>>({ whatChanged: "", testing: "", remainingRisks: "", nextSteps: "" });
  const [aiDisclosed, setAiDisclosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [syncView, setSyncView] = useState<SyncView | null>(null);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);

  // DESK-09: warn honestly when remote state is unsettled at submit time.
  useEffect(() => {
    api.syncStatus().then(setSyncView).catch(() => {});
  }, []);

  const syncWarning =
    syncView == null
      ? null
      : syncView.phase === "conflict"
        ? "Someone else changed this task on the server. Your work on this computer is what gets sent."
        : syncView.phase === "sync_failed"
          ? "Your latest files are saved on this computer but did not reach Fydell yet. Sending now uses the files on this computer."
          : syncView.dirty_paths.length > 0
            ? `${syncView.dirty_paths.length} file${syncView.dirty_paths.length === 1 ? " is" : "s are"} saved on this computer but not yet confirmed by Fydell. Sending now uses the files on this computer.`
            : null;

  const answered = HANDOFF_QUESTIONS.filter((q) => answers[q.key].trim().length > 0).length;
  const total = HANDOFF_QUESTIONS.length;

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    setAnalysisNote(null);
    try {
      // Attach the code analysis findings and the team-thread summary so the
      // reviewer sees structured evidence alongside the files. Both are
      // computed from real local data; failures here never block submit.
      let analysis: unknown = null;
      try {
        const { runAnalysis } = await import("./AnalysisPanel");
        analysis = await runAnalysis(sessionId);
        setAnalysisNote("Code analysis attached.");
      } catch {
        setAnalysisNote("Code analysis unavailable — sending without it.");
      }
      let chatSummary: unknown = null;
      try {
        const messages = await api.listMessages();
        const mine = messages.filter((m) => m.sender === "candidate");
        const theirs = messages.filter((m) => m.sender !== "candidate");
        chatSummary = {
          candidateMessages: mine.length,
          stakeholderMessages: theirs.length,
          threadFlaggedForReview: messages.length > 0,
        };
      } catch {}
      // `summary` stays for the legacy submit path, which carries it as the
      // session notes (src-tauri/src/submission.rs).
      const receipt = await api.submit({ ...answers, summary: answers.whatChanged, analysis, chatSummary }, aiDisclosed);
      onSubmitted(receipt);
    } catch (e) {
      // Keep the dialog open and show the error inside — never fail silently.
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, [answers, aiDisclosed, onSubmitted, sessionId]);

  return (
    <div className="send">
      <h2 className="send-title">Before you send your work</h2>
      <p className="send-lead">Tell the next engineer what you did. Short and honest is best. There are no trick questions.</p>

      <ul className="send-checks" aria-label="Quick check">
        {syncView == null ? null : syncWarning ? (
          <li className="send-check warn">
            <span aria-hidden>!</span>
            {syncWarning}
          </li>
        ) : (
          <li className="send-check ok">
            <span aria-hidden>✓</span>
            Your latest code is saved
          </li>
        )}
        <li className={`send-check ${answered === total ? "ok" : "todo"}`}>
          <span aria-hidden>{answered === total ? "✓" : answered}</span>
          {answered === total ? `All ${total} questions answered` : `${answered} of ${total} questions answered`}
        </li>
      </ul>

      {error && !confirming && <div className="error">{error}</div>}

      {HANDOFF_QUESTIONS.map((q, i) => (
        <div className="send-field" key={q.key}>
          <label htmlFor={`handoff-${q.key}`}>
            {i + 1}. {q.label}
          </label>
          <span className="send-help" id={`handoff-${q.key}-help`}>
            {q.help}
          </span>
          <textarea
            id={`handoff-${q.key}`}
            className="textarea"
            rows={q.rows}
            aria-describedby={`handoff-${q.key}-help`}
            value={answers[q.key]}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
          />
        </div>
      ))}

      <details className="send-ai">
        <summary>Did you use an AI tool outside Fydell? (optional)</summary>
        <p className="send-help">You can say so here. We cannot see tools outside the app and never guess. Using one is never held against you.</p>
        <label className="checkbox-row" htmlFor="submit-ai">
          <input id="submit-ai" type="checkbox" checked={aiDisclosed} onChange={(e) => setAiDisclosed(e.target.checked)} />
          <span>Yes, I used an AI tool outside Fydell</span>
        </label>
      </details>

      <div className="send-box">
        <p>
          When you send, your work is locked and a <strong>receipt</strong> is made. If your internet drops, you get the same receipt
          when it comes back. Nothing is sent twice.
        </p>
        <button className="btn send-btn" disabled={busy} onClick={() => { setError(null); setConfirming(true); }}>
          Send my work
        </button>
      </div>

      {confirming && (
        <Dialog
          title="Send your work now?"
          onClose={() => { if (!busy) setConfirming(false); }}
          actions={[
            { label: "Keep working", kind: "ghost", onClick: () => setConfirming(false), disabled: busy },
            { label: "Send my work", kind: "primary", onClick: submit, disabled: busy, busyLabel: "Sending…" },
          ]}
        >
          {error && <div className="error">{error}</div>}
          <p>
            We send <strong>your files</strong>, <strong>your test runs</strong> and <strong>your answers</strong> together, and give you
            a receipt. You cannot change them after this.
          </p>
          {answered < total && (
            <p>
              You answered {answered} of {total} questions. You can still send, but the hiring team will see which ones are empty.
            </p>
          )}
          {analysisNote && <p className="muted">{analysisNote}</p>}
          {syncWarning && <div className="error">{syncWarning}</div>}
        </Dialog>
      )}
    </div>
  );
}

/* ---------------- timeline ---------------- */

export function TimelinePanel() {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  useEffect(() => {
    api.getEvents().then(setEvents).catch(() => {});
  }, []);
  return (
    <>
      <h3>
        Your evidence trail <ProvenanceTag kind="observed" />
      </h3>
      <p className="muted">Everything recorded in this session. This ships with your submission.</p>
      {events.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No events yet"
          body="File saves, test runs, and messages will appear here as observed evidence."
        />
      ) : (
        <div>
          {events.map((e) => (
            <div key={e.seq} className="timeline-row">
              <span className="detail">#{e.seq}</span>
              <span className="kind">{e.kind}</span>
              <span className="detail">{new Date(e.ts).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
      <DiagnosticsPanel />
    </>
  );
}

/* ---------------- DESK-20: diagnostics ---------------- */

function DiagnosticsPanel() {
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.diagnostics().then(setDiag).catch((e) => setError(messageOf(e)));
  }, []);

  const copy = useCallback(async () => {
    if (!diag) return;
    try {
      await navigator.clipboard.writeText(formatDiagnostics(diag));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't reach the clipboard.");
    }
  }, [diag]);

  return (
    <div className="mt-4">
      <h3>
        Diagnostics <ProvenanceTag kind="observed" />
      </h3>
      <p className="muted">
        Scoped technical details for support. Contains versions, sync state, and
        error references — never your code, tokens, or message bodies.
      </p>
      {error && <div className="error">{error}</div>}
      {diag ? (
        <>
          <div className="receipt-box">
            <div><span className="k">app </span>{diag.app_version} <span className="k">os </span>{diag.os}/{diag.arch}</div>
            <div><span className="k">session </span>{diag.session.status} <span className="k">rev </span>{diag.session.server_revision}</div>
            <div><span className="k">sync </span>{syncPhaseLabel(diag.session.sync_phase as SyncPhase)} <span className="k">unsynced </span>{diag.session.unsynced_files}</div>
            <div><span className="k">files </span>{diag.file_count} <span className="k">events </span>{diag.event_count}</div>
            {diag.recent_errors.length > 0 && (
              <div>
                <span className="k">recent errors </span>
                {diag.recent_errors.map((e, i) => (
                  <div key={i} className="mono">
                    {e.ref} ({e.code})
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn ghost" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy diagnostics"}
          </button>
        </>
      ) : (
        !error && <p className="muted">Loading…</p>
      )}
    </div>
  );
}
