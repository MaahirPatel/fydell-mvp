import { useCallback, useEffect, useState } from "react";
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

export function TestsPanel({ onTestsRun }: { onTestsRun: () => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      // The run is recorded server-side (remote) or by the Rust command
      // (local); the panel does not post a second event.
      const r = await api.runTests();
      setResult(r);
      setStale(false);
      onTestsRun();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setRunning(false);
    }
  }, [onTestsRun]);

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
    try {
      if (online) {
        const refreshed = await api.sendMessage(selectedId, text);
        setMsgs((prev) => mergeChatMessagesView(prev, refreshed));
        try {
          await api.appendEvent("message_sent", { chars: text.length });
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

export function SubmitPanel({ onSubmitted }: { onSubmitted: (r: Receipt) => void }) {
  const [summary, setSummary] = useState("");
  const [approach, setApproach] = useState("");
  const [tradeoffs, setTradeoffs] = useState("");
  const [aiDisclosed, setAiDisclosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [syncView, setSyncView] = useState<SyncView | null>(null);

  // DESK-09: warn honestly when remote state is unsettled at submit time.
  useEffect(() => {
    api.syncStatus().then(setSyncView).catch(() => {});
  }, []);

  const syncWarning =
    syncView == null
      ? null
      : syncView.phase === "conflict"
        ? "A sync conflict is unresolved: another session changed this assignment on the server. Your local work submits as-is; resolve the conflict if the server version matters."
        : syncView.phase === "sync_failed"
          ? "Remote sync failed — the server may not have your latest files. They are saved on this device; submitting now packages your local work."
          : syncView.dirty_paths.length > 0
            ? `${syncView.dirty_paths.length} file${syncView.dirty_paths.length === 1 ? " is" : "s are"} saved on this device but not yet acknowledged by the server. Submitting now packages your local work.`
            : null;

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const receipt = await api.submit({ summary, approach, tradeoffs }, aiDisclosed);
      onSubmitted(receipt);
    } catch (e) {
      // Keep the dialog open and show the error inside — never fail silently.
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, [summary, approach, tradeoffs, aiDisclosed, onSubmitted]);

  return (
    <>
      <h3>
        Submit for review <ProvenanceTag kind="observed" />
      </h3>
      <p className="muted">
        Submission is immutable. Your files, test record, and event trail are
        packaged with a SHA-256 receipt. A human reviews every submission.
      </p>
      {error && !confirming && <div className="error">{error}</div>}
      <div className="field">
        <label htmlFor="submit-summary">What did you change, in one paragraph?</label>
        <textarea id="submit-summary" className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="submit-approach">Approach & key decisions</label>
        <textarea id="submit-approach" className="textarea" value={approach} onChange={(e) => setApproach(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="submit-tradeoffs">Tradeoffs / what you'd do with more time</label>
        <textarea id="submit-tradeoffs" className="textarea" value={tradeoffs} onChange={(e) => setTradeoffs(e.target.value)} />
      </div>
      <div className="field">
        <label className="checkbox-row" htmlFor="submit-ai">
          <input
            id="submit-ai"
            type="checkbox"
            checked={aiDisclosed}
            onChange={(e) => setAiDisclosed(e.target.checked)}
          />
          <span>I used external AI assistance during this simulation</span>
        </label>
        <p className="muted">Disclosed honestly; permitted tool use is never penalized.</p>
      </div>
      <button className="btn" disabled={busy} onClick={() => { setError(null); setConfirming(true); }}>
        Review & submit
      </button>

      {confirming && (
        <Dialog
          title="Submit for review?"
          onClose={() => { if (!busy) setConfirming(false); }}
          actions={[
            { label: "Keep working", kind: "ghost", onClick: () => setConfirming(false), disabled: busy },
            { label: "Submit work", kind: "primary", onClick: submit, disabled: busy, busyLabel: "Submitting…" },
          ]}
        >
          {error && <div className="error">{error}</div>}
          <p>
            This packages <strong>your files</strong>, <strong>your test record</strong>,
            and <strong>your event trail</strong> into one immutable submission with a
            SHA-256 receipt. You can't edit after submitting.
          </p>
          {syncWarning && (
            <div className="error">
              {syncWarning}
            </div>
          )}
          <p>
            {aiDisclosed
              ? "Your AI-assistance disclosure will be attached — permitted tool use is never penalized."
              : "You haven't disclosed external AI assistance. If you used any, go back and disclose it — honesty here is part of the assessment."}
          </p>
        </Dialog>
      )}
    </>
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
