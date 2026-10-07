/**
 * Data-presence completeness for the engineering profile.
 *
 * This is a checklist of what the engineer has actually added - never a
 * quality score, never a ranking. Missing items link to the section that
 * supplies them, so the strip is a wayfinder rather than a judgement.
 */
export type PresenceItem = {
  key: string;
  label: string;
  present: boolean;
  /** In-page anchor of the section that supplies this item. */
  anchor: string;
};

export default function ProfileCompleteness({ items }: { items: PresenceItem[] }) {
  const present = items.filter((i) => i.present).length;
  return (
    <section
      aria-label="Profile completeness"
      className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-app-body font-medium text-[var(--text-primary)]">
          What is on your profile
        </p>
        <p className="text-app-meta tabular-nums text-[var(--text-tertiary)]">
          {present} of {items.length} added
        </p>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                item.present
                  ? "bg-[var(--fydell-good)]"
                  : "border border-[var(--border-strong)] bg-transparent"
              }`}
            />
            {item.present ? (
              <span className="text-app-meta text-[var(--text-secondary)]">{item.label}</span>
            ) : (
              <a
                href={item.anchor}
                className="text-app-meta font-medium text-[var(--text-primary)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--text-primary)]"
              >
                Add {item.label.toLowerCase()}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-app-meta leading-[1.55] text-[var(--text-tertiary)]">
        Completeness counts what you have added, not how good it is. There is no score here.
      </p>
    </section>
  );
}
