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
    figure: "FIG 0.1",
    title: "Work, not a test",
    body: "Candidates handle the ambiguity, tradeoffs, and stakeholder pressure the role contains.",
    Diagram: WorkSurfaceDiagram,
  },
  {
    figure: "FIG 0.2",
    title: "Evidence with limits",
    body: "Claims stay linked to supporting events, counter evidence, and remaining uncertainty.",
    Diagram: EvidenceDiagram,
  },
  {
    figure: "FIG 0.3",
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
  number,
  label,
  title,
  body,
  bleed = "right",
  children,
}: {
  number: string;
  label: string;
  title: string;
  body: string;
  bleed?: "right" | "contained";
  children: React.ReactNode;
}) {
  return (
    <section className={styles.chapter}>
      <div className={styles.container}>
        <header className={styles.chapterHead}>
          <h2>{title}</h2>
          <div className={styles.chapterSupport}>
            <p>{body}</p>
            <span>{number}&nbsp;&nbsp;{label}</span>
          </div>
        </header>
        <div
          className={`${styles.chapterScene} ${
            bleed === "contained" ? "" : styles.bleedRight
          }`}
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
            <span className={styles.principleIndex}>{principle.figure.replace("FIG", "Figure")}</span>
            <div className={styles.principleDiagram}><principle.Diagram /></div>
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        ))}
      </section>

      <Chapter number="1.0" label="Evaluate"
        title="Turn candidate work into hiring evidence."
        body="Candidates work through a realistic customer problem. Their assumptions, decisions, revisions, and explanations become a reviewable trail.">
        <WorkbenchScene />
      </Chapter>

      <Chapter number="2.0" label="Calibrate"
        title="Define the role before you evaluate the candidate."
        body="Calibrate the situation and the signals with the hiring team first, so evidence is judged against the work the person will actually do.">
        <CalibrationScene />
      </Chapter>

      <Chapter number="3.0" label="Adapt"
        title="Observe what changes when reality changes."
        body="Fydell introduces consequential information during the work. The signal is how the candidate updates the recommendation, not whether they guessed the twist.">
        <AdaptScene />
      </Chapter>

      <Chapter number="4.0" label="Defend"
        title="Make candidates defend the decisions they made."
        body="Follow-up questions come from the candidate’s own artifacts, assumptions, and limitations. The answer adds evidence; it does not erase uncertainty.">
        <DefenseScene />
      </Chapter>

      <Chapter number="5.0" label="Evidence" bleed="contained"
        title="Review evidence, not just a final answer."
        body="A human reviewer sees the event trail, supporting and counter evidence, and the limits that must travel with each claim.">
        <EvidenceReviewScene />
      </Chapter>

      <Chapter number="6.0" label="Interview"
        title="Walk into the interview knowing what to ask."
        body="The brief explains why Candidate 1 is worth interviewing, what remains uncertain, and the three questions most likely to change the decision.">
        <InterviewBriefScene />
      </Chapter>

      <Chapter number="7.0" label="Outcomes"
        title="Learn which evidence actually predicts success."
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
