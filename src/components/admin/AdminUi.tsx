import Link from "next/link";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1
          className="text-app-page text-[var(--text-primary)]"
          style={{ fontWeight: 560 }}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[56ch] text-app-body text-[var(--text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number | string;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-4 transition-colors duration-[var(--motion-fast)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-panel)]"
    >
      <p className="text-app-meta font-medium text-[var(--text-tertiary)]">
        {label}
      </p>
      <p
        className="mt-2.5 text-[34px] leading-none tabular-nums text-[var(--text-primary)]"
        style={{ fontWeight: 560, letterSpacing: "-0.04em" }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-app-meta text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] group-hover:text-[var(--text-secondary)]">
          {hint}
        </p>
      ) : null}
    </Link>
  );
}

export function AdminPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-app-meta font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--border-default)] px-4 py-10 text-center text-app-body text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

/**
 * Four tones, matching the four state meanings in the token layer. A status is
 * either neutral, actively moving, waiting on someone, resolved, or failed.
 * Anything that does not map to one of those reads neutral rather than
 * inventing a sixth colour.
 */
const TONE = {
  neutral:
    "bg-[var(--surface-hover)] text-[var(--text-secondary)] ring-[var(--border-default)]",
  active:
    "bg-[color-mix(in_srgb,var(--fydell-evidence)_15%,transparent)] text-[var(--fydell-evidence)] ring-[color-mix(in_srgb,var(--fydell-evidence)_28%,transparent)]",
  attention:
    "bg-[color-mix(in_srgb,var(--fydell-changed)_15%,transparent)] text-[var(--fydell-changed)] ring-[color-mix(in_srgb,var(--fydell-changed)_28%,transparent)]",
  done: "bg-[color-mix(in_srgb,var(--fydell-good)_15%,transparent)] text-[var(--fydell-good)] ring-[color-mix(in_srgb,var(--fydell-good)_28%,transparent)]",
  failed:
    "bg-[color-mix(in_srgb,var(--fydell-risk)_15%,transparent)] text-[var(--fydell-risk)] ring-[color-mix(in_srgb,var(--fydell-risk)_28%,transparent)]",
} as const;

const STATUS_TONE: Record<string, keyof typeof TONE> = {
  new: "active",
  reviewing: "active",
  contacted: "active",
  qualified: "active",
  sent: "active",
  pending: "attention",
  needs_information: "attention",
  approved: "done",
  archived: "neutral",
  rejected: "failed",
  failed: "failed",
  bounced: "failed",
};

export function AdminStatusBadge({ status }: { status: string }) {
  const tone = TONE[STATUS_TONE[status] ?? "neutral"];
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-tag)] px-2 py-0.5 text-app-meta font-medium capitalize ring-1 ring-inset ${tone}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function AdminPrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--surface-paper)] px-3.5 text-app-body font-medium text-[var(--surface-canvas)] transition-opacity duration-[var(--motion-fast)] hover:opacity-90"
    >
      {children}
    </Link>
  );
}

export function AdminTextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-app-meta text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--text-primary)]"
    >
      {children}
    </Link>
  );
}
