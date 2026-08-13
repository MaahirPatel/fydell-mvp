import MarketingShell from "@/components/layout/MarketingShell";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import { ButtonLink } from "@/components/marketing/ui";

export const metadata = {
  title: "Product",
  description:
    "How Fydell works end to end: create a workspace, invite a candidate, read a conclusion with the evidence attached, and interview from what the work showed.",
};

const SECTION = "border-t border-[var(--border-subtle)] mkt-section";

function QA({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-16">
      <h2 className="section-heading lg:col-span-5">{question}</h2>
      <div className="lg:col-span-7">{children}</div>
    </div>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-[62ch] text-[16px] leading-[1.7] text-[var(--text-secondary)]">
      {children}
    </p>
  );
}

export default function ProductPage() {
  return (
    <MarketingShell>
      <section className="pb-14 pt-[132px] sm:pt-[148px]">
        <div className="mkt-content">
          <h1 className="page-display">
            An evaluation you can audit, not a score you have to trust.
          </h1>
          <p className="page-lead">
            A candidate does a piece of real work. Your team reads what they
            concluded, opens the evidence behind it, and interviews from there.
            Nothing in the report is a number you cannot trace back to a row.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" variant="primary">
              Create your workspace
            </ButtonLink>
            <ButtonLink href="/simulations" variant="secondary">
              See the evaluation
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="pb-4">
        <div className="mkt-content">
          <HeroSimPreview />
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <QA question="What problem does this solve?">
            <Body>
              Interviews reward people who talk well about work, and take-home
              tests reward people with a free weekend. Neither shows you how
              someone behaves when the data is messy, the metric definition is
              ambiguous, and a fact changes halfway through. Fydell puts a
              candidate in exactly that situation for twenty minutes and records
              what they did.
            </Body>
          </QA>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <QA question="How does a company start?">
            <div className="grid gap-3">
              {[
                [
                  "Create a workspace",
                  "Sign up with a work email and name your company. That workspace holds your evaluations, candidates and reports, and only people you invite can see it.",
                ],
                [
                  "Invite a candidate",
                  "Send an invitation by email. The link is single-use, scoped to that candidate, and expires.",
                ],
                [
                  "Read the report",
                  "When they finish, you get a conclusion, the evidence behind each claim, and follow-up questions generated from their own work.",
                ],
              ].map(([title, detail], i) => (
                <div
                  key={title}
                  className="flex gap-4 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3.5"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[12px] tabular-nums text-[var(--text-tertiary)]"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                      {title}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </QA>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <QA question="What does the candidate experience?">
            <Body>
              They open one link and land directly in the work. There is a
              business question, three source documents, a stakeholder they can
              question, and a clock. Progress saves as they go, so a dropped
              connection does not cost them the attempt. They can see what they
              have cited and revise it. Nothing is a trick, and nothing is
              hidden from them that is later used against them.
            </Body>
          </QA>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <QA question="What is in the report?">
            <div className="rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6">
              <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                Structure of every evidence report
              </p>
              <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                {[
                  [
                    "The conclusion",
                    "What the candidate decided, in their words.",
                  ],
                  [
                    "Each claim, with its support",
                    "The specific rows and documents that back it up, openable in place.",
                  ],
                  [
                    "Each claim, with its limitation",
                    "What the evidence does not establish. Written by the candidate, not inferred.",
                  ],
                  [
                    "How they handled the new fact",
                    "The before and after, so you can see whether they revised or dug in.",
                  ],
                  [
                    "Follow-up questions",
                    "Generated from their citations, aimed at where the reasoning is thinnest.",
                  ],
                ].map(([title, detail]) => (
                  <li key={title} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                      {detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </QA>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <QA question="How do you compare two candidates?">
            <Body>
              Side by side, on the same evaluation version, showing where their
              conclusions and their evidence differ rather than which number is
              larger. Comparison only becomes available when there are two
              completed reports on a compatible version, because comparing
              across versions would be misleading.
            </Body>
          </QA>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <QA question="What happens to a candidate's data?">
            <Body>
              The candidate keeps a Work Receipt. They choose which fields to
              share, with whom, and for how long, and they can revoke it
              immediately. It is not a public profile and it is not listed
              anywhere. Your workspace keeps its own copy of the report for the
              hiring decision you ran it for.
            </Body>
          </QA>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <QA question="What does Fydell deliberately not do?">
            <ul className="grid gap-3">
              {[
                "It does not make or recommend a hire or reject decision.",
                "It does not claim to detect external AI use, screen sharing, or remote desktop control.",
                "It does not verify identity by biometrics.",
                "It does not produce a single opaque score that stands in for the evidence.",
                "It does not turn a platform failure into a bad result for the candidate.",
              ].map((line) => (
                <li
                  key={line}
                  className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </QA>
        </div>
      </section>

      <section className={`${SECTION} pb-24`}>
        <div className="mkt-content max-w-[620px]">
          <h2 className="section-heading">Try it on one role.</h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            Create a workspace and invite your first candidate. If you would
            rather talk it through first,{" "}
            <a
              href="/request-pilot"
              className="text-[var(--text-primary)] underline underline-offset-2"
            >
              request a pilot
            </a>
            .
          </p>
          <div className="mt-8">
            <ButtonLink href="/signup" variant="primary">
              Create your workspace
            </ButtonLink>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
