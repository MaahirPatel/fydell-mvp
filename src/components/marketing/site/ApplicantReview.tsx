"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, CircleDashed, CircleMinus } from "lucide-react";
import FydellLogo from "@/components/brand/FydellLogo";
import { CodeBlock } from "@/components/marketing/home/CodeBlock";
import { EXAMPLE_APPLICANTS, EXAMPLE_ROLE, exampleEvidence } from "./fixture";
import s from "./screens.module.css";

const TONE_ICON = { positive: CircleCheck, attention: CircleDashed, neutral: CircleMinus, concern: CircleAlert } as const;

/**
 * The hiring workspace: applicants for one role, and the selected applicant's
 * shared work read requirement by requirement. Outcome and stage labels are
 * the product's own; applicants are numbered example data.
 */
export default function ApplicantReview() {
  const [reqIndex, setReqIndex] = useState(0);
  const req = EXAMPLE_ROLE.requirements[reqIndex];
  const evidence = req.evidence ? exampleEvidence(req.evidence) : undefined;

  return (
    <div className={s.app}>
      <div className={s.appHeader}>
        <span className={s.appLogo}>
          <FydellLogo height={16} />
        </span>
        <nav className={s.appNav} aria-label="Example product navigation">
          {["Roles", "Applicants", "Simulations", "Settings"].map((label) => (
            <span key={label} className={label === "Applicants" ? s.appNavOn : s.appNavItem}>
              {label}
            </span>
          ))}
        </nav>
        <span className={s.appHeaderRight}>
          <span>{EXAMPLE_ROLE.title}</span>
        </span>
      </div>

      <div className={s.review}>
        <aside className={s.wsList} aria-label="Applicants">
          <div className={s.wsListHead}>
            <p className={s.wsHeading}>Applicants</p>
            <p className={s.wsMeta}>4 applications · role open</p>
          </div>
          <ul className={s.projectList}>
            {EXAMPLE_APPLICANTS.map((a, i) => (
              <li key={a.id}>
                <div className={i === 0 ? s.projectOn : s.projectStatic}>
                  <span className={s.projectTitle}>{a.name}</span>
                  <span className={s.projectMeta}>
                    {a.projects} {a.projects === 1 ? "project" : "projects"} shared · {a.stage}
                  </span>
                  <span className={s.projectMeta}>Next: {a.next}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className={s.wsDetail} aria-label="Requirements">
          <p className={s.wsMeta}>Applicant 01 · 2 projects shared at pinned versions</p>
          <p className={s.detailTitle}>Requirements</p>
          <ul className={s.reqList}>
            {EXAMPLE_ROLE.requirements.map((r, i) => {
              const Icon = TONE_ICON[r.tone];
              const active = i === reqIndex;
              return (
                <li key={r.text}>
                  <button type="button" aria-pressed={active} onClick={() => setReqIndex(i)} className={active ? s.reqOn : s.req}>
                    <span className={s.reqText}>{r.text}</span>
                    <span className={s.outcome} data-tone={r.tone}>
                      <Icon aria-hidden size={14} />
                      {r.outcome}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={s.decision}>
            <p className={s.blockLabel}>Team decision</p>
            <div className={s.decisionRow}>
              {["Advance", "Hold", "Decline"].map((d) => (
                <span key={d} className={s.decisionOption}>
                  {d}
                </span>
              ))}
            </div>
            <p className={s.blockNote}>Recorded by your team. Nothing is sent to the applicant.</p>
          </div>
        </section>

        <section className={s.wsEvidence} aria-live="polite" aria-label="Evidence for the selected requirement">
          <p className={s.wsMeta}>{req.text}</p>
          {evidence ? (
            <>
              <p className={s.evidenceTitle}>{evidence.finding}</p>
              <div className={s.evidenceCode}>
                <CodeBlock
                  path={evidence.path}
                  lines={evidence.excerpt.slice(0, 7).map((text, i) => ({ n: evidence.startLine + i, text, mark: "cited" as const }))}
                  compact
                />
              </div>
              <p className={s.blockLabel}>Limits</p>
              <ul className={s.limits}>
                {evidence.limitations.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <span className={s.askButton}>Ask a question about this requirement</span>
            </>
          ) : (
            <>
              <p className={s.evidenceTitle}>Nothing in the shared work covers this.</p>
              <p className={s.blockText}>
                That is not evidence against the applicant. Ask a question tied to this requirement, or invite them to a simulation.
              </p>
              <span className={s.askButton}>Ask a question about this requirement</span>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
