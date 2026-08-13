/**
 * The curveball, shown as a state transition rather than an alert.
 *
 * The interesting part of a changed fact is not that it happened, it is what
 * the candidate did next. So the diff runs: what was true, what replaced it,
 * which claim it hit, and how the candidate responded, with the response
 * carrying the same weight as the change itself.
 *
 * The risk accent is applied only to the superseded fact. Washing the whole
 * block in red would say "something is wrong here", which is not what a
 * changed fact means.
 */
import { CitationLink } from "./CitationLink";
import { NORTHLINE_CHANGED_FACT } from "@/lib/fixtures/northline";

const RESPONSE_LABEL = {
  revised: "Revised the conclusion",
  defended: "Defended the original conclusion",
  ignored: "Did not address the change",
} as const;

export function ChangedFactsDiff({ className = "" }: { className?: string }) {
  const fact = NORTHLINE_CHANGED_FACT;

  return (
    <div className={className}>
      <div className="grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-2">
        <div className="bg-[var(--surface-raised)] p-3.5">
          <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
            {fact.before.label}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--text-tertiary)] line-through decoration-[rgba(242,107,130,0.6)] decoration-1">
            {fact.before.text}
          </p>
        </div>
        <div className="relative bg-[var(--surface-raised)] p-3.5">
          <span
            aria-hidden
            className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-[var(--fydell-changed)]"
          />
          <p className="text-[12px] font-medium text-[var(--fydell-changed)]">
            {fact.after.label}
          </p>
          <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[var(--text-primary)]">
            {fact.after.text}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3.5">
        <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
          Claim affected
        </p>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--text-secondary)]">
          {fact.affects}
        </p>

        <div className="mt-3 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-primary)]">
            <span
              aria-hidden
              className="h-[7px] w-[7px] rounded-full border border-[rgba(176,127,208,0.55)] bg-[rgba(176,127,208,0.22)]"
            />
            {RESPONSE_LABEL[fact.response]}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] leading-[1.5] text-[var(--text-secondary)]">
          {fact.responseText}
        </p>
        <div className="mt-2">
          <CitationLink citation={fact.responseCitation} />
        </div>
      </div>
    </div>
  );
}
