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
        "flex flex-wrap items-stretch divide-x divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-subtle)] bg-[var(--surface-raised)]",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-[132px] flex-1 px-4 py-3">
          <dt className="text-[12.5px] text-[var(--text-secondary)]">{item.label}</dt>
          <dd className="mt-1 text-[21px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-[var(--text-primary)]">
            {item.value}
          </dd>
          {item.hint ? (
            <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export default MetricStrip;
