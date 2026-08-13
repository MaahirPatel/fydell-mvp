import Link from "next/link";
import FydellMark from "@/components/brand/FydellMark";

/**
 * Chrome for every candidate page except the workbench itself.
 *
 * Before this, the invitation, the candidate home, the result and the shared
 * receipt each built their own header out of a different grey. A candidate who
 * accepts an invitation, does the work and reads their result should not feel
 * handed between three products, so the graphite canvas that the rest of
 * Fydell uses now runs the length of that path.
 *
 * The workbench keeps its own light surface deliberately: it is a reading and
 * writing environment for twenty minutes of dense material, not a page.
 */
export function CandidateShell({
  children,
  width = "default",
  /** Shown at the right of the header. A sign-out control, usually. */
  action,
}: {
  children: React.ReactNode;
  width?: "default" | "narrow" | "wide";
  action?: React.ReactNode;
}) {
  const max =
    width === "narrow"
      ? "max-w-[620px]"
      : width === "wide"
        ? "max-w-[1100px]"
        : "max-w-[860px]";

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)]">
        <div
          className={`mx-auto flex h-14 items-center justify-between gap-4 px-5 sm:px-6 ${max}`}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--text-primary)]"
            aria-label="Fydell home"
          >
            <FydellMark width={18} />
            <span className="text-[14px] font-medium tracking-[-0.01em]">Fydell</span>
          </Link>
          {action}
        </div>
      </header>
      <main className={`mx-auto px-5 py-9 sm:px-6 ${max}`}>{children}</main>
    </div>
  );
}

export default CandidateShell;
