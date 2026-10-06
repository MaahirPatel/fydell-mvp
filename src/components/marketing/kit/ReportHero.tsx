"use client";

import { useState } from "react";
import s from "./report-hero.module.css";

/**
 * Hero visual: Builder Report with layered composition.
 *
 * Three layers (Linear-style, light theme):
 * 1. Quiet context: project list background
 * 2. Primary work surface: the Builder Report with findings
 * 3. Enlarged foreground: the selected source excerpt, deliberately overlapping
 *
 * Every claim is supported by the displayed code. All content is
 * illustrative, labeled as such.
 */

type Finding = {
  id: string;
  marker: string;
  title: string;
  body: string;
  source: {
    path: string;
    lineRange: string;
    revision: string;
    excerpt: { n: number; text: string }[];
    highlightLines: number[];
  };
  kind: "finding" | "observation" | "limitation";
};

const FINDINGS: Finding[] = [
  {
    id: "retry-bounded",
    marker: "F-01",
    title: "Retry behavior is bounded by an explicit attempt limit",
    body: "The delivery loop caps retries at 5 attempts. After the 5th failure the message moves to a dead-letter queue instead of retrying indefinitely.",
    source: {
      path: "src/delivery/retry.ts",
      lineRange: "12–26",
      revision: "a3f9c2d",
      excerpt: [
        { n: 12, text: "const MAX_ATTEMPTS = 5;" },
        { n: 13, text: "" },
        { n: 14, text: "async function deliver(msg: Message, send: Sender) {" },
        { n: 15, text: "  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {" },
        { n: 16, text: "    try {" },
        { n: 17, text: "      await send(msg);" },
        { n: 18, text: "      return { ok: true, attempt };" },
        { n: 19, text: "    } catch (err) {" },
        { n: 20, text: "      if (attempt === MAX_ATTEMPTS) {" },
        { n: 21, text: "        await deadLetter(msg, err);" },
        { n: 22, text: "      }" },
        { n: 23, text: "      await backoff(attempt);" },
        { n: 24, text: "    }" },
        { n: 25, text: "  }" },
        { n: 26, text: "}" },
      ],
      highlightLines: [12, 15, 20, 21],
    },
    kind: "finding",
  },
  {
    id: "retry-tested",
    marker: "O-02",
    title: "Sustained-load behavior was not assessed in this report",
    body: "This report inspected the retry module and its unit test. Whether the service holds up under sustained delivery pressure was outside the scope of this assessment.",
    source: {
      path: "test/delivery/retry.test.ts",
      lineRange: "1–8",
      revision: "a3f9c2d",
      excerpt: [
        { n: 1, text: "describe('retry', () => {" },
        { n: 2, text: "  it('stops after 5 attempts', async () => {" },
        { n: 3, text: "    const sender = jest.fn()" },
        { n: 4, text: "      .mockRejectedValue(new Error('timeout'));" },
        { n: 5, text: "    await deliver({ id: 'm1' }, sender);" },
        { n: 6, text: "    expect(sender).toHaveBeenCalledTimes(5);" },
        { n: 7, text: "  });" },
        { n: 8, text: "});" },
      ],
      highlightLines: [2, 6],
    },
    kind: "observation",
  },
  {
    id: "limitation",
    marker: "L-01",
    title: "Production behavior not verified",
    body: "This report describes the code as written. Deployment configuration, actual traffic patterns, and operational outcomes were not observed.",
    source: {
      path: "",
      lineRange: "",
      revision: "a3f9c2d",
      excerpt: [],
      highlightLines: [],
    },
    kind: "limitation",
  },
];

const PROJECTS = [
  { name: "webhook-delivery-service", rev: "a3f9c2d", active: true },
  { name: "api-gateway", rev: "7e2b1a4", active: false },
  { name: "worker-queue", rev: "c9d4e8f", active: false },
];

export default function ReportHero() {
  const [selectedId, setSelectedId] = useState(FINDINGS[0].id);
  const selected = FINDINGS.find((f) => f.id === selectedId) ?? FINDINGS[0];
  const hasSource = selected.source.excerpt.length > 0;

  return (
    <section className={s.scene} aria-labelledby="report-hero-heading">
      {/* Layer 1: Quiet context — project list */}
      <div className={s.context} aria-hidden>
        <div className={s.contextHead}>Projects</div>
        {PROJECTS.map((p) => (
          <div key={p.name} className={`${s.contextRow} ${p.active ? s.contextActive : ""}`}>
            <span className={s.contextName}>{p.name}</span>
            <code className={s.contextRev}>{p.rev}</code>
          </div>
        ))}
      </div>

      {/* Layer 2: Primary work surface — the report */}
      <div className={s.report}>
        <div className={s.reportHead}>
          <div>
            <p className={s.reportKicker}>Builder Report</p>
            <h3 id="report-hero-heading" className={s.reportTitle}>
              webhook-delivery-service
            </h3>
            <p className={s.reportSub}>Part of your engineering work record.</p>
          </div>
          <div className={s.reportMeta}>
            <span className={s.metaItem}>rev a3f9c2d</span>
            <span
              className={s.metaItem}
              title="This report assessed 3 files: src/delivery/retry.ts, src/delivery/backoff.ts, test/delivery/retry.test.ts"
            >
              Scope: 3 files
            </span>
          </div>
        </div>

        <ul className={s.findingList}>
          {FINDINGS.map((f) => (
            <li key={f.id}>
              <button
                onClick={() => setSelectedId(f.id)}
                aria-pressed={f.id === selectedId}
                className={`${s.finding} ${f.id === selectedId ? s.findingActive : ""} ${s[f.kind]}`}
              >
                <span className={s.findingMarker} aria-hidden>
                  {f.marker}
                </span>
                <span className={s.findingText}>
                  <span className={s.findingTitle}>{f.title}</span>
                  <span className={s.findingKind}>
                    {f.kind === "finding"
                      ? "Finding"
                      : f.kind === "observation"
                        ? "Observation"
                        : "Limitation"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className={s.findingDetail} key={selected.id}>
          <p className={s.detailBody}>{selected.body}</p>
        </div>

        <p className={s.reportFooter}>
          Review the findings. Choose what to share. Keep the source attached.
        </p>
      </div>

      {/* Layer 3: Enlarged foreground — the selected source */}
      <div className={s.source} aria-label="Source excerpt for the selected finding">
        {hasSource ? (
          <>
            <div className={s.sourceHead}>
              <span className={s.sourceMarker} aria-hidden>
                {selected.marker}
              </span>
              <code className={s.sourcePath}>
                {selected.source.path}:{selected.source.lineRange}
              </code>
            </div>
            <pre className={s.sourceCode}>
              {selected.source.excerpt.map((line) => (
                <span
                  key={line.n}
                  className={
                    selected.source.highlightLines.includes(line.n)
                      ? s.highlight
                      : undefined
                  }
                >
                  <span className={s.lineNum} aria-hidden>
                    {line.n}
                  </span>
                  {line.text || " "}
                  {"\n"}
                </span>
              ))}
            </pre>
          </>
        ) : (
          <p className={s.noSource}>
            No source excerpt. This is a scope limitation, not a code observation.
          </p>
        )}
        <p className={s.demoLabel}>Illustrative report · demo repository</p>
      </div>
    </section>
  );
}
