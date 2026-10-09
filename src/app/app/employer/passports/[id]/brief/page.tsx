import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { buildDecisionBrief, type BriefRequirement } from "@/lib/employer/brief";
import BriefActions from "@/components/employer/BriefActions";

export const metadata = { title: "Decision brief" };
export const dynamic = "force-dynamic";

const OUTCOME_TONE: Record<BriefRequirement["outcome"], string> = {
  supported: "text-[var(--status-positive-ink)]",
  insufficient: "text-[var(--text-secondary)]",
  no_evidence: "text-[var(--text-tertiary)]",
  concern: "text-[var(--status-attention-ink)]",
  not_reviewed: "text-[var(--text-tertiary)]",
};

function date(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
}

export default async function DecisionBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { id } = await params;
  const { role } = await searchParams;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/employer/passports/${id}/brief`)}`);
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const roleId = role && /^[0-9a-f-]{36}$/.test(role) ? role : null;
  const result = await buildDecisionBrief(org.organizationId, id, roleId);
  if (result.status === "missing") notFound();

  const back = (
    <Link href={`/app/employer/passports/${id}`} className="text-app-meta text-[var(--text-tertiary)] hover:underline print:hidden">
      ← Back to the review
    </Link>
  );

  if (result.status !== "ok") {
    return (
      <div className="max-w-[68ch]">
        {back}
        <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.02em]">No brief available</h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[var(--text-secondary)]">
          {result.status === "revoked"
            ? "The engineer revoked or let this link expire, so its evidence can no longer be used in a brief. Your recorded decision is kept on the review."
            : "Create a role with requirements first, then review this passport against it."}
        </p>
      </div>
    );
  }

  const b = result.brief;
  const exportHref = `/api/employer/passports/${id}/brief?role=${b.role.id}`;

  return (
    <article className="max-w-[880px]">
      {back}
      <header className="mt-4 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-default)] pb-6">
        <div>
          <p className="text-[14px] text-[var(--text-secondary)]">Decision brief · {b.role.title}</p>
          <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.024em] text-[var(--text-primary)]">{b.candidateName}</h1>
          <p className="mt-2 text-[14px] text-[var(--text-tertiary)]">
            Prepared for {b.organizationName} on {date(b.generatedAt)} from the shared Passport and your team&apos;s review.
          </p>
        </div>
        <BriefActions exportHref={exportHref} />
      </header>

      {b.otherRoles.length > 0 ? (
        <p className="mt-4 text-[14px] text-[var(--text-secondary)] print:hidden">
          Brief for another role:{" "}
          {b.otherRoles.slice(0, 6).map((r, i) => (
            <span key={r.id}>
              {i > 0 ? ", " : ""}
              <Link href={`/app/employer/passports/${id}/brief?role=${r.id}`} className="underline underline-offset-4">
                {r.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[19px] font-semibold tracking-[-0.014em]">Decision</h2>
        <p className="mt-2 text-[16px] text-[var(--text-body)]">
          <span className="font-semibold text-[var(--text-primary)]">{b.decision.label}</span>
          {b.decision.decidedAt ? ` on ${date(b.decision.decidedAt)}` : ""}
          {b.decision.decidedBy ? `, recorded by ${b.decision.decidedBy}` : ""}.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-[19px] font-semibold tracking-[-0.014em]">Work reviewed</h2>
        <ul className="mt-3 space-y-1.5">
          {b.projects.map((p) => (
            <li key={p.repo} className="text-[15px] text-[var(--text-body)]">
              <span className="font-mono text-[14px] text-[var(--text-primary)]">{p.repo}</span> at <span className="font-mono text-[14px]">{p.commit}</span>
              <span className="text-[var(--text-tertiary)]">
                {" "}
                · {p.coverage}
                {p.partial ? " · partial analysis" : ""} · analyzed {date(p.analyzedAt)}
              </span>
            </li>
          ))}
        </ul>
        {b.versionPolicy ? (
          <p className="mt-2 text-[14px] text-[var(--text-tertiary)]">
            The engineer&apos;s link {b.versionPolicy === "pinned" ? "shows these fixed versions" : "updates to their newest analysis"}.
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="text-[19px] font-semibold tracking-[-0.014em]">Requirements</h2>
        <ol className="mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {b.requirements.map((r, index) => (
            <li key={`${index}-${r.text}`} className="py-4 [break-inside:avoid]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[16px] font-medium text-[var(--text-primary)]">{r.text}</p>
                <p className={`text-[14px] font-medium ${OUTCOME_TONE[r.outcome]}`}>{r.outcomeLabel}</p>
              </div>
              {r.items.length === 0 ? (
                <p className="mt-1.5 text-[14px] text-[var(--text-tertiary)]">Nobody has assessed this requirement yet.</p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {r.items.map((item, i) => (
                    <li key={i} className="text-[15px] leading-[1.55] text-[var(--text-body)]">
                      {item.finding ? (
                        <>
                          <p className="text-[var(--text-primary)]">{item.finding.finding}</p>
                          <p className="font-mono text-[13px] text-[var(--text-tertiary)]">
                            {item.finding.repo} · {item.finding.path} · lines {item.finding.startLine}
                            {item.finding.endLine > item.finding.startLine ? `–${item.finding.endLine}` : ""}
                          </p>
                          {item.finding.limitations.length ? (
                            <p className="mt-1 text-[14px] text-[var(--text-secondary)]">Limits: {item.finding.limitations.join(" ")}</p>
                          ) : null}
                        </>
                      ) : null}
                      {item.reviewerNote ? (
                        <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                          Reason ({item.noteBy ?? "a reviewer"}): {item.reviewerNote}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </section>

      {b.contributions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[19px] font-semibold tracking-[-0.014em]">Contribution context</h2>
          <p className="mt-1 text-[14px] text-[var(--text-tertiary)]">The engineer&apos;s own statements. Fydell does not verify them.</p>
          <div className="mt-3 space-y-4">
            {b.contributions.map((c) => (
              <div key={c.repoFullName} className="[break-inside:avoid]">
                <p className="font-mono text-[14px] text-[var(--text-primary)]">{c.repoFullName}</p>
                <dl className="mt-1 grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-[150px_minmax(0,1fr)]">
                  {c.workedOn ? (<><dt className="text-[var(--text-tertiary)]">Worked on</dt><dd className="m-0 text-[var(--text-body)]">{c.workedOn}</dd></>) : null}
                  {c.inherited ? (<><dt className="text-[var(--text-tertiary)]">Inherited</dt><dd className="m-0 text-[var(--text-body)]">{c.inherited}</dd></>) : null}
                  {c.constraintsFaced ? (<><dt className="text-[var(--text-tertiary)]">Constraints</dt><dd className="m-0 text-[var(--text-body)]">{c.constraintsFaced}</dd></>) : null}
                  {c.results ? (<><dt className="text-[var(--text-tertiary)]">Results</dt><dd className="m-0 text-[var(--text-body)]">{c.results}</dd></>) : null}
                </dl>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-[19px] font-semibold tracking-[-0.014em]">Open questions</h2>
        {b.openQuestions.length === 0 ? (
          <p className="mt-2 text-[15px] text-[var(--text-secondary)]">None waiting on the engineer.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {b.openQuestions.map((q, i) => (
              <li key={i} className="text-[15px] text-[var(--text-body)]">
                {q.question}
                <span className="block text-[13px] text-[var(--text-tertiary)]">
                  Asked {date(q.askedAt)}
                  {q.askedBy ? ` by ${q.askedBy}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {b.answered.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[19px] font-semibold tracking-[-0.014em]">Answered questions</h2>
          <ul className="mt-2 space-y-3">
            {b.answered.map((q, i) => (
              <li key={i} className="text-[15px] leading-[1.55]">
                <p className="text-[var(--text-primary)]">{q.question}</p>
                <p className="mt-0.5 text-[var(--text-body)]">“{q.response}”</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 border-t border-[var(--border-default)] pt-6">
        <h2 className="text-[19px] font-semibold tracking-[-0.014em]">Limitations</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-[1.55] text-[var(--text-secondary)]">
          {b.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] text-[var(--text-tertiary)]">Private reviewer notes are not included in this brief.</p>
      </section>
    </article>
  );
}
