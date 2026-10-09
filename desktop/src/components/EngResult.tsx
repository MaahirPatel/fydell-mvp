import { useCallback, useEffect, useState } from "react";
import { engApi } from "../lib/tauri";
import {
  EngLocalState,
  EngReport,
  EngView,
  RECEIPT_STAGES,
  checkOutcomeLabel,
  citationLabel,
  formatBytes,
  receiptProgress,
} from "../lib/eng";
import { messageOf } from "../App";
import { EmptyState, ProvenanceTag, Skeleton } from "./ui";
import { Bullets } from "./EngAssessment";

export function EngReceiptView({ view, local }: { view: EngView; local: EngLocalState | null }) {
  const receipt = view.receipt ?? local?.receipt ?? null;
  if (!receipt) {
    return (
      <div className="eng-panel">
        <div className="eng-panel-title">Submitted</div>
        <p className="muted">
          Submitted {view.attempt.submittedAt ? new Date(view.attempt.submittedAt).toLocaleString() : ""}. The
          receipt is not available from the server right now; reopen this task to load it.
        </p>
      </div>
    );
  }
  const progress = receiptProgress(receipt.processing);
  const localSha = local?.lastPackage?.sha256 ?? null;
  const builtHere = localSha != null && localSha.toLowerCase() === receipt.archiveSha256.toLowerCase();

  return (
    <div className="eng-panel">
      <div className="receipt-head">
        <div className="eng-panel-title">Submission receipt</div>
        {receipt.late && <span className="chip chip-warn">Late</span>}
      </div>
      <ol className="eng-steps" aria-label="Progress">
        {RECEIPT_STAGES.map((s, i) => (
          <li key={s} className={i < progress.index ? "done" : i === progress.index ? "current" : ""}>
            {s}
          </li>
        ))}
      </ol>
      <p className={progress.delayed ? "error" : "muted"}>{progress.note}</p>
      <div className="receipt-box">
        <div>
          <span className="k">submitted </span>
          {new Date(receipt.submittedAt).toLocaleString()}
        </div>
        <div>
          <span className="k">archive </span>
          {formatBytes(receipt.archiveBytes)}
        </div>
        <div>
          <span className="k">sha256 </span>
          <span className="hash">{receipt.archiveSha256}</span>
        </div>
        <div>
          <span className="k">submission </span>
          <span className="hash">{receipt.submissionId}</span>
        </div>
      </div>
      <p className="muted">
        {builtHere
          ? "This fingerprint matches the archive this app built and uploaded from your project folder."
          : "This archive was not the last one built by this app on this computer, so it cannot be compared with a local copy here."}
      </p>
    </div>
  );
}

