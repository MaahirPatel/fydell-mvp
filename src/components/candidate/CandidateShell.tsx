import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";
import SignOutButton from "@/components/employer/SignOutButton";
import CandidateWorkspace, { type CandidateCrumb } from "./CandidateWorkspace";
import type { CandidateSection } from "./section";
import s from "./candidate.module.css";

export type { CandidateCrumb };

/** The header-right sign-out. Quiet, text-only: leaving is a utility, not a CTA. */
function CandidateSignOut() {
  return (
    <SignOutButton className="inline-flex h-8 shrink-0 items-center rounded-[8px] px-2.5 text-[13px] font-medium text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50" />
  );
}

/**
 * Chrome for every candidate page except the workbench itself.
 *
 * With `current`, the page is one of the engineer's own destinations and gets
 * the sidebar workspace. Without it (shared passports, invitations, results,
 * the workbench) it keeps the slim public header: a recipient of a share link
 * has no sidebar to navigate.
 */
export function CandidateShell({
  children,
  width = "default",
  /** Shown at the right of the header or top bar. */
  action,
  current,
  /** Levels below the section, shown in the top bar after it. The last one is the page. */
  crumbs,
}: {
  children: React.ReactNode;
  width?: "default" | "narrow" | "wide";
  action?: React.ReactNode;
  current?: CandidateSection;
  crumbs?: readonly CandidateCrumb[];
}) {
  if (current) {
    return (
      <CandidateWorkspace current={current} width={width} crumbs={crumbs} action={action}>
        {children}
      </CandidateWorkspace>
    );
  }

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href="/" aria-label="Fydell home" className="inline-flex items-center">
            <FydellLogo height={20} />
          </Link>
          <div className={s.headerRight}>{action ?? <CandidateSignOut />}</div>
        </div>
      </header>
      <main className={`${s.main} ${s[width]}`}>{children}</main>
    </div>
  );
}

export default CandidateShell;
