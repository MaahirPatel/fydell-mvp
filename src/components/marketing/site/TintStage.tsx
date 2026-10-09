import type { ReactNode } from "react";
import s from "./tint-stage.module.css";

export type Tint = "teal" | "blue" | "violet" | "warm";

export type Step = { name: string; body: string };

/**
 * A product view on a soft tinted panel. The tint stays behind the view; the
 * product surface is always the brightest thing in the panel. `steps` adds a
 * row of short stages above the view, read left to right.
 */
export default function TintStage({
  tint,
  children,
  steps,
  inset = "default",
  crop = true,
}: {
  tint: Tint;
  children: ReactNode;
  steps?: readonly Step[];
  inset?: "default" | "wide";
  crop?: boolean;
}) {
  return (
    <div className={s.stage} data-tint={tint} data-inset={inset} data-crop={crop || undefined}>
      <span aria-hidden className={s.glow} />
      {steps ? (
        <ol className={s.steps}>
          {steps.map((step, i) => (
            <li key={step.name}>
              <span className={s.stepNum} aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className={s.stepText}>
                <strong>{step.name}</strong> {step.body}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
      <div className={s.inner}>{children}</div>
    </div>
  );
}
