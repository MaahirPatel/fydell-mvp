import type { ReactNode } from "react";

/**
 * The bounded frame every Fydell product scene sits inside.
 *
 * Marketing pages previously each re-declared their own border, radius, chrome
 * bar and footer, which is why product crops drifted apart visually. One frame
 * keeps a scene on the homepage and a scene on the Product page recognisably
 * the same object.
 *
 * This is a frame, not a browser window. There is no fake traffic light, no
 * URL bar and no perspective tilt: the content is meant to be read, not to
 * suggest a screenshot.
 */
export function ProductStage({
  title,
  source,
  meta,
  children,
  footer,
  label,
  className = "",
}: {
  /** What the scene is, in product nouns. */
  title: string;
  /** The synthetic scenario the data comes from, shown so it is never mistaken for a customer. */
  source?: string;
  /** Right-aligned chrome, e.g. a timer. Only pass real state. */
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Accessible name for the whole scene, required for the text equivalent. */
  label: string;
  className?: string;
}) {
  return (
    <figure
      className={`m-0 overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-panel)] ${className}`}
      aria-label={label}
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
            {title}
          </span>
          {source ? (
            <span className="hidden shrink-0 text-[12.5px] text-[var(--text-tertiary)] sm:inline">
              {source}
            </span>
          ) : null}
        </div>
        {meta ? (
          <div className="flex shrink-0 items-center gap-3 text-[12.5px] text-[var(--text-tertiary)]">
            {meta}
          </div>
        ) : null}
      </div>

      {children}

      {footer ? (
        <div className="border-t border-[var(--border-subtle)] px-3 py-2">{footer}</div>
      ) : null}
    </figure>
  );
}

/**
 * A caption that gives a scene its text equivalent. Screen readers get the full
 * description; sighted readers get nothing, because the scene already shows it.
 */
export function StageDescription({ children }: { children: ReactNode }) {
  return <figcaption className="sr-only">{children}</figcaption>;
}
