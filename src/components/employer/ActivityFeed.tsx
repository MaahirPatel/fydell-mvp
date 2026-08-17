import Link from "next/link";

export interface ActivityRow {
  key: string;
  who: string;
  what: string;
  href: string | null;
  /** Formatted on the server, so every row agrees on the current instant. */
  elapsed: string;
  elapsedTitle: string;
}

/**
 * Meaningful events only, in one column.
 *
 * The events are drawn from recorded lifecycle timestamps, so every line is
 * something that actually happened to an invitation, a session or a decision.
 * A candidate's unsubmitted drafting is deliberately absent: watching someone
 * think is not information this workspace is entitled to.
 */
export default function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-app-body text-[var(--text-secondary)]">
        Nothing has happened yet. Events appear here as invitations are sent,
        opened and submitted.
      </p>
    );
  }

  return (
    <ul className="-mx-5 -mb-4 lg:-mx-6 lg:-mb-5">
      {rows.map((row) => {
        const body = (
          <>
            <span className="min-w-0 flex-1 truncate text-app-body text-[var(--text-primary)]">
              {row.what}
            </span>
            <span className="min-w-0 max-w-[38%] truncate text-app-meta text-[var(--text-secondary)]">
              {row.who}
            </span>
            <span
              title={row.elapsedTitle}
              className="w-9 shrink-0 text-right font-mono text-app-meta tabular-nums text-[var(--text-tertiary)]"
            >
              {row.elapsed}
            </span>
          </>
        );

        return (
          <li key={row.key} className="border-t border-[var(--border-subtle)]">
            {row.href ? (
              <Link
                href={row.href}
                className="flex items-baseline gap-3 px-5 py-2.5 transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] lg:px-6"
              >
                {body}
              </Link>
            ) : (
              <div className="flex items-baseline gap-3 px-5 py-2.5 lg:px-6">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
