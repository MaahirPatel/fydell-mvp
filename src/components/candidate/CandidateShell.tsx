import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";

/**
 * Chrome for every candidate page except the workbench itself: the profile,
 * invitations, results, and shared receipts all sit inside the same header.
 */
export function CandidateShell({
  children,
  width = "default",
  /** Shown at the right of the header. A sign-out control, usually. */
  action,
  current,
}: {
  children: React.ReactNode;
  width?: "default" | "narrow" | "wide";
  action?: React.ReactNode;
  current?: "profile" | "assessments";
}) {
  const max = width === "narrow" ? "max-w-[620px]" : width === "wide" ? "max-w-[1160px]" : "max-w-[860px]";
  const links = [
    { key: "profile", label: "Profile", href: "/app/candidate/profile" },
    { key: "assessments", label: "Assessments", href: "/app/candidate" },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
        <div className={`mx-auto flex h-14 items-center justify-between gap-4 px-5 sm:px-6 ${max}`}>
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="Fydell home" className="inline-flex items-center">
              <FydellLogo height={20} />
            </Link>
            {current ? (
              <nav aria-label="Candidate" className="hidden items-center gap-5 sm:flex">
                {links.map((l) => (
                  <Link
                    key={l.key}
                    href={l.href}
                    aria-current={current === l.key ? "page" : undefined}
                    className={`text-app-body font-medium ${current === l.key ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
          {action}
        </div>
      </header>
      <main className={`mx-auto px-5 py-9 sm:px-6 ${max}`}>{children}</main>
    </div>
  );
}

export default CandidateShell;
