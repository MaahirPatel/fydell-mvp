import Link from "next/link";
import type { FeedbackItem } from "@/lib/passport/development-feedback";
import type { PassportEvidence } from "@/lib/passport/view";

/**
 * Owner-only. Rendered from the Builder Report page and nowhere else; the
 * items are never part of a share, an application or an employer review.
 */
export default function DevelopmentFeedback({
  projectId,
  items,
  evidence,
}: {
  projectId: string;
  items: FeedbackItem[];
  evidence: Pick<PassportEvidence, "id" | "path" | "startLine">[];
}) {
  const byId = new Map(evidence.map((e) => [e.id, e]));
  return (
    <section aria-labelledby="dev-feedback-heading" className="mt-12 border-t border-[var(--border-default)] pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="dev-feedback-heading" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          What would strengthen this project
        </h2>
        <span className="text-[13px] text-[var(--text-tertiary)]">Only you see this</span>
      </div>
      <p className="mt-1.5 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
        Each rule looks for a practice in the analyzed files that appears without a companion practice that usually goes with it. Suggestions are not
        included in share links, applications or employer reviews, and they are not a score.
      </p>
      {items.length === 0 ? (
        <p className="mt-5 text-[14px] leading-[1.6] text-[var(--text-body)]">
          None of the current rules apply to this version. That reflects only what the rules check, not a judgment of the whole project.
        </p>
      ) : (
        <ol className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{item.title}</h3>
              <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-[14px] leading-[1.55] sm:grid-cols-[132px_minmax(0,1fr)]">
                <dt className="text-[var(--text-tertiary)]">Observation</dt>
                <dd className="text-[var(--text-body)]">{item.observation}</dd>
                <dt className="text-[var(--text-tertiary)]">Evidence</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1">
                  {item.evidenceIds.slice(0, 4).map((id) => {
                    const e = byId.get(id);
                    return e ? (
                      <Link
                        key={id}
                        href={`/app/candidate/projects/${projectId}?finding=${encodeURIComponent(id)}`}
                        className="font-mono text-[13px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
                      >
                        {e.path}:{e.startLine}
                      </Link>
                    ) : null;
                  })}
                  {item.evidenceIds.length > 4 ? <span className="text-[13px] text-[var(--text-tertiary)]">and {item.evidenceIds.length - 4} more</span> : null}
                </dd>
                <dt className="text-[var(--text-tertiary)]">Why it matters</dt>
                <dd className="text-[var(--text-body)]">{item.implication}</dd>
                <dt className="text-[var(--text-tertiary)]">Next step</dt>
                <dd className="text-[var(--text-body)]">{item.nextStep}</dd>
                <dt className="text-[var(--text-tertiary)]">Limit</dt>
                <dd className="text-[var(--text-secondary)]">{item.limit}</dd>
                <dt className="text-[var(--text-tertiary)]">Recheck</dt>
                <dd className="text-[var(--text-secondary)]">{item.recheck}</dd>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
