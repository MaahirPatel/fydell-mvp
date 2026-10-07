import { Check } from "lucide-react";

export type ChecklistState = "done" | "current" | "todo" | "working";

export type ChecklistItem = {
  key: string;
  title: string;
  state: ChecklistState;
  /** One line under the title: what is true now, from real state. */
  detail?: React.ReactNode;
  /** Inline controls for this step. */
  children?: React.ReactNode;
};

const STATE_LABEL: Record<ChecklistState, string> = {
  done: "Done",
  current: "Next",
  todo: "Not started",
  working: "In progress",
};

function Marker({ state, index }: { state: ChecklistState; index: number }) {
  if (state === "done") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--surface-raised)]">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full border text-[12px] font-medium tabular-nums ${
        state === "current" || state === "working"
          ? "border-[var(--text-primary)] text-[var(--text-primary)]"
          : "border-[var(--border-strong)] text-[var(--text-tertiary)]"
      }`}
    >
      {index + 1}
    </span>
  );
}

/**
 * A vertical list of real steps. Each state is computed from the database by
 * the page, never from what the browser remembers, so the list cannot claim
 * something is done that is not.
 */
export default function Checklist({ items, label }: { items: ChecklistItem[]; label: string }) {
  return (
    <ol aria-label={label} className="relative">
      {items.map((item, i) => (
        <li key={item.key} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0">
          {i < items.length - 1 ? (
            <span aria-hidden className="absolute bottom-0 left-[11.5px] top-7 w-px bg-[var(--border-default)]" />
          ) : null}
          <Marker state={item.state} index={i} />
          <div className="min-w-0 pt-[2px]">
            <p className="flex flex-wrap items-baseline gap-x-2 text-app-body font-medium text-[var(--text-primary)]">
              {item.title}
              <span
                className={`text-[12px] font-normal ${
                  item.state === "done" ? "text-[var(--status-positive-ink)]" : item.state === "todo" ? "text-[var(--text-tertiary)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {STATE_LABEL[item.state]}
              </span>
            </p>
            {item.detail ? <div className="mt-0.5 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{item.detail}</div> : null}
            {item.children ? <div className="mt-3">{item.children}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
