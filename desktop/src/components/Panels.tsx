import { useCallback, useEffect, useState } from "react";
import { api, Receipt, SessionEvent, TestRunResult } from "../lib/tauri";
import { messageOf } from "../App";

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
      <h3>Public test suite</h3>
      <p className="muted">Runs locally on your machine. The hidden evaluation runs on submit.</p>
      <button className="btn" onClick={run} disabled={running}>
        {running ? "Running…" : "Run tests"}
      </button>
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 12 }}>
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

  useEffect(() => {
    api
      .readFile(".fydell/teammates.json")
      .then((f) => {
        try {
          const def = JSON.parse(f.content) as { teammates: Teammate[]; thread: ChatMsg[] };
          setTeammates(def.teammates ?? []);
          setMsgs(def.thread ?? []);
        } catch {}
      })
      .catch(() => {});
  }, []);

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
      <h3>Team thread</h3>
      <p className="muted">
        Teammates here are <span className="sim-badge">simulated</span> — part of the scenario, not real people.
      </p>
      <div>
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.mine ? "me" : ""}`}>
            <div className="who">
              {m.from} {m.simulated && <span className="sim-badge">simulated</span>}
            </div>
            <div className="bubble">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="composer">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask the team…"
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const receipt = await api.submit({ summary, approach, tradeoffs });
      onSubmitted(receipt);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }, [summary, approach, tradeoffs, onSubmitted]);

  return (
    <>
      <h3>Submit for review</h3>
      <p className="muted">
        Submission is immutable. Your files, test record, and event trail are
        packaged with a SHA-256 receipt. A human reviews every submission.
      </p>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>What did you change, in one paragraph?</label>
        <textarea className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="field">
        <label>Approach & key decisions</label>
        <textarea className="textarea" value={approach} onChange={(e) => setApproach(e.target.value)} />
      </div>
      <div className="field">
        <label>Tradeoffs / what you'd do with more time</label>
        <textarea className="textarea" value={tradeoffs} onChange={(e) => setTradeoffs(e.target.value)} />
      </div>
      <button className="btn" disabled={busy} onClick={submit}>
        {busy ? "Submitting…" : "Submit"}
      </button>
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
      <h3>Your evidence trail</h3>
      <p className="muted">Everything recorded in this session. This ships with your submission.</p>
      <div>
        {events.map((e) => (
          <div key={e.seq} className="test-row">
            <span className="muted">#{e.seq}</span>
            <span>{e.kind}</span>
            <span className="muted">{new Date(e.ts).toLocaleTimeString()}</span>
          </div>
        ))}
        {!events.length && <div className="muted">No events yet.</div>}
      </div>
    </>
  );
}
