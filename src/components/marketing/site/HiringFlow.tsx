import { Check } from "lucide-react";
import type { TemplateCatalog } from "./SimulationTemplates";
import s from "./flow.module.css";

type Step = { title: string; body: string; fragment: React.ReactNode };

/**
 * The employer's path from template to decision, one small product fragment
 * per step. Template facts come from the validated catalog; the company
 * description and version number are example data.
 */
export default function HiringFlow({ catalog }: { catalog: TemplateCatalog }) {
  const first = catalog.first;
  const steps: Step[] = [
    {
      title: "Choose a simulation template",
      body: "Each one is a complete task with a starter project, tests and simulated teammates.",
      fragment: first ? (
        <div className={s.card}>
          <p className={s.cardTitle}>{first.title}</p>
          <p className={s.cardMeta}>
            {first.trackLabel} · {first.minutes} min
          </p>
          <span className={s.chip} data-tone="positive">
            Validated
          </span>
        </div>
      ) : null,
    },
    {
      title: "Adapt it to the role",
      body: "Describe where your team works and Fydell drafts a version set in your business.",
      fragment: (
        <div className={s.card}>
          <p className={s.fieldLabel}>Where your team works</p>
          <p className={s.field}>A marketplace that pays out sellers every week.</p>
          <span className={s.chip}>Draft, not yet validated</span>
        </div>
      ),
    },
    {
      title: "Preview and validate",
      body: "Fydell runs the tests before anyone is invited. Your team reads the draft and publishes it.",
      fragment: (
        <ul className={s.card}>
          {["Tests fail on the starter", "Tests pass on the reference", "Known wrong solutions fail"].map((t) => (
            <li key={t} className={s.check}>
              <Check aria-hidden size={13} className={s.tick} />
              {t}
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Share the invitation",
      body: "Candidates see the brief, the time and the AI policy before they start.",
      fragment: (
        <div className={s.card}>
          <p className={s.cardTitle}>Version 3</p>
          <p className={s.cardMeta}>Pinned for this candidate. Later edits don&apos;t change it.</p>
        </div>
      ),
    },
    {
      title: "Review the submission",
      body: "Each criterion shows the checks behind it. Your team records the decision.",
      fragment: (
        <ul className={s.card}>
          <li className={s.row}>
            <span className={s.dot} data-tone="positive" aria-hidden />
            Temporary and permanent failures
          </li>
          <li className={s.row}>
            <span className={s.dot} data-tone="attention" aria-hidden />
            Retry-After honored as requested
          </li>
          <li className={s.row}>
            <span className={s.dot} aria-hidden />
            Risks named specifically
          </li>
        </ul>
      ),
    },
  ];

  return (
    <ol className={s.flow} data-reveal="group">
      {steps.map((step, i) => (
        <li key={step.title} className={s.step}>
          <div className={s.stage} aria-hidden>
            {step.fragment}
          </div>
          <p className={s.title}>
            <span className={s.num}>{i + 1}</span>
            {step.title}
          </p>
          <p className={s.body}>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
