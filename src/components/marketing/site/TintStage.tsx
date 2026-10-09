import type { ReactNode } from "react";
import s from "./tint-stage.module.css";

export type Tint = "teal" | "blue" | "violet" | "warm";

/**
 * A product view on a soft tinted panel. The tint stays behind the view; the
 * product surface is always the brightest thing in the panel.
 */
export default function TintStage({ tint, children, inset = "default" }: { tint: Tint; children: ReactNode; inset?: "default" | "wide" }) {
  return (
    <div className={s.stage} data-tint={tint} data-inset={inset}>
      <span aria-hidden className={s.glow} />
      <div className={s.inner}>{children}</div>
    </div>
  );
}
