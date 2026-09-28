import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleDot,
  FileSearch,
  LockKeyhole,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { ButtonLink } from "@/components/marketing/ui";
import styles from "./solutions-engineer-home.module.css";

const strengths = [
  {
    title: "Separated facts from assumptions",
    evidence: "Discovery notes · assumption log",
  },
  {
    title: "Revised the plan when access changed",
    evidence: "Rollout plan · versions 1 and 2",
  },
  {
    title: "Explained the constraint clearly",
    evidence: "Customer update · oral defense",
  },
] as const;

const interviewQuestions = [
  "How would you verify weekly-active usage before sizing the first production cohort?",
  "What would you ask the security team in week one?",
  "When is a sponsor estimate reliable enough to plan against?",
] as const;

function SyntheticLabel() {
  return <span className={styles.syntheticLabel}>Synthetic demonstration</span>;
}

function HeroShortlist() {
  return (
    <figure
      className={styles.heroShortlist}
      aria-labelledby="hero-shortlist-title"
      data-hero-stage
    >
      <figcaption className={styles.productBar}>
        <SyntheticLabel />
        <span>Solutions Engineer pilot</span>
      </figcaption>

      <div className={styles.shortlistHeading}>
        <div>
          <p>Evidence-backed shortlist</p>
          <h2 id="hero-shortlist-title">Who is worth meeting</h2>
        </div>
        <span className={styles.reviewedStatus}>
          <ShieldCheck size={15} aria-hidden />
          Human reviewed
        </span>
      </div>

      <ol className={styles.candidateList}>
        <li className={styles.recommendedCandidate}>
          <div className={styles.candidateSummary}>
            <div className={styles.candidateIdentity}>
              <span className={styles.candidateIndex}>01</span>
              <div>
                <strong>Candidate 01</strong>
                <span>Solutions Engineer</span>
              </div>
            </div>
            <span className={styles.recommendation}>
              <Check size={14} aria-hidden />
              Worth interviewing
            </span>
          </div>

          <ul className={styles.heroSignals}>
            {strengths.map((strength) => (
              <li key={strength.title}>
                <CircleDot size={14} aria-hidden />
                <span>{strength.title}</span>
              </li>
            ))}
          </ul>

          <div className={styles.unresolved}>
            <TriangleAlert size={15} aria-hidden />
            <span>
              <strong>Still unresolved</strong>
              Adoption sizing relies on an unverified sponsor estimate.
            </span>
          </div>

          <details className={styles.evidenceDisclosure}>
            <summary>
              <FileSearch size={15} aria-hidden />
              Open supporting evidence
              <ChevronRight size={14} aria-hidden />
            </summary>
            <div>
              <p>Rollout plan v1 → v2</p>
              <p>Security constraint event</p>
              <p>Oral defense response</p>
            </div>
          </details>
        </li>

        <li className={styles.condensedCandidate}>
          <span className={styles.candidateIndex}>02</span>
          <div>
            <strong>Candidate 02</strong>
            <span>Evidence review in progress</span>
          </div>
          <span>Not yet recommended</span>
        </li>
        <li className={styles.condensedCandidate}>
          <span className={styles.candidateIndex}>03</span>
          <div>
            <strong>Candidate 03</strong>
            <span>Oral defense pending</span>
          </div>
          <span>Decision pending</span>
        </li>
      </ol>
    </figure>
  );
}

function DefineWorkMoment() {
  return (
    <div className={styles.defineMoment} aria-label="Role calibration example">
      <div>
        <span>Role outcome</span>
        <strong>Lead a secure enterprise rollout</strong>
      </div>
      <ul>
        <li><Check size={13} aria-hidden />Technical discovery</li>
        <li><Check size={13} aria-hidden />Implementation judgment</li>
        <li><Check size={13} aria-hidden />Customer communication</li>
      </ul>
    </div>
  );
}

function ObserveWorkMoment() {
  return (
    <ol className={styles.observeMoment} aria-label="Candidate work sequence">
      <li><span />Initial plan</li>
      <li className={styles.changedMoment}><span />Security constraint</li>
      <li><span />Revised plan</li>
      <li><span />Oral defense</li>
    </ol>
  );
}

function InterviewMoment() {
  return (
    <div className={styles.interviewMoment} aria-label="Interview brief example">
      <div>
        <span>Recommendation</span>
        <strong>Worth interviewing</strong>
      </div>
      <div>
        <span>Investigate</span>
        <p>How would you validate adoption before committing the implementation team?</p>
      </div>
    </div>
  );
}

