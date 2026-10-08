"use client";

import { useState } from "react";
import { Eye, FileCode2 } from "lucide-react";
import { PROJECT_STATE_LABEL, formatPeriod } from "@/lib/passport/presentation";
import { EXAMPLE_PRESENTATIONS, EXAMPLE_PROJECTS } from "./fixture";
import s from "./passport-hero.module.css";

const ITEM = EXAMPLE_PRESENTATIONS[0];
const PROJECT = EXAMPLE_PROJECTS[0];

type FindingId = "sample-retry-cap" | "sample-dedupe" | "sample-test-400";

/** Short names for the highlights, and the excerpt lines each claim rests on. */
const HIGHLIGHT: Record<FindingId, { label: string; key: readonly number[] }> = {
  "sample-dedupe": { label: "Repeated events are skipped", key: [2, 5] },
  "sample-retry-cap": { label: "Retries are bounded", key: [0, 1, 4, 11] },
  "sample-test-400": { label: "A 400 is sent once", key: [1, 3, 4] },
};
const ORDER: readonly FindingId[] = ["sample-dedupe", "sample-retry-cap", "sample-test-400"];

const TOKEN = /(\/\/.*$)|("[^"]*")|\b(const|let|export|function|async|await|return|if|for|new|it|expect)\b|\b(\d+)\b/g;

function highlight(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const [value, comment, str, keyword] = m;
    const cls = comment ? s.comment : str ? s.str : keyword ? s.kw : s.num;
    out.push(
      <span key={start} className={cls}>
        {value}
      </span>,
    );
    last = start + value.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * The Passport at the two levels a recipient reads it: one project's overview
 * (purpose, the engineer's part, how it works, evidence highlights) and the
 * selected highlight opened to its source lines and limits. Example data.
 */
export default function ProfileWorkspace() {
  const [selected, setSelected] = useState<FindingId>("sample-retry-cap");
  const finding = PROJECT.evidence.find((e) => e.id === selected) ?? PROJECT.evidence[0];
  const index = ORDER.indexOf(selected);
  const keyLines = new Set(HIGHLIGHT[selected].key);

  return (
    <div className={s.root}>
      <div className={s.win}>
        <div className={s.bar}>
          <span className={s.crumb}>
            <span className={s.dim}>Passport</span>
            <span className={s.dim} aria-hidden>
              /
            </span>
            <span>{ITEM.title}</span>
          </span>
          <span className={s.shareable}>
            <Eye aria-hidden size={13} /> Shareable
          </span>
        </div>

        <div className={s.body}>
          <section className={s.overview} aria-label="Project overview">
            <p className={s.meta}>
              {["Public repository", PROJECT_STATE_LABEL[ITEM.projectState], formatPeriod(ITEM.startedOn, ITEM.endedOn, ITEM.projectState)].filter(Boolean).join(" · ")}
            </p>
            <p className={s.title}>{ITEM.title}</p>
            <p className={s.summary}>{ITEM.summary}</p>

            <div className={s.part}>
              <p className={s.label}>Your part</p>
              <p className={s.partText}>{PROJECT.contributionStatement}</p>
            </div>

            <figure className={s.flow} aria-label="How the relay handles an event">
              <ol className={s.flowRow}>
                <li className={s.node}>Payment event</li>
                <li className={s.node} data-on={selected === "sample-dedupe" || undefined}>
                  <span className={s.nodeTitle}>Record event_id</span>
                  <span className={s.nodeFile}>dedupe.ts</span>
                </li>
                <li className={s.node} data-on={selected !== "sample-dedupe" || undefined}>
                  <span className={s.nodeTitle}>Send, up to 5 tries</span>
                  <span className={s.nodeFile}>{selected === "sample-test-400" ? "delivery.test.ts" : "retry.ts"}</span>
                </li>
                <li className={s.node}>Partner endpoint</li>
              </ol>
              <figcaption className={s.flowCaption}>How an event moves through the relay, drawn from the cited files.</figcaption>
            </figure>

            <div>
              <p className={s.label}>
                Evidence · {PROJECT.evidence.length} findings, {PROJECT.coverage.analyzedFiles} of {PROJECT.coverage.totalFiles} files read
              </p>
              <ul className={s.highlights}>
                {ORDER.map((id) => {
                  const e = PROJECT.evidence.find((x) => x.id === id);
                  return (
                    <li key={id}>
                      <button type="button" aria-pressed={id === selected} onClick={() => setSelected(id)} className={s.highlight}>
                        <span>{HIGHLIGHT[id].label}</span>
                        {e ? <span className={s.highlightFile}>{e.path.split("/").pop()}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className={s.detail} aria-label="Selected finding" aria-live="polite">
            <p className={s.meta}>
              <FileCode2 aria-hidden size={13} className={s.icon} />
              Finding {index + 1} of {ORDER.length} · from code, authorship not checked
            </p>
            <p className={s.finding}>{finding.finding}</p>

            <figure className={s.source}>
              <figcaption className={s.sourceHead}>
                <span className={s.path}>{finding.path}</span>
                <span className={s.dim}>
                  L{finding.startLine}–{finding.endLine} · {PROJECT.commitSha.slice(0, 7)}
                </span>
              </figcaption>
              <code className={s.code}>
                {finding.excerpt.map((text, i) => {
                  const hang = `${text.length - text.trimStart().length + 4}ch`;
                  return (
                    <span key={i} className={s.line} data-key={keyLines.has(i) || undefined}>
                      <span className={s.ln} aria-hidden>
                        {finding.startLine + i}
                      </span>
                      <span className={s.src} style={{ paddingLeft: hang, textIndent: `-${hang}` }}>
                        {text ? highlight(text) : " "}
                      </span>
                    </span>
                  );
                })}
              </code>
            </figure>

            <div>
              <p className={s.label}>What this doesn&apos;t show</p>
              <ul className={s.limits}>
                {finding.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
