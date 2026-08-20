import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";
import {
  AdaptScene,
  EvidenceReviewScene,
} from "@/components/marketing/home/NarrativeScenes";
import {
  BriefDiagram,
  EvidenceDiagram,
  WorkSurfaceDiagram,
} from "@/components/marketing/home/PrincipleDiagrams";

export const metadata = {
  title: "How it works",
  description:
    "Role, work, change, defense, evidence, and interview: the complete Fydell verification flow.",
};

const FLOW = [
  {
    name: "Role",
    body: "Fydell and the employer define the work, judgment, communication, and environment the role actually requires.",
  },
  {
    name: "Work",
    body: "The candidate enters a realistic job situation with resources, stakeholders, and an open work artifact.",
  },
  {
    name: "Change",
    body: "A deterministic material fact arrives. Fydell records what the candidate changes, preserves, and communicates.",
  },
  {
    name: "Defense",
    body: "Follow-up questions target the candidate’s actual decisions, contradictions, and remaining uncertainty.",
  },
  {
    name: "Evidence",
    body: "The work trail becomes claims with support, counterevidence, confidence, and explicit limits.",
  },
  {
    name: "Interview",
    body: "The employer gets the few candidates worth meeting and exactly what the next conversation should investigate.",
  },
];

const SYSTEM_VIEWS = [
  {
    title: "Work observed",
    body: "The candidate works in a realistic environment with files, people, assumptions, and an artifact that can change.",
    Diagram: WorkSurfaceDiagram,
  },
  {
    title: "Evidence assembled",
    body: "Actions and revisions stay connected to their sources, counterevidence, timestamps, and stated limits.",
    Diagram: EvidenceDiagram,
  },
  {
    title: "Decision verified",
    body: "A reviewer checks the claim before the employer receives a brief and evidence-linked interview plan.",
    Diagram: BriefDiagram,
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <main>
        <section className="pb-20 pt-[132px] sm:pb-24 sm:pt-[156px]">
          <div className="mkt-content">
            <div className="mx-auto flex max-w-[1040px] flex-col items-center text-center">
              <h1 className="max-w-[1000px] text-balance text-[clamp(3rem,5vw,4.6rem)] font-semibold leading-[0.99] tracking-[-0.04em]">
                From real work to a better interview.
              </h1>
              <p className="mt-6 max-w-[660px] text-[18px] leading-[1.55] text-[var(--text-secondary)]">
                Fydell does not grade a first answer. It observes how someone
                works, what happens when the situation changes, and whether the
                final decision holds up under questioning.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/contact" variant="primary">
                  Request a pilot
                </ButtonLink>
                <ButtonLink href="/pricing" variant="soft">
                  View pricing
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-band)]">
          <div className="mkt-content grid md:grid-cols-2 lg:grid-cols-6">
            {FLOW.map((step, index) => (
              <article
                key={step.name}
                className={`relative py-7 md:px-6 lg:min-h-[220px] lg:py-8 ${
                  index % 2 === 1
                    ? "md:border-l md:border-[var(--border-subtle)]"
                    : ""
                } ${index > 1 ? "border-t border-[var(--border-subtle)] lg:border-t-0" : ""} ${
                  index > 0 ? "lg:border-l lg:border-[var(--border-subtle)]" : ""
                }`}
              >
                <p className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-7 text-[17px] font-semibold tracking-[-0.02em]">
                  {step.name}
                </h2>
                <p className="mt-3 text-[12.5px] leading-[1.58] text-[var(--text-secondary)]">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mkt-section-chapter">
          <div className="mkt-content grid lg:grid-cols-3">
            {SYSTEM_VIEWS.map(({ title, body, Diagram }, index) => (
              <article
                key={title}
                className={`flex min-h-[430px] flex-col py-8 lg:px-10 ${
                  index > 0
                    ? "border-t border-[var(--border-subtle)] lg:border-l lg:border-t-0"
                    : ""
                }`}
              >
                <div className="grid min-h-[250px] flex-1 place-items-center text-[var(--text-primary)] [&_.principle-figure]:h-auto [&_.principle-figure]:w-full [&_.principle-figure]:max-w-[290px] [&_.principle-figure]:overflow-visible">
                  <Diagram />
                </div>
                <h2 className="text-[16px] font-semibold tracking-[-0.02em]">{title}</h2>
                <p className="mt-3 max-w-[38ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mkt-section-chapter overflow-hidden bg-[var(--surface-band)]">
          <div className="mkt-content">
            <header className="grid items-end gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,470px)] lg:justify-between">
              <h2 className="section-heading max-w-[560px]">
                The strongest signal is what changes.
              </h2>
              <p className="section-desc max-w-[470px]">
                New material information forces the recommendation to move. The
                original assumption, revised artifact, reaction time, and
                remaining uncertainty stay visible together.
              </p>
            </header>
            <div className="mt-16">
              <AdaptScene />
            </div>
          </div>
        </section>

        <section className="mkt-section-chapter overflow-hidden">
          <div className="mkt-content">
            <header className="grid items-end gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,470px)] lg:justify-between">
              <h2 className="section-heading max-w-[560px]">
                The brief is only as strong as the evidence beneath it.
              </h2>
              <p className="section-desc max-w-[470px]">
                Supporting events, counterevidence, oral defense, model and
                rubric versions, and human review travel with the claim.
              </p>
            </header>
            <div className="mt-16">
              <EvidenceReviewScene />
            </div>
          </div>
        </section>

        <section className="mkt-section-chapter border-t border-[var(--border-subtle)]">
          <div className="mkt-content mx-auto max-w-[820px] text-center">
            <h2 className="section-heading text-balance">
              Bring one open role. See the whole system work.
            </h2>
            <p className="section-desc mx-auto mt-5 text-center">
              We calibrate the role, run the work, review the evidence, and
              return the people worth interviewing.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/contact" variant="primary">
                Request a pilot
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
