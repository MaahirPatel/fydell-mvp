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
        "flex flex-wrap items-stretch divide-x divide-[var(--border-subtle)] overflow-hidden rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface-panel)] shadow-sm",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-[132px] flex-1 px-5 py-4 bg-gradient-to-b from-[var(--surface-raised)] to-[var(--surface-panel)]">
          <dt className="text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">{item.label}</dt>
          <dd className="mt-2 text-[26px] font-medium leading-none tabular-nums tracking-tight text-[var(--text-primary)]">
            {item.value}
          </dd>
          {item.hint ? (
            <p className="mt-2 text-[12.5px] text-[var(--text-tertiary)] opacity-80">{item.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export default MetricStrip;
