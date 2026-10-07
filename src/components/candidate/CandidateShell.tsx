import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";
import SignOutButton from "@/components/employer/SignOutButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import { CONTACT_MAILTO } from "@/lib/contact";
import s from "./candidate.module.css";

/** The header-right sign-out. Quiet, text-only: leaving is a utility, not a CTA. */
function CandidateSignOut() {
  return (
    <SignOutButton className="inline-flex h-8 shrink-0 items-center rounded-[8px] px-2.5 text-[13px] font-medium text-[var(--text-tertiary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-50" />
  );
}

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
  current?: "profile" | "work" | "applications" | "assessments" | "settings";
}) {
  const links = [
    { key: "profile", label: "Profile", href: "/app/candidate/profile" },
    { key: "work", label: "Passport", href: "/app/candidate/work-record" },
    { key: "applications", label: "Applications", href: "/app/candidate/applications" },
    { key: "assessments", label: "Evaluations", href: "/app/candidate" },
  ] as const;

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.headerLeft}>
            <Link href="/" aria-label="Fydell home" className="inline-flex items-center">
              <FydellLogo height={20} />
            </Link>
            {current ? (
              <nav aria-label="Candidate" className={s.nav}>
                {links.map((l) => (
                  <Link key={l.key} href={l.href} aria-current={current === l.key ? "page" : undefined} className={s.navLink}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
          <div className={s.headerRight}>
            {current ? (
              <>
                <a href={CONTACT_MAILTO} className={s.help}>
                  Help
                </a>
                <Link href="/app/candidate/settings" aria-current={current === "settings" ? "page" : undefined} className={s.help}>
                  Settings
                </Link>
                <NotificationBell />
              </>
            ) : null}
            {action ?? <CandidateSignOut />}
          </div>
        </div>
      </header>
      <main className={`${s.main} ${s[width]}`}>{children}</main>
    </div>
  );
}

export default CandidateShell;
