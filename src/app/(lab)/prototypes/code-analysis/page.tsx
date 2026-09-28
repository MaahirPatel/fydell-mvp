"use client";

/**
 * Prototype: deterministic code analysis.
 *
 * Paste Python files (or load the Northbeam demo), run the analyzer, and
 * inspect findings with exact file/line evidence. Functional prototype UI —
 * no design work here by design (design is parked).
 */
import { useCallback, useState } from "react";
import type { AnalysisReport, Finding, Severity } from "@/lib/code-analysis/types";

interface PendingFile {
  id: number;
  path: string;
  content: string;
}

const SEVERITY_ORDER: Severity[] = ["bug", "security", "risk", "note"];
const SEVERITY_LABEL: Record<Severity, string> = {
  bug: "Bugs",
  security: "Security",
  risk: "Risks",
  note: "Notes",
};

let nextId = 1;

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(finding.severity === "bug");
  return (
    <div
      style={{
        border: "1px solid #e2e2e2",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 10,
        background: "#fff",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "flex",
          width: "100%",
          gap: 8,
          alignItems: "baseline",
        }}
      >
        <span style={{ fontSize: 12, color: "#666", minWidth: 16 }}>{open ? "▾" : "▸"}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color:
              finding.severity === "bug"
                ? "#b3261e"
                : finding.severity === "security"
                  ? "#7c3aed"
                  : finding.severity === "risk"
                    ? "#9a6700"
                    : "#555",
          }}
        >
          {finding.severity}
        </span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{finding.title}</span>
        <span style={{ fontSize: 12, color: "#666", marginLeft: "auto", whiteSpace: "nowrap" }}>
          {finding.file}:{finding.line}
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
          <p style={{ margin: "0 0 8px" }}>{finding.summary}</p>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
            code <code>{finding.code}</code> · confidence {finding.confidence}
          </div>
          {finding.evidence.map((e, i) => (
            <div
              key={i}
              style={{
                background: "#f7f7f7",
                borderRadius: 6,
                padding: "6px 10px",
                marginBottom: 6,
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
              }}
            >
              <div style={{ color: "#444" }}>
                <strong>{e.role}</strong> — {e.file}:{e.line}
                {e.endLine && e.endLine !== e.line ? `–${e.endLine}` : ""}
                {e.note ? ` · ${e.note}` : ""}
              </div>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{e.snippet}</div>
            </div>
          ))}
          {finding.uncertainAbout && (
            <p style={{ margin: "8px 0", color: "#7a5b00" }}>
              <strong>Unknown:</strong> {finding.uncertainAbout}
            </p>
          )}
          {finding.suggestedFix && (
            <p style={{ margin: "8px 0 0", color: "#1a5c2e" }}>
              <strong>Suggested fix:</strong> {finding.suggestedFix}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CodeAnalysisPrototypePage() {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [path, setPath] = useState("snippet.py");
  const [content, setContent] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFile = useCallback(() => {
    if (!content.trim()) return;
    setFiles((f) => [...f, { id: nextId++, path: path.trim() || `snippet-${nextId}.py`, content }]);
    setContent("");
  }, [path, content]);

  const removeFile = useCallback((id: number) => {
    setFiles((f) => f.filter((x) => x.id !== id));
    setReport(null);
  }, []);

  const analyze = useCallback(
    async (demo: boolean) => {
      setRunning(true);
      setError(null);
      setReport(null);
      try {
        const res = await fetch("/api/prototypes/code-analysis", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            demo ? { demo: "northbeam" } : { files: files.map(({ path, content }) => ({ path, content })) },
          ),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        setReport(data as AnalysisReport);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRunning(false);
      }
    },
    [files],
  );

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 80px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>Prototype · deterministic</p>
      <h1 style={{ fontSize: 26, margin: "4px 0 8px" }}>Code analysis</h1>
      <p style={{ fontSize: 14, color: "#444", maxWidth: 640, lineHeight: 1.6 }}>
        Paste Python source (or load the Northbeam demo) and run a deterministic AST analysis.
        Findings cite exact file/line evidence. <strong>Bug</strong> means the defect is demonstrated
        by the cited code; <strong>risk</strong> means the pattern is real but the impact depends on
        stated unknowns. Nothing is generated by a language model — see the LLM status below.
        Submitted code is parsed, never executed.
      </p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>1. Add files</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="filename.py"
            style={{ border: "1px solid #ccc", borderRadius: 6, padding: "8px 10px", fontSize: 13, width: 220 }}
          />
          <button
            onClick={() => analyze(true)}
            disabled={running}
            style={{ border: "1px solid #ccc", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer", background: "#f0f0f0" }}
          >
            {running ? "Analyzing…" : "Analyze Northbeam demo"}
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste Python source here…"
          rows={10}
          style={{
            width: "100%",
            border: "1px solid #ccc",
            borderRadius: 6,
            padding: 10,
            fontFamily: "ui-monospace, monospace",
            fontSize: 12.5,
          }}
        />
        <div style={{ marginTop: 8 }}>
          <button
            onClick={addFile}
            disabled={!content.trim() || running}
            style={{ border: "1px solid #ccc", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer", background: "#fff" }}
          >
            Add file
          </button>
        </div>
        {files.length > 0 && (
          <ul style={{ marginTop: 12, padding: 0, listStyle: "none" }}>
            {files.map((f) => (
              <li key={f.id} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid #eee", display: "flex", gap: 8 }}>
                <span style={{ fontFamily: "ui-monospace, monospace" }}>{f.path}</span>
                <span style={{ color: "#888" }}>{f.content.split("\n").length} lines</span>
                <button onClick={() => removeFile(f.id)} style={{ marginLeft: "auto", fontSize: 12, color: "#b3261e", cursor: "pointer", background: "none", border: "none" }}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>2. Run</h2>
        <button
          onClick={() => analyze(false)}
          disabled={files.length === 0 || running}
          style={{
            borderRadius: 6,
            padding: "10px 18px",
            fontSize: 14,
            cursor: files.length === 0 || running ? "not-allowed" : "pointer",
            background: files.length === 0 || running ? "#ddd" : "#111",
            color: "#fff",
            border: "none",
          }}
        >
          {running ? "Analyzing…" : `Analyze ${files.length} file${files.length === 1 ? "" : "s"}`}
        </button>
        {error && <p style={{ color: "#b3261e", fontSize: 13 }}>Error: {error}</p>}
      </section>

      {report && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16 }}>3. Report</h2>
          <div style={{ display: "flex", gap: 16, fontSize: 13, marginBottom: 12, flexWrap: "wrap" }}>
            <span><strong>{report.summary.filesAnalyzed}</strong> files</span>
            <span><strong>{report.summary.functions}</strong> functions</span>
            <span style={{ color: "#b3261e" }}><strong>{report.summary.bugs}</strong> bugs</span>
            <span style={{ color: "#7c3aed" }}><strong>{report.summary.security}</strong> security</span>
            <span style={{ color: "#9a6700" }}><strong>{report.summary.risks}</strong> risks</span>
            <span style={{ color: "#555" }}><strong>{report.summary.notes}</strong> notes</span>
          </div>
          <p style={{ fontSize: 12, color: "#666", background: "#f7f7f7", borderRadius: 6, padding: "8px 12px" }}>
            LLM layer: <strong>{report.llm.kind}</strong> — {report.llm.note}
          </p>
          <p style={{ fontSize: 12, color: "#666" }}>{report.confidenceNote}</p>
          {report.errors.length > 0 && (
            <div style={{ fontSize: 13, color: "#9a6700", marginBottom: 12 }}>
              {report.errors.map((e, i) => (
                <div key={i}>{e.file}: {e.message}</div>
              ))}
            </div>
          )}
          {SEVERITY_ORDER.map((sev) => {
            const list = report.findings.filter((f) => f.severity === sev);
            if (list.length === 0) return null;
            return (
              <div key={sev} style={{ marginTop: 18 }}>
                <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 0.6, color: "#555" }}>
                  {SEVERITY_LABEL[sev]} ({list.length})
                </h3>
                {list.map((f, i) => (
                  <FindingCard key={`${f.code}-${f.file}-${f.line}-${i}`} finding={f} />
                ))}
              </div>
            );
          })}
          {report.findings.length === 0 && (
            <p style={{ fontSize: 14, color: "#1a5c2e" }}>No findings. The analyzed code is clean against this prototype&apos;s detectors.</p>
          )}
          <h3 style={{ fontSize: 14, marginTop: 24 }}>Functions analyzed</h3>
          <table style={{ fontSize: 12, borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#666" }}>
                <th style={{ padding: "4px 8px" }}>Function</th>
                <th style={{ padding: "4px 8px" }}>File</th>
                <th style={{ padding: "4px 8px" }}>Line</th>
                <th style={{ padding: "4px 8px" }}>Complexity</th>
              </tr>
            </thead>
            <tbody>
              {report.functionSummaries.map((f, i) => (
                <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "4px 8px", fontFamily: "ui-monospace, monospace" }}>{f.name}</td>
                  <td style={{ padding: "4px 8px", fontFamily: "ui-monospace, monospace" }}>{f.file}</td>
                  <td style={{ padding: "4px 8px" }}>{f.line}</td>
                  <td style={{ padding: "4px 8px" }}>{f.complexity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
