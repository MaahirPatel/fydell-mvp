import Link from "next/link";
import s from "./simulation-library.module.css";

/**
 * The real scenario library: one row per definition in the engine catalog.
 *
 * Every value below is copied from the authored scenario files - keep them in
 * sync by hand when the catalog changes:
 *   src/lib/sim-engine/scenarios/catalog.ts and the eight scenario files it
 *   imports (solutions-engineer/northstar-integration,
 *   data-analyst/{northline-operations-yield, q3-churn-investigation},
 *   implementation-consultant/brightpath-launch-import,
 *   technical-support/green-status-page,
 *   business-systems-analyst/ridgeline-executive-queue,
 *   applied-ai-engineer/ai-workflow-hardening).
 */
const SCENARIOS = [
  {
    title: "Northline yield, real drop or reporting change?",
    company: "Northline",
    role: "Data Analyst",
    minutes: 25,
    difficulty: "Intermediate",
    released: true,
  },
  {
    title: "Q3 churn, mix, usage, or billing?",
    company: "Synthetic",
    role: "Data Analyst",
    minutes: 25,
    difficulty: "Intermediate",
    released: false,
  },
  {
    title: "Q3 churn metric, reconcile the board pack",
    company: "Synthetic",
    role: "BI Analyst",
    minutes: 25,
    difficulty: "Intermediate",
    released: false,
  },
  {
    title: "Northstar Health, CRM sync failure before board demo",
    company: "Northstar Health",
    role: "Solutions Engineer",
    minutes: 25,
    difficulty: "Intermediate",
    released: false,
  },
  {
    title: "Brightpath, launch-day employee import",
    company: "Brightpath",
    role: "Implementation Consultant",
    minutes: 25,
    difficulty: "Intermediate",
    released: false,
  },
  {
    title: "Skedra, green status page, SSO login failures",
    company: "Skedra",
    role: "Technical Support Engineer",
    minutes: 25,
    difficulty: "Intermediate",
    released: false,
  },
  {
    title: "Ridgeline, the executive queue",
    company: "Ridgeline",
    role: "Business Systems Analyst",
    minutes: 25,
    difficulty: "Intermediate",
    released: false,
  },
  {
    title: "Harden an enterprise AI workflow",
    company: "Lantern Systems",
    role: "Applied AI Engineer",
    minutes: 45,
    difficulty: "Advanced",
    released: false,
  },
] as const;

export default function SimulationLibrary() {
  return (
    <div className={s.library}>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <caption className={s.caption}>
            Authored scenarios in the simulation engine. Companies in these
            scenarios are fictional.
          </caption>
          <thead>
            <tr>
              <th scope="col">Scenario</th>
              <th scope="col">Role</th>
              <th scope="col" className={s.num}>Working time</th>
              <th scope="col">Difficulty</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((row) => (
              <tr key={row.title}>
                <th scope="row" className={s.title}>
                  {row.title}
                  <span className={s.company}>{row.company}</span>
                </th>
                <td>{row.role}</td>
                <td className={s.num}>{row.minutes} min</td>
                <td>
                  <span className={s.pill} data-difficulty={row.difficulty}>
                    <span className={s.dot} aria-hidden />
                    {row.difficulty}
                  </span>
                </td>
                <td>
                  {row.released ? (
                    <Link href="/simulations" className={s.released}>
                      Released: view it
                    </Link>
                  ) : (
                    <span className={s.pending}>In catalog</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={s.note}>
        One evaluation is released to employers today: the Northline operations
        investigation for data analysts. The rest are authored and versioned in
        the catalog, and release with employer demand.
      </p>
    </div>
  );
}