function Workflow() {
  const steps = [
    {
      title: "Define the work",
      body: "Calibrate what the person must actually handle in the role.",
      Moment: DefineWorkMoment,
    },
    {
      title: "Observe candidates doing it",
      body: "Candidates work through a realistic customer problem while facts, constraints, and stakeholder needs change.",
      Moment: ObserveWorkMoment,
    },
    {
      title: "Interview with evidence",
      body: "Receive the strongest candidates, the evidence behind each recommendation, and the questions that remain unresolved.",
      Moment: InterviewMoment,
    },
  ] as const;

  return (
    <section
      className={styles.workflowSection}
      aria-labelledby="workflow-title"
      data-product-chapter
    >
      <div className={styles.container}>
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionLead}>One role. One focused cohort.</p>
            <h2 id="workflow-title" data-chapter-heading>From role definition to a useful interview.</h2>
          </div>
          <p data-chapter-copy>
            Fydell handles the work between a promising resume and a defensible
            interview decision.
          </p>
        </header>

        <ol className={styles.workflowRail} data-product-stage>
          {steps.map(({ title, body, Moment }, index) => (
            <li key={title}>
              <div className={styles.stepNumber}>{index + 1}</div>
              <div className={styles.stepCopy}>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <Moment />
            </li>
          ))}
        </ol>
        <p className={styles.visualDisclaimer}>
          <SyntheticLabel /> Product moments use fictional candidates and scenario data.
        </p>
      </div>
    </section>
  );
}

