import { cn } from "@/lib/cn";

/**
 * A compact horizontal row of real numbers.
 *
 * This exists specifically to replace rows of giant zero cards. Render it only
 * once the underlying data exists; a first-run screen should show a setup path
 * instead. Every metric must answer an operational question.
 */
export function MetricStrip({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode; hint?: string }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <dl
      className={cn(
        "flex flex-wrap items-stretch divide-x divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-panel)] shadow-[var(--shadow-panel)]",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-[132px] flex-1 px-5 py-4">
          <dt className="text-app-meta font-medium uppercase tracking-wider text-[var(--text-tertiary)]">{item.label}</dt>
          <dd className="mt-1 text-app-page font-semibold leading-none tabular-nums tracking-[-0.02em] text-[var(--text-primary)]">
            {item.value}
          </dd>
          {item.hint ? (
            <p className="mt-1.5 text-app-meta text-[var(--text-tertiary)]">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export default MetricStrip;
