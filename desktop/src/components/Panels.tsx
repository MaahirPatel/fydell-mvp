import { useCallback, useEffect, useState } from "react";
import { api, Receipt, SessionEvent, TestRunResult } from "../lib/tauri";
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

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const r = await api.runTests();
      setResult(r);
      try {
        await api.appendEvent("tests_run", {
          status: r.status,
          passed: r.passed,
          failed: r.failed,
          duration_ms: r.duration_ms,
        });
      } catch {}
      onTestsRun();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setRunning(false);
    }
  }, [onTestsRun]);

  return (
    <>
      <h3>
        Public test suite <ProvenanceTag kind="observed" />
      </h3>
      <p className="muted">Runs locally on your machine. The hidden evaluation runs on submit.</p>
      <button className="btn" onClick={run} disabled={running}>
        {running ? "Running…" : "Run tests"}
      </button>
      {error && <div className="error mt-3">{error}</div>}
      {!result && !running && !error && (
        <EmptyState
          icon="flask"
          title="No runs yet"
          body="Run the public test suite to see real results from your workspace. Results are linked to the exact revision you ran."
          actionLabel="Run tests"
          onAction={run}
        />
      )}
      {running && (
        <div className="muted mt-3">
          Running tests against the current revision…
        </div>
      )}
      {result && (
        <div className="mt-3">
          <div className="summary-line">
            {result.passed != null && <span className="pass">{result.passed} passed</span>}
            {result.passed != null && result.failed != null && " · "}
            {result.failed != null && <span className="fail">{result.failed} failed</span>}
            {result.status !== "completed" && <span className="fail"> · {result.status}</span>}
            <span className="muted"> · {(result.duration_ms / 1000).toFixed(1)}s</span>
          </div>
          <div className="output">{result.stdout}{result.stderr ? "\n--- stderr ---\n" + result.stderr : ""}</div>
          {result.truncated && <div className="muted">Output truncated.</div>}
        </div>
      )}
    </>
  );
}

/* ---------------- team ---------------- */

interface Teammate {
  name: string;
  role: string;
  replies: { match: string[]; text: string }[];
  fallback: string;
}

interface ChatMsg {
  from: string;
  text: string;
  mine: boolean;
  simulated?: boolean;
}

export function TeamPanel() {
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    setLoaded(false);
    api
      .readFile(".fydell/teammates.json")
      .then((f) => {
        try {
          const def = JSON.parse(f.content) as { teammates: Teammate[]; thread: ChatMsg[] };
          setTeammates(def.teammates ?? []);
          setMsgs(def.thread ?? []);
        } catch {
          setTeammates([]);
        } finally {
          setLoaded(true);
        }
      })
      .catch(() => {
        setTeammates([]);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMsgs((m) => [...m, { from: "You", text, mine: true }]);
    try {
      await api.appendEvent("message_sent", { chars: text.length });
    } catch {}

    // Scripted reply: first teammate whose keywords match, else fallback.
    const lower = text.toLowerCase();
    let reply: ChatMsg | null = null;
    for (const t of teammates) {
      const hit = t.replies.find((r) => r.match.some((k) => lower.includes(k.toLowerCase())));
      if (hit) {
        reply = { from: t.name, text: hit.text, mine: false, simulated: true };
        break;
      }
    }
    if (!reply && teammates.length) {
      const t = teammates[0];
      reply = { from: t.name, text: t.fallback, mine: false, simulated: true };
    }
    if (reply) {
      const r = reply;
      setTimeout(() => setMsgs((m) => [...m, r]), 900);
    }
  }, [draft, teammates]);

  return (
    <>
      <h3>
        Team thread <ProvenanceTag kind="generated" />
      </h3>
      <p className="muted">
        Everyone here except you is <strong>simulated</strong> — scripted by the
        scenario, not a real coworker. Your own messages are observed evidence.
      </p>
      {loaded && teammates.length === 0 && msgs.length === 0 ? (
        <EmptyState
          icon="chat"
          title="No team thread"
          body="The scenario's team thread couldn't load. Your work is unaffected — try loading it again."
          actionLabel="Retry"
          onAction={load}
        />
      ) : (
        <div>
          {msgs.map((m, i) => (
            <div key={i} className={`msg ${m.mine ? "me" : ""} ${m.simulated ? "simulated" : ""}`}>
              <div className="who">
                {m.from} {m.simulated && <ProvenanceTag kind="generated" />}
              </div>
              <div className="bubble">{m.text}</div>
            </div>
          ))}
        </div>
      )}
      <div className="composer">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the team…"
          aria-label="Message the simulated team"
        />
        <button className="btn ghost" onClick={send}>Send</button>
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
    </>
  );
}
