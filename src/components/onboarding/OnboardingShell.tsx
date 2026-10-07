import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";

/**
 * Frame for first-run screens. Focused like the auth screens (no app
 * navigation competing with the one thing to do), but wide enough for real
 * work, with the way out always visible in the header.
 */
export default function OnboardingShell({
  title,
  lead,
  skipHref,
  skipLabel,
  meta,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  skipHref: string;
  skipLabel: string;
  /** Short status line under the lead, e.g. progress on small screens. */
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="site-linear flex min-h-[100dvh] flex-col bg-[var(--surface-canvas)]">
      <header className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
        <div className="mx-auto flex h-14 w-full max-w-[1160px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center rounded-[6px]" aria-label="Fydell home">
            <FydellLogo height={20} />
          </Link>
          <Link
            href={skipHref}
            className="inline-flex h-8 items-center rounded-[7px] px-2.5 text-[13px] text-[var(--text-secondary)] transition-colors duration-100 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {skipLabel}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1160px] flex-1 px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <h1 className="auth-display max-w-[28ch]">{title}</h1>
        {lead ? <p className="mt-3 max-w-[64ch] text-pretty text-app-body leading-[1.6] text-[var(--text-secondary)]">{lead}</p> : null}
        {meta ? <div className="mt-4">{meta}</div> : null}
        <div className="mt-8 sm:mt-10">{children}</div>
      </main>
    </div>
  );
}
