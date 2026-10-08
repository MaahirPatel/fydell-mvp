import Link from "next/link";
import type { StageTone } from "./ColorStage";
import s from "./stage.module.css";

const STEPS: readonly { tone: StageTone; href: string; label: string; detail: string }[] = [
  { tone: "engineer", href: "/developers", label: "The engineer's profile", detail: "Projects with source-linked findings" },
  { tone: "simulation", href: "/", label: "The work in a simulation", detail: "A change, its tests, the team thread" },
  { tone: "employer", href: "/employers", label: "The team's review", detail: "Criteria, checks and the decision" },
];

/** The three views of one hiring loop, each on its own page. The current page is marked. */
export default function StoryStrip({ current }: { current: StageTone }) {
  return (
    <nav className={s.story} aria-label="How the pieces connect">
      <ol className={s.storyList}>
        {STEPS.map((step, i) => {
          const on = step.tone === current;
          return (
            <li key={step.tone} className={s.storyItem}>
              <Link href={step.href} className={s.storyLink} data-tone={step.tone} aria-current={on ? "page" : undefined}>
                <span className={s.storyNum} aria-hidden>
                  {i + 1}
                </span>
                <span className={s.storyText}>
                  <span className={s.storyLabel}>{step.label}</span>
                  <span className={s.storyDetail}>{step.detail}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