function ChangedInformation() {
  return (
    <section
      className={styles.changeSection}
      aria-labelledby="change-title"
      data-product-chapter
    >
      <div className={styles.container}>
        <header className={styles.changeHeader}>
          <div>
            <p className={styles.sectionLead}>The work changes because the job does.</p>
            <h2 id="change-title" data-chapter-heading>
              See what happens when a plan stops being valid.
            </h2>
          </div>
          <p data-chapter-copy>
            The candidate commits an initial recommendation. Then a consequential
            security constraint arrives. Fydell records the revision—not whether
            they guessed the twist.
          </p>
        </header>

        <div className={styles.changePlane} data-product-stage>
          <div className={styles.productBar}>
            <SyntheticLabel />
            <span>Changed-information review</span>
          </div>

          <div className={styles.changeSequence}>
            <article>
              <span className={styles.sequenceMarker}>Initial recommendation</span>
              <h3>Start with a 200-user production cohort.</h3>
              <p>Based on a sponsor estimate derived from licensed seats.</p>
            </article>
            <article className={styles.factArrival}>
              <span className={styles.sequenceMarker}>
                <TriangleAlert size={14} aria-hidden />
                New security constraint
              </span>
              <h3>Production access is blocked for six weeks.</h3>
              <p>Sandbox enablement can proceed without production connectors.</p>
            </article>
          </div>

          <div className={styles.revisionDiff}>
            <div>
              <span>Before</span>
              <p>Production cohort in week one</p>
              <p>Size from 200-user sponsor estimate</p>
            </div>
            <ArrowRight size={20} aria-hidden />
            <div>
              <span>After</span>
              <p>Sandbox enablement starts now</p>
              <p>Production waits; cohort size remains provisional</p>
            </div>
          </div>

          <ol className={styles.eventTrail} aria-label="Changed-information event trail">
            <li><span>14:24</span><strong>Initial plan committed</strong></li>
            <li><span>16:08</span><strong>Security constraint received</strong></li>
            <li><span>16:13</span><strong>Rollout plan revised</strong></li>
            <li className={styles.openQuestion}>
              <span>Still uncertain</span>
              <strong>What evidence should determine cohort size?</strong>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

function DecisionBrief() {
  return (
    <section
      id="sample-brief"
      className={styles.briefSection}
      aria-labelledby="brief-title"
      data-product-chapter
    >
      <div className={styles.container}>
        <div className={styles.briefComposition}>
          <header className={styles.briefCopy}>
            <p className={styles.sectionLead}>The employer deliverable</p>
            <h2 id="brief-title" data-chapter-heading>Not another score. A decision brief.</h2>
            <p data-chapter-copy>
              For every recommended candidate, see the work they produced, how
              they adapted, what they defended, where the evidence is limited,
              and the questions most likely to change your hiring decision.
            </p>
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
          </header>

          <article className={styles.briefPaper} data-product-stage>
            <header>
              <div>
                <SyntheticLabel />
                <h3>Candidate 01 · Interview brief</h3>
                <p>Solutions Engineer</p>
              </div>
              <span className={styles.reviewedStatus}>
                <ShieldCheck size={15} aria-hidden />
                Human reviewed
              </span>
            </header>

            <section className={styles.briefRecommendation}>
              <span>Recommendation</span>
              <strong><Check size={18} aria-hidden />Worth interviewing</strong>
              <p>
                Adapted to a constraint that invalidated the original plan and
                separated verified requirements from an adoption estimate.
              </p>
            </section>

            <section className={styles.briefStrengths}>
              <h4>Observed strengths</h4>
              <ol>
                {strengths.map((strength) => (
                  <li key={strength.title}>
                    <Check size={15} aria-hidden />
                    <div>
                      <strong>{strength.title}</strong>
                      <a href="#changed-information">{strength.evidence}</a>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className={styles.briefUncertainty}>
              <TriangleAlert size={17} aria-hidden />
              <div>
                <h4>Remaining uncertainty</h4>
                <p>
                  The candidate corrected the cohort-sizing assumption, but the
                  work does not yet show how they would establish a reliable
                  adoption baseline.
                </p>
              </div>
            </section>

            <section className={styles.briefQuestions}>
              <h4>Questions for the interview</h4>
              <ol>
                {interviewQuestions.map((question, index) => (
                  <li key={question}>
                    <span>{index + 1}</span>
                    <p>{question}</p>
                  </li>
                ))}
              </ol>
            </section>

            <footer>
              <FileSearch size={15} aria-hidden />
              Evidence links point to the candidate&apos;s recorded work trail.
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}

export default function SolutionsEngineerHome() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy} data-hero-copy>
              <h1 id="home-title">Know who is worth interviewing—before the interview.</h1>
              <p>
                Fydell evaluates Solutions Engineer candidates through realistic
                customer work, changing constraints, and oral defense. You receive
                a shortlist with inspectable evidence and the questions your
                interview should investigate.
              </p>
              <div className={styles.heroActions}>
                <ButtonLink href="/request-pilot" variant="primary">Request a pilot</ButtonLink>
                <ButtonLink href="#sample-brief" variant="soft">See a sample brief</ButtonLink>
              </div>
            </div>
            <HeroShortlist />
          </div>
        </div>
      </section>

      <section className={styles.credibility} aria-label="Product credibility">
        <div className={styles.container}>
          <p>Built with feedback from enterprise hiring teams.</p>
          <span><SyntheticLabel /> No customer names or performance claims are shown.</span>
        </div>
      </section>

      <section className={styles.problemSection} aria-labelledby="problem-title">
        <div className={styles.container}>
          <div className={styles.problemGrid}>
            <div>
              <span>What breaks today</span>
              <h2 id="problem-title">
                Resumes tell you what candidates claim. Interviews often discover
                too late whether they can handle the work.
              </h2>
            </div>
            <div className={styles.outcomeStatement}>
              <span>What Fydell returns</span>
              <p>
                Fydell shows you who is worth interviewing and gives you the
                evidence and questions to make that interview useful.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Workflow />

      <div id="changed-information">
        <ChangedInformation />
      </div>

      <DecisionBrief />

      <section className={styles.differenceSection} aria-labelledby="difference-title">
        <div className={styles.container}>
          <h2 id="difference-title">The hiring system for finding people who can actually do the work.</h2>
          <div className={styles.differenceGrid}>
            <article>
              <Sparkles size={19} aria-hidden />
              <h3>Realistic work</h3>
              <p>Customer ambiguity and implementation judgment—not multiple-choice testing.</p>
            </article>
            <article>
              <CircleDot size={19} aria-hidden />
              <h3>Adaptation observed</h3>
              <p>See how a candidate responds when material information changes.</p>
            </article>
            <article>
              <FileSearch size={19} aria-hidden />
              <h3>Evidence with uncertainty</h3>
              <p>Review the work beneath the recommendation, including what remains unknown.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.trustSection} aria-labelledby="trust-title">
        <div className={styles.container}>
          <div className={styles.trustGrid}>
            <header>
              <LockKeyhole size={24} aria-hidden />
              <h2 id="trust-title">Trust is part of the work design.</h2>
              <p>
                Candidates should know what is recorded. Employers should know
                where evidence came from and where it stops.
              </p>
              <Link href="/trust">Read how Fydell handles trust <ArrowRight size={15} aria-hidden /></Link>
            </header>
            <ul>
              <li><Users size={17} aria-hidden /><span><strong>Scoped invitations</strong>Candidate access is tied to a specific work session.</span></li>
              <li><MessageSquareText size={17} aria-hidden /><span><strong>Consent and disclosure</strong>The recorded work trail is explained before work begins.</span></li>
              <li><ShieldCheck size={17} aria-hidden /><span><strong>Human review during pilots</strong>Evidence claims are reviewed before publication.</span></li>
              <li><ReceiptText size={17} aria-hidden /><span><strong>Candidate-controlled Work Receipts</strong>Portable work evidence stays separate from employer-private judgment.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-cta-title">
        <div className={styles.container}>
          <div>
            <h2 id="final-cta-title">Start with one Solutions Engineer role.</h2>
            <p>
              Fydell will help define the work, run a focused candidate cohort,
              and return the people worth interviewing with the evidence underneath.
            </p>
          </div>
          <div className={styles.finalActions}>
            <ButtonLink href="/request-pilot" variant="primary">Request a pilot</ButtonLink>
            <ButtonLink href="/contact" variant="soft">Contact Fydell</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
