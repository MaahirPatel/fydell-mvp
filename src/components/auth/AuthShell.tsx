import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";

/**
 * The single frame for every authentication screen.
 *
 * One centered column on a quiet canvas: wordmark, heading, form, footer.
 * Signup and login are trust surfaces — a product scene beside credential
 * fields reads as a pitch, not reassurance, so the shell takes no aside.
 * Screens that need more room (role select, onboarding) use the wide
 * measure; the composition stays the same.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
  width = "narrow",
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <div className="site-linear relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--surface-canvas)]">
      {/* The same porcelain-and-blue light as the homepage hero, so signing in
          never feels like leaving the site. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(60%_55%_at_88%_0%,#efede6_0%,rgba(239,237,230,0.5)_38%,transparent_72%),radial-gradient(50%_45%_at_10%_38%,rgba(244,243,239,0.9)_0%,transparent_70%),linear-gradient(180deg,#ffffff_0%,var(--surface-canvas)_70%)]"
      />

      <header className="relative z-10 shrink-0">
        <div className="l-container flex h-16 items-center justify-between">
          <Link href="/" className="inline-flex items-center rounded-[6px]" aria-label="Fydell home">
            <FydellLogo height={20} />
          </Link>
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-[6px] px-[10px] text-[13px] text-[var(--text-secondary)] transition-colors duration-100 hover:text-[var(--text-primary)]"
          >
            Back to fydell.com
          </Link>
        </div>
      </header>

      <main
        id="main"
        className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 items-center justify-center px-6 py-12 sm:py-16"
      >
        <div
          className={
            width === "wide" ? "w-full max-w-[520px]" : "w-full max-w-[400px]"
          }
        >
          <h1 className="auth-display text-center">{title}</h1>
          {description ? (
            <p className="mt-3 text-balance text-center text-app-body leading-[1.6] tracking-[-0.006em] text-[var(--text-body)]">
              {description}
            </p>
          ) : null}

          <div className="mt-8">{children}</div>

          {footer ? (
            <div className="mt-8 border-t border-[var(--border-subtle)] pt-6 text-center text-app-body text-[var(--text-secondary)]">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
