import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/tauri";
import { analyzeWorkspace, AnalysisReport, WorkspaceFile } from "../lib/analysis";
import { EmptyState, ProvenanceTag } from "./ui";

/* ============================================================================
   Analysis panel — the code analysis prototype engine, surfaced in the
   workspace. Runs a real static-analysis pass over actual workspace file
   contents (no mocked findings) and shows structured results.

   Baseline: on the first workspace mount of a session, file contents are
   snapshotted to localStorage as the starter baseline. Diffing is honest
   about being heuristic.
   ========================================================================== */

function baselineKey(sessionId: string | null): string {
  return `fydell-baseline-${sessionId ?? "unknown"}`;
}

/** Snapshot current files as the starter baseline (first run only). */
export async function ensureBaseline(sessionId: string | null): Promise<WorkspaceFile[]> {
  const key = baselineKey(sessionId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as WorkspaceFile[];
  } catch {}
  const files = await api.listFiles();
  const contents: WorkspaceFile[] = [];
  for (const f of files) {
    try {
      const c = await api.readFile(f.path);
      contents.push({ path: f.path, content: c.content });
    } catch {}
  }
  try {
    localStorage.setItem(key, JSON.stringify(contents));
  } catch {}
  return contents;
}

export async function loadCurrentFiles(): Promise<WorkspaceFile[]> {
  const files = await api.listFiles();
  const contents: WorkspaceFile[] = [];
  for (const f of files) {
    try {
      const c = await api.readFile(f.path);
      contents.push({ path: f.path, content: c.content });
    } catch {}
  }
  return contents;
}

/** Run the analysis now (used by the submit flow to attach findings). */
export async function runAnalysis(sessionId: string | null): Promise<AnalysisReport> {
  const [baseline, current] = await Promise.all([
    ensureBaseline(sessionId),
    loadCurrentFiles(),
  ]);
  return analyzeWorkspace(current, baseline);
}

export default function AnalysisPanel({ sessionId }: { sessionId: string | null }) {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await runAnalysis(sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void run();
  }, [run]);

  if (loading) {
    return (
      <>
        <h3>Code analysis <ProvenanceTag kind="generated" /></h3>
        <p className="muted">Reading your workspace…</p>
      </>
    );
  }

  if (error || !report) {
    return (
      <>
        <h3>Code analysis <ProvenanceTag kind="generated" /></h3>
        <EmptyState
          icon="flask"
          title="Analysis failed"
          body={error ?? "Could not analyze the workspace."}
          actionLabel="Retry"
          onAction={() => void run()}
        />
      </>
    );
  }

  return (
    <>
      <h3>
        Code analysis <ProvenanceTag kind="generated" />
      </h3>
      <p className="muted">{report.scope}</p>
      <button className="btn ghost sm" onClick={() => void run()}>
        Re-run analysis
      </button>

      <div className="analysis-summary">
        <div className="analysis-stat">
          <div className="analysis-stat-num">{report.filesChanged}</div>
          <div className="muted">files changed</div>
        </div>
        <div className="analysis-stat">
          <div className="analysis-stat-num">+{report.totalLinesAdded}</div>
          <div className="muted">lines added</div>
        </div>
        <div className="analysis-stat">
          <div className="analysis-stat-num">-{report.totalLinesRemoved}</div>
          <div className="muted">lines removed</div>
        </div>
        <div className="analysis-stat">
          <div className="analysis-stat-num">{report.functionsAdded.length}</div>
          <div className="muted">functions added</div>
        </div>
      </div>

      {report.functionsAdded.length > 0 && (
        <section className="mt-4">
          <div className="section-label">New functions</div>
          {report.functionsAdded.map((f, i) => (
            <div key={i} className="analysis-row">
              <span className="mono strong">{f.name}</span>
              <span className="muted">{f.file}</span>
              {(() => {
                const cov = report.coverage.find(
                  (c) => c.functionName === f.name && c.file === f.file
                );
                return cov && cov.referencedByTests.length > 0 ? (
                  <span className="chip chip-ok">tested</span>
                ) : (
                  <span className="chip">no test reference</span>
                );
              })()}
            </div>
          ))}
        </section>
      )}

      {report.functionsRemoved.length > 0 && (
        <section className="mt-4">
          <div className="section-label">Removed functions</div>
          {report.functionsRemoved.map((f, i) => (
            <div key={i} className="analysis-row">
              <span className="mono">{f.name}</span>
              <span className="muted">{f.file}</span>
            </div>
          ))}
        </section>
      )}

      {(report.signals.longFunctions.length > 0 ||
        report.signals.deepNesting.length > 0 ||
        report.signals.missingErrorHandling.length > 0) && (
        <section className="mt-4">
          <div className="section-label">Complexity signals</div>
          {report.signals.longFunctions.map((s, i) => (
            <div key={`l${i}`} className="analysis-row">
              <span className="tag tag-attention">long</span>
              <span className="mono">{s.name}</span>
              <span className="muted">{s.lines} lines · {s.file}</span>
            </div>
          ))}
          {report.signals.deepNesting.map((s, i) => (
            <div key={`n${i}`} className="analysis-row">
              <span className="tag tag-attention">nested</span>
              <span className="mono">{s.name}</span>
              <span className="muted">depth {s.depth} · {s.file}</span>
            </div>
          ))}
          {report.signals.missingErrorHandling.map((s, i) => (
            <div key={`e${i}`} className="analysis-row">
              <span className="tag tag-attention">no try/except</span>
              <span className="mono">{s.name}</span>
              <span className="muted">{s.file}</span>
            </div>
          ))}
        </section>
      )}

      {report.signals.todoCount > 0 && (
        <section className="mt-4">
          <div className="section-label">Leftovers ({report.signals.todoCount})</div>
          {report.files.flatMap((f) =>
            f.todos.map((t, i) => (
              <div key={`${f.path}-${i}`} className="analysis-row">
                <span className="mono">{f.path}:{t.line}</span>
                <span className="muted">{t.text}</span>
              </div>
            ))
          )}
        </section>
      )}

      <section className="mt-4">
        <div className="section-label">Files</div>
        {report.files.map((f) => (
          <div key={f.path}>
            <button
              className="analysis-file-head"
              onClick={() => setExpanded(expanded === f.path ? null : f.path)}
            >
              <span className="mono">{f.path}</span>
              {f.changed ? (
                <span className="chip chip-ok">changed</span>
              ) : (
                <span className="muted">unchanged</span>
              )}
              <span className="muted">
                {f.functions.length} functions
              </span>
            </button>
            {expanded === f.path && (
              <div className="analysis-file-body">
                {f.functions.length === 0 && (
                  <div className="muted">No functions detected.</div>
                )}
                {f.functions.map((fn, i) => (
                  <div key={i} className="analysis-row">
                    <span className="mono">{fn.name}</span>
                    <span className="muted">
                      {fn.kind} · L{fn.startLine} · {fn.length} lines · depth {fn.maxNesting}
                      {fn.hasErrorHandling ? " · try/except" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
