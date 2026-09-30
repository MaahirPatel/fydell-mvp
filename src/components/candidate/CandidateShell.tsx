import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";
import SignOutButton from "@/components/employer/SignOutButton";
import { CONTACT_MAILTO } from "@/lib/contact";
import s from "./candidate.module.css";

export type CandidateSection = "home" | "passport" | "simulations";

/** Older callers name the sections they had before the three-part nav. */
type LegacySection = "profile" | "assessments";

const LEGACY: Record<LegacySection, CandidateSection> = { profile: "passport", assessments: "simulations" };

const LINKS: readonly { key: CandidateSection; label: string; href: string }[] = [
  { key: "home", label: "Home", href: "/app/candidate" },
  { key: "passport", label: "My passport", href: "/app/candidate/passport" },
  { key: "simulations", label: "My simulations", href: "/app/candidate/simulations" },
];

/**
 * Chrome for every candidate page except the workbench itself. Anything a
 * candidate can click is at least 44px tall and says where it goes; the page
 * they are on is filled, so "where am I" never needs working out.
 */
export function CandidateShell({
  children,
  width = "default",
  /** Shown at the right of the header. A sign-out control, usually. */
  action,
  current,
  userName,
}: {
  children: React.ReactNode;
  width?: "default" | "narrow" | "wide";
  action?: React.ReactNode;
  current?: CandidateSection | LegacySection;
  /** Shown as initials beside sign-out, so the candidate knows whose account this is. */
  userName?: string;
}) {
  const section = current ? (current in LEGACY ? LEGACY[current as LegacySection] : (current as CandidateSection)) : null;

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link href={section ? "/app/candidate" : "/"} aria-label="Fydell home" className={s.logo}>
            <FydellLogo height={22} />
          </Link>
          {section ? (
            <nav aria-label="Candidate" className={s.nav}>
              {LINKS.map((l) => (
                <Link key={l.key} href={l.href} aria-current={section === l.key ? "page" : undefined} className={s.navLink}>
                  {l.label}
                </Link>
              ))}
              <a href={CONTACT_MAILTO} className={s.navLink}>
                Help
              </a>
            </nav>
          ) : null}
          <div className={s.headerRight}>
            {userName ? (
              <span className={s.who} title={userName}>
                <span aria-hidden className={s.whoInitials}>
                  {initialsOf(userName)}
                </span>
                <span className={s.whoName}>{userName.split(/\s+/)[0]}</span>
              </span>
            ) : null}
            {action ?? <SignOutButton className={s.signOut} />}
          </div>
        </div>
      </header>
      <main className={`${s.main} ${s[width]}`}>{children}</main>
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default CandidateShell;
