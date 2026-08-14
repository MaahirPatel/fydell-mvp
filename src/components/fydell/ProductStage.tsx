import type { ReactNode } from "react";
import FydellMark from "@/components/brand/FydellMark";

const APP_NAV = ["Home", "Evaluations", "Candidates", "Reports", "Settings"] as const;

/**
 * The bounded frame every Fydell product scene sits inside.
 *
 * `chrome="app"` adds the compact employer sidebar so marketing scenes read
 * as the product, not as a floating card.
 */
export function ProductStage({
  title,
  source,
  meta,
  children,
  footer,
  label,
  className = "",
  chrome = "plain",
}: {
  title: string;
  source?: string;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  label: string;
  className?: string;
  chrome?: "plain" | "app";
}) {
  const stage = (
    <>
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
    </>
  );

  return (
    <figure
      className={`product-frame m-0 overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] ${className}`}
      aria-label={label}
    >
      {chrome === "app" ? (
        <div className="grid lg:grid-cols-[188px_minmax(0,1fr)]">
          <aside
            aria-hidden
            className="hidden border-r border-[var(--border-subtle)] bg-[var(--surface-deep)] px-3 py-3.5 lg:block"
          >
            <div className="mb-5 flex items-center gap-2 px-1.5">
              <FydellMark width={16} />
              <span className="text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                fydell
              </span>
            </div>
            <ul className="space-y-0.5">
              {APP_NAV.map((item) => (
                <li
                  key={item}
                  className={`rounded-[6px] px-2 py-1.5 text-[12.5px] ${
                    item === "Reports"
                      ? "bg-white/[0.06] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {item}
                </li>
              ))}
            </ul>
          </aside>
          <div className="min-w-0">{stage}</div>
        </div>
      ) : (
        stage
      )}
    </figure>
  );
}

export function StageDescription({ children }: { children: ReactNode }) {
  return <figcaption className="sr-only">{children}</figcaption>;
}
