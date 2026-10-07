import type { ReactNode } from "react";
import s from "./site.module.css";

export type FrameTag = "Example data" | "Preview";

/**
 * A product view in a thin neutral frame. `label` names what is shown for
 * assistive technology; `tag` says whether it is shipped UI with example data
 * or a preview of a layout that is still in development.
 */
export default function ProductFrame({
  title,
  label,
  tag = "Example data",
  interactive = false,
  caption,
  size = "default",
  children,
}: {
  title: string;
  label: string;
  tag?: FrameTag;
  interactive?: boolean;
  caption?: ReactNode;
  size?: "default" | "hero";
  children: ReactNode;
}) {
  return (
    <figure className={size === "hero" ? s.figureHero : s.figure}>
      <div className={s.frame}>
        <div className={s.frameBar}>
          <span className={s.frameDots} aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className={s.frameTitle}>{title}</span>
          <span className={tag === "Preview" ? s.frameTagPreview : s.frameTag}>{tag}</span>
        </div>
        {interactive ? (
          <div role="region" aria-label={`${label}. ${tag}.`} className={s.frameBody}>
            {children}
          </div>
        ) : (
          <div role="img" aria-label={`${label}. ${tag}.`} className={s.frameBody}>
            {children}
          </div>
        )}
      </div>
      {caption ? <figcaption className={s.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
