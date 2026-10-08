import type { ReactNode } from "react";
import s from "./stage.module.css";

export type StageTone = "engineer" | "simulation" | "employer";

/**
 * A product view floated on a soft colour field in the page's accent:
 * violet for engineers, the brand teal-to-violet for the simulation, teal and
 * blue for employers. The colour stays behind the view, never on its content.
 */
export default function ColorStage({ tone, compact = false, children }: { tone: StageTone; compact?: boolean; children: ReactNode }) {
  return (
    <div className={s.stage} data-tone={tone} data-compact={compact || undefined}>
      <span aria-hidden className={s.field} />
      <div className={s.inner}>{children}</div>
    </div>
  );
}