export function EngReportView({ attemptId, processing }: { attemptId: string; processing: string | null }) {
  const [report, setReport] = useState<EngReport | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await engApi.getReport(attemptId));
    } catch (e) {
      setError(messageOf(e));
      setReport(null);
    }
  }, [attemptId]);

  useEffect(() => {
    let live = true;
    engApi.getReport(attemptId).then(
      (r) => live && setReport(r),
      (e: unknown) => {
        if (!live) return;
        setError(messageOf(e));
        setReport(null);
      },
    );
    return () => {
      live = false;
    };
  }, [attemptId, processing]);

  if (report === undefined) {
    return (
      <div className="eng-panel">
        <Skeleton height={16} width="40%" />
        <Skeleton height={12} className="mt-2" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="eng-panel">
        <div className="error">{error}</div>
        <button className="btn ghost sm mt-2" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }
  if (!report) {
    return (
      <div className="eng-panel">
        <EmptyState
          icon="file"
          title="Report not released yet"
          body="The hiring team releases your report after they review it. It will appear here, and on the web, once they do."
          actionLabel="Check again"
          onAction={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="eng-panel eng-report">
      <div className="receipt-head">
        <div className="eng-panel-title">Your report</div>
        <ProvenanceTag kind="observed" />
      </div>
      <p className="muted">
        Version {report.version}
        {report.releasedAt && <> · released {new Date(report.releasedAt).toLocaleString()}</>} · rubric{" "}
        {report.rubricVersion}
        {report.changeReason && <> · {report.changeReason}</>}
      </p>
      <p className="eng-pre">{report.summary}</p>

      {report.dimensions.length > 0 && (
        <>
          <h3 className="eng-h3">Dimensions</h3>
          <ul className="eng-list">
            {report.dimensions.map((d) => (
              <li key={d.label}>
                <div className="row">
                  <span className="strong">{d.label}</span>
                  <span className="chip">{d.level}</span>
                </div>
                <div className="muted">{d.rationale}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {report.criteria.length > 0 && (
        <>
          <h3 className="eng-h3">Criteria</h3>
          <ul className="eng-list">
            {report.criteria.map((c) => (
              <li key={c.id}>
                <div className="row">
                  <span className="strong">{c.label}</span>
                  <span className={`chip ${c.stateKey === "met" ? "chip-ok" : c.stateKey === "not_met" ? "chip-warn" : ""}`}>
                    {c.state}
                  </span>
                </div>
                <div className="muted">{c.requirement}</div>
                {c.observed && <div>Observed: {c.observed}</div>}
                <div>{c.rationale}</div>
                {c.notCovered && <div className="muted">Not covered: {c.notCovered}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {report.strengths.length > 0 && (
        <>
          <h3 className="eng-h3">Strengths</h3>
          <Bullets items={report.strengths} />
        </>
      )}
      {report.gaps.length > 0 && (
        <>
          <h3 className="eng-h3">Gaps</h3>
          <Bullets items={report.gaps} />
        </>
      )}

      {report.findings.length > 0 && (
        <>
          <h3 className="eng-h3">Findings</h3>
          <ul className="eng-list">
            {report.findings.map((f) => (
              <li key={f.id}>
                <div className="row">
                  <span className="chip">{f.dimension}</span>
                  <span className="muted">{f.basis === "observed" ? "Observed" : "Inference"}</span>
                </div>
                <div>{f.statement}</div>
                {f.citations.length > 0 && (
                  <div className="eng-cites">
                    {f.citations.map((c, i) => (
                      <span key={i} className="mono">
                        {citationLabel(c)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {(report.publicChecks.length > 0 || report.hiddenChecks) && (
        <>
          <h3 className="eng-h3">Checks</h3>
          <ul className="eng-list">
            {report.publicChecks.map((c) => (
              <li key={c.id} className="row">
                <span>{c.title}</span>
                <span className={`chip ${c.outcome === "passed" ? "chip-ok" : "chip-warn"}`}>{checkOutcomeLabel(c.outcome)}</span>
              </li>
            ))}
            {report.hiddenChecks && (
              <li className="row">
                <span>Hidden checks</span>
                <span className="chip">
                  {report.hiddenChecks.passed} of {report.hiddenChecks.total} passed
                </span>
              </li>
            )}
          </ul>
        </>
      )}

      {report.improvements.length > 0 && (
        <>
          <h3 className="eng-h3">What to improve</h3>
          <ul className="eng-list">
            {report.improvements.map((m) => (
              <li key={m.criterionId}>
                <div className="strong">{m.label}</div>
                <div>{m.observation}</div>
                <div className="muted">Why it matters: {m.whyItMatters}</div>
                <div>Next step: {m.nextStep}</div>
                {m.recheck && <div className="muted">To check yourself: {m.recheck}</div>}
                {m.limit && <div className="muted">{m.limit}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {report.limitations.length > 0 && (
        <>
          <h3 className="eng-h3">Limitations</h3>
          <Bullets items={report.limitations} />
        </>
      )}
      {report.notAssessed.length > 0 && (
        <>
          <h3 className="eng-h3">Not assessed</h3>
          <Bullets items={report.notAssessed} />
        </>
      )}

      {report.responses.length > 0 && (
        <>
          <h3 className="eng-h3">Your responses</h3>
          <ul className="eng-list">
            {report.responses.map((r) => (
              <li key={r.id}>
                <div className="row">
                  <span className="chip">{r.kind.replace(/_/g, " ")}</span>
                  <span className="muted">{r.status.replace(/_/g, " ")}</span>
                </div>
                <div className="eng-pre">{r.body}</div>
                {r.resolution && <div className="muted">Resolution: {r.resolution}</div>}
              </li>
            ))}
          </ul>
        </>
      )}

      {report.versions.length > 1 && (
        <p className="muted">
          {report.versions.length} versions of this report exist; this is version {report.version}.
        </p>
      )}
      <p className="muted">To question or correct something in this report, respond from the report page on the web.</p>
    </div>
  );
}
