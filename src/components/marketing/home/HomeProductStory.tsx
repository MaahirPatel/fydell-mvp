import { ButtonLink } from "@/components/marketing/ui";
import {
  AdaptScene,
  CalibrationScene,
  DefenseScene,
  EvidenceReviewScene,
  InterviewBriefScene,
  OutcomesScene,
  WorkbenchScene,
} from "./NarrativeScenes";
import {
  BriefDiagram,
  EvidenceDiagram,
  WorkSurfaceDiagram,
} from "./PrincipleDiagrams";
import styles from "./homepage.module.css";

const principles = [
  {
    title: "Work, not a test",
    body: "Candidates handle the ambiguity, tradeoffs, and stakeholder pressure the role contains.",
    Diagram: WorkSurfaceDiagram,
  },
  {
    title: "Evidence with limits",
    body: "Claims stay linked to supporting events, counter evidence, and remaining uncertainty.",
    Diagram: EvidenceDiagram,
  },
  {
    title: "A better interview",
    body: "The final brief resolves the work into the questions most likely to change your decision.",
    Diagram: BriefDiagram,
  },
];

/**
 * Scenes anchor their left edge on the container gutter and run off the right.
 * Every scene leads with its subject in the first column, so bleeding left would
 * crop the very thing the chapter is claiming to show. `contained` opts a scene
 * out of the bleed entirely, to break the rhythm.
 */
function Chapter({
  title,
  body,
  bleed = "right",
  children,
}: {
  title: string;
  body: string;
  bleed?: "right" | "contained";
  children: React.ReactNode;
}) {
  return (
    <section className={styles.chapter} data-product-chapter>
      <div className={styles.container}>
        <header className={styles.chapterHead} data-chapter-head>
          <h2 data-chapter-heading>{title}</h2>
          <div className={styles.chapterSupport}>
            <p data-chapter-copy>{body}</p>
          </div>
        </header>
        <div
          className={`${styles.chapterScene} ${
            bleed === "contained" ? "" : styles.bleedRight
          }`}
          data-product-stage
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export default function HomeProductStory() {
  return (
    <>
      <section className={styles.positioning}>
        <div className={styles.container}>
          <p>
            <strong>Hiring should be based on demonstrated work, not polished claims.</strong>{" "}
            Fydell shows how candidates reason, adapt, communicate, and defend decisions
            in realistic work, before you spend hours interviewing them.
          </p>
        </div>
      </section>

      <section
        className={`${styles.container} ${styles.principles}`}
        aria-label="Product principles"
        data-motion-observe="principles"
      >
        {principles.map((principle) => (
          <article className={styles.principle} key={principle.title}>
            <div className={styles.principleDiagram}><principle.Diagram /></div>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        ))}
      </section>

      <Chapter
        title="Turn candidate work into hiring evidence."
        body="Candidates work through a realistic customer problem. Their assumptions, decisions, revisions, and explanations become a reviewable trail.">
        <WorkbenchScene />
      </Chapter>

      <Chapter
        title="Define the role before you evaluate the candidate."
        body="Calibrate the situation and the signals with the hiring team first, so evidence is judged against the work the person will actually do.">
        <CalibrationScene />
      </Chapter>

      <Chapter
        title="Observe what changes when reality changes."
        body="Fydell introduces consequential information during the work. The signal is how the candidate updates the recommendation, not whether they guessed the twist.">
        <AdaptScene />
      </Chapter>

      <Chapter
        title="Make candidates defend the decisions they made."
        body="Follow-up questions come from the candidate’s own artifacts, assumptions, and limitations. The answer adds evidence; it does not erase uncertainty.">
        <DefenseScene />
      </Chapter>

      <Chapter bleed="contained"
        title="Review evidence, not just a final answer."
        body="A human reviewer sees the event trail, supporting and counter evidence, and the limits that must travel with each claim.">
        <EvidenceReviewScene />
      </Chapter>

      <Chapter
        title="Walk into the interview knowing what to ask."
        body="The brief explains why Candidate 1 is worth interviewing, what remains uncertain, and the three questions most likely to change the decision.">
        <InterviewBriefScene />
      </Chapter>

      <Chapter
        title="Learn which evidence proved useful later."
        body="Fydell does not claim validated prediction today. The loop preserves evidence and later outcomes so employers can examine useful signals and recalibrate future roles.">
        <OutcomesScene />
      </Chapter>

      <section className={styles.finalCta}>
        <div className={styles.container}>
          <h2>Hire based on what people can actually do.</h2>
          <p>
            Start with one Solutions Engineer role. Fydell runs the work and returns
            the people worth interviewing, with the evidence underneath.
          </p>
          <div className={styles.actions}>
            <ButtonLink href="/signup" variant="primary">Get started</ButtonLink>
            <ButtonLink href="/contact" variant="soft">Contact sales</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
