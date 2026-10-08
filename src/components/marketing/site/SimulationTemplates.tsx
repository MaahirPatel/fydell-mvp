import { validatedExemplars, type ExemplarSummary } from "@/lib/eng/exemplars/registry";
import s from "./site.module.css";

/** The simulation templates employers can start from today: only those with a passing validation run. */
export default function SimulationTemplates() {
  const items = validatedExemplars();
  if (!items.length) return null;
  return (
    <ul className={s.catalog} aria-label="Simulation templates available today" data-reveal="group">
      {items.map((e) => (
        <li key={e.key}>
          <div>
            <p className={s.catalogTitle}>{e.title}</p>
            <p className={s.catalogSummary}>{e.summary}</p>
          </div>
          <div className={s.catalogMeta}>
            <strong>{e.trackLabel}</strong>
            <span className={s.catalogMinutes}>{e.minutes} min</span>
            <span>{e.taskFamilyLabel}</span>
            <span />
            <span>{e.stackLabel}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export type TemplateCatalog = { total: number; tracks: string[]; minMinutes: number; maxMinutes: number; first: ExemplarSummary | null };

export function templateCatalog(): TemplateCatalog {
  const items = validatedExemplars();
  const minutes = items.map((e) => e.minutes);
  return {
    total: items.length,
    tracks: [...new Set(items.map((e) => e.trackLabel))],
    minMinutes: minutes.length ? Math.min(...minutes) : 0,
    maxMinutes: minutes.length ? Math.max(...minutes) : 0,
    first: items[0] ?? null,
  };
}
