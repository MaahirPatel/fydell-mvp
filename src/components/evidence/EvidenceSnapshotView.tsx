import {
  GUIDE_LABEL,
  RELATIONSHIP_LABEL,
  VERIFICATION_LABEL,
  type EvidenceVersionContent,
  type SimulationReportSummary,
  type SnapshotFinding,
} from "@/lib/profile-evidence/contract";
import { LocalDate } from "@/components/eng/LocalTime";

const SOURCE_LABEL: Record<EvidenceVersionContent["sourceKind"], string> = {
  github: "Public repository",
  upload: "Uploaded project",
  manual: "Described by the engineer",
  work_sample: "Fydell work sample",
};

function lines(f: SnapshotFinding): string {
  return `${f.path}:${f.startLine}${f.endLine > f.startLine ? `-${f.endLine}` : ""}`;
}

function DraftTag() {
  return <span className="ml-2 rounded-[6px] bg-[var(--surface-panel)] px-1.5 py-0.5 text-[12px] font-normal text-[var(--text-secondary)]">Drafted from the analysis, not confirmed</span>;
}

function Finding({ f, notes }: { f: SnapshotFinding; notes: EvidenceVersionContent["notes"] }) {
  const mine = notes.filter((n) => n.findingId === f.id);
  return (
    <li className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-3">
      <p className="text-app-meta leading-[1.5] text-[var(--text-body)]">{f.finding}</p>
      <p className="mt-1 break-all font-mono text-[12px] text-[var(--text-tertiary)]">{lines(f)}</p>
      {f.excerpt.length > 0 ? (
        <details className="mt-2 text-app-meta">
          <summary className="cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Source excerpt</summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded-[6px] bg-[var(--surface-code)] p-3 font-mono text-[12px] leading-[1.5] text-[var(--text-body)]">{f.excerpt.join("\n")}</pre>
        </details>
      ) : null}
      {f.limitations.length > 0 ? <p className="mt-1.5 text-app-meta text-[var(--text-tertiary)]">Limits: {f.limitations.join(" ")}</p> : null}
      {f.sourceUrl ? (
        <a href={f.sourceUrl} target="_blank" rel="noreferrer nofollow" className="mt-1.5 inline-block text-app-meta text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]">
          Open in repository
        </a>
      ) : null}
      {mine.map((n) => (
        <div key={`${n.findingId}-${n.createdAt}`} className="mt-2 rounded-[6px] bg-[var(--surface-panel)] px-2.5 py-2 text-app-meta leading-[1.5]">
          <p className="font-medium text-[var(--text-primary)]">
            {n.kind === "correction" ? "Engineer's correction" : n.kind === "inaccurate" ? "Engineer says this is inaccurate" : "Engineer's context"}, <LocalDate iso={n.createdAt} />
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-body)]">{n.text}</p>
          {n.proposedInterpretation ? <p className="mt-1 whitespace-pre-wrap text-[var(--text-body)]">Should read: {n.proposedInterpretation}</p> : null}
        </div>
      ))}
    </li>
  );
}

function ListBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h5 className="text-app-meta font-medium text-[var(--text-primary)]">{title}</h5>
      {items.length === 0 ? (
        <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">{empty}</p>
      ) : (
        <ul className="mt-1 grid gap-1 text-app-meta leading-[1.5] text-[var(--text-body)]">
          {items.map((t, i) => (
            <li key={`${i}-${t.slice(0, 24)}`}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SimulationReport({ report }: { report: SimulationReportSummary }) {
  return (
    <div className="rounded-[8px] border border-[var(--border-subtle)] p-4">
      <p className="text-[15px] font-medium text-[var(--text-primary)]">{report.title}</p>
      <p className="mt-0.5 text-app-meta text-[var(--text-tertiary)]">Released {report.releasedAt ? <LocalDate iso={report.releasedAt} /> : "date not recorded"}. Observed by Fydell in a work sample; no score.</p>
      {report.summary ? <p className="mt-2 whitespace-pre-wrap text-app-meta leading-[1.55] text-[var(--text-body)]">{report.summary}</p> : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">What was investigated, changed and checked</summary>
        <div className="mt-3 grid gap-3">
          <ListBlock title="Investigated" items={report.investigated} empty="Not recorded in this report." />
          <ListBlock title="Questions clarified" items={report.clarified} empty="No clarifying questions are cited." />
          <ListBlock title="Changes" items={report.changes} empty="No code changes are cited." />
          <ListBlock title="Checks" items={report.checks} empty="No public checks are recorded." />
          <ListBlock title="Effect of feedback or AI assistance" items={report.feedbackEffect} empty="Not recorded in this report." />
          <ListBlock title="Unresolved" items={report.unresolved} empty="Nothing is listed as unresolved." />
        </div>
      </details>
      {report.evidence.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Attached evidence ({report.evidence.length})</summary>
          <ul className="mt-2 grid gap-2">
            {report.evidence.map((e, i) => (
              <li key={`${i}-${e.statement.slice(0, 24)}`} className="rounded-[6px] bg-[var(--surface-canvas)] px-3 py-2 text-app-meta leading-[1.5]">
                <p className="text-[var(--text-body)]">{e.statement}</p>
                {e.citations.length > 0 ? <p className="mt-1 break-all font-mono text-[12px] text-[var(--text-tertiary)]">{e.citations.map((c) => c.label).join(" · ")}</p> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/**
 * One immutable evidence version: what the engineer states, what was observed
 * in the analyzed source, and what neither covers. Summary first; the cited
 * evidence expands underneath. Renders on the server or the client.
 */
export default function EvidenceSnapshotView({
  content,
  version,
  publishedAt,
  headingLevel = 3,
}: {
  content: EvidenceVersionContent;
  version: number | null;
  publishedAt: string | null;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const facts = [SOURCE_LABEL[content.sourceKind], content.period, content.teamContext, content.projectState].filter(Boolean);
  const supported = content.capabilities.filter((c) => c.state === "supported");
  const notAssessed = content.capabilities.filter((c) => c.state === "not_assessed");
  const findingsById = new Map(content.findings.map((f) => [f.id, f]));

  return (
    <article className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4">
        <Heading className="text-[17px] font-medium leading-[1.35] text-[var(--text-primary)]">{content.title}</Heading>
        <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">{facts.join(" · ")}</p>
        {content.summary.text ? (
          <p className="mt-2 text-[15px] leading-[1.6] text-[var(--text-body)]">
            {content.summary.text}
            {content.summary.origin === "generated" ? <DraftTag /> : null}
          </p>
        ) : null}
        {content.sourceKind !== "work_sample" ? (
          <p className="mt-2 text-app-meta text-[var(--text-secondary)]">
            {content.confirmation.confirmed ? (
              <>
                The engineer confirmed this contribution{content.confirmation.confirmedAt ? <> on <LocalDate iso={content.confirmation.confirmedAt} /></> : null}. Fydell has not verified ownership.
              </>
            ) : (
              "The engineer has not confirmed this contribution. Ownership is not inferred from repository access or commits."
            )}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 px-5 py-5">
        {content.guide.length > 0 ? (
          <section>
            <h4 className="text-[15px] font-medium text-[var(--text-primary)]">The work, in the engineer&apos;s words</h4>
            <dl className="mt-3 grid gap-3">
              {content.guide.map((g) => (
                <div key={g.key}>
                  <dt className="text-app-meta font-medium text-[var(--text-secondary)]">
                    {GUIDE_LABEL[g.key]}
                    {g.origin === "generated" ? <DraftTag /> : null}
                  </dt>
                  <dd className={`mt-0.5 whitespace-pre-wrap text-[15px] leading-[1.6] ${g.text ? "text-[var(--text-body)]" : "text-[var(--text-tertiary)]"}`}>{g.text || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            {content.collaboration.label || content.collaboration.note ? (
              <p className="mt-3 text-app-meta text-[var(--text-secondary)]">
                {[content.collaboration.label, content.collaboration.note].filter(Boolean).join(". ")}
              </p>
            ) : null}
            {content.decisions.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-app-meta font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Decision records ({content.decisions.length})</summary>
                <ul className="mt-2 grid gap-2">
                  {content.decisions.map((d, i) => (
                    <li key={`${i}-${d.title}`} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta leading-[1.5]">
                      <p className="font-medium text-[var(--text-primary)]">{d.title}</p>
                      {[
                        ["Problem", d.problem],
                        ["Constraints", d.constraints],
                        ["Alternatives", d.alternatives],
                        ["Choice", d.choice],
                        ["Tradeoffs", d.tradeoffs],
                        ["Outcome", d.outcome],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <p key={k} className="mt-1 whitespace-pre-wrap text-[var(--text-body)]">
                            <span className="text-[var(--text-secondary)]">{k}: </span>
                            {v}
                          </p>
                        ))}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {content.capabilities.length > 0 ? (
          <section>
            <h4 className="text-[15px] font-medium text-[var(--text-primary)]">Capabilities linked to this work</h4>
            {supported.length === 0 ? (
              <p className="mt-2 text-app-meta text-[var(--text-secondary)]">No capability is supported by cited work in this version.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {supported.map((c) => (
                  <li key={c.key} className="rounded-[8px] border border-[var(--border-subtle)] p-3">
                    <p className="text-app-meta font-medium text-[var(--text-primary)]">{c.label}</p>
                    <p className="mt-0.5 text-app-meta text-[var(--text-body)]">Supports: {c.supports}</p>
                    {c.doesNotEstablish.length > 0 ? (
                      <div className="mt-1.5 text-app-meta text-[var(--text-secondary)]">
                        <p>Does not establish:</p>
                        <ul className="mt-0.5 grid list-disc gap-0.5 pl-5">
                          {c.doesNotEstablish.map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-app-meta text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cited findings ({c.findingIds.length})</summary>
                      <ul className="mt-2 grid gap-2">
                        {c.findingIds.map((id) => {
                          const f = findingsById.get(id);
                          return f ? <Finding key={id} f={f} notes={content.notes} /> : null;
                        })}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {notAssessed.length > 0 ? (
              <p className="mt-3 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
                Not assessed: {notAssessed.map((c) => c.label).join(", ")}. Not assessed means this version holds no evidence either way.
              </p>
            ) : null}
          </section>
        ) : null}

        {content.simulations.length > 0 ? (
          <section>
            <h4 className="text-[15px] font-medium text-[var(--text-primary)]">Work sample report</h4>
            <div className="mt-3 grid gap-3">
              {content.simulations.map((s) => (
                <SimulationReport key={s.attemptId} report={s} />
              ))}
            </div>
          </section>
        ) : null}

        {content.feedback.length > 0 ? (
          <section>
            <h4 className="text-[15px] font-medium text-[var(--text-primary)]">Collaborator feedback</h4>
            <ul className="mt-3 grid gap-3">
              {content.feedback.map((f) => (
                <li key={f.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3 text-app-meta leading-[1.55]">
                  <p className="font-medium text-[var(--text-primary)]">{f.authorName}</p>
                  <p className="text-[var(--text-secondary)]">
                    {RELATIONSHIP_LABEL[f.relationship]}
                    {f.relationshipNote ? `. ${f.relationshipNote}` : ""}. {f.directlyObserved ? "Saw the work directly." : "Did not see the work directly."}
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[var(--text-body)]">{f.statement}</p>
                  <p className="mt-1.5 text-[var(--text-tertiary)]">{VERIFICATION_LABEL[f.verification]}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
          {version ? `Version ${version}` : "Unpublished preview"}
          {publishedAt ? <>, published <LocalDate iso={publishedAt} /></> : ""}
          {content.provenance.commitSha ? `. Revision ${content.provenance.commitSha.slice(0, 7)}` : ""}
          {content.provenance.coverage ? `. ${content.provenance.coverage}` : ""}
          {content.provenance.generatedFields.length > 0 ? ` Fields still drafted from the analysis: ${content.provenance.generatedFields.join(", ")}.` : ""}
        </p>
      </div>
    </article>
  );
}
