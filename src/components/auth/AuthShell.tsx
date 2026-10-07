import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";
import AuthShowcase, { type ShowcaseVariant } from "./AuthShowcase";

/**
 * The frame for every authentication screen: sign up, sign in, role choice,
 * password reset and the link and confirmation notices.
 *
 * Left: wordmark, the one form, and a quiet footer, in a column that is the
 * whole page on a phone. Right, from the large breakpoint: a full-height
 * panel showing the product the person is signing in to, with example data.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
  width = "narrow",
  showcase = "engineer",
  headerAction,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "narrow" | "wide";
  /** Which product the right panel shows. */
  showcase?: ShowcaseVariant;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className="site-linear min-h-[100dvh] bg-[var(--surface-canvas)] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex min-h-[100dvh] flex-col px-5 sm:px-10 xl:px-16">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 sm:h-20">
          <Link href="/" className="inline-flex items-center rounded-[6px]" aria-label="Fydell home">
            <FydellLogo height={22} />
          </Link>
          {headerAction ?? (
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-[7px] px-2.5 text-[13px] text-[var(--text-secondary)] transition-colors duration-100 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              Back to fydell.com
            </Link>
          )}
        </header>

        <main id="main" className="flex flex-1 items-center py-8 sm:py-12">
          <div className={`mx-auto w-full ${width === "wide" ? "max-w-[480px]" : "max-w-[400px]"}`}>
            <h1 className="auth-display">{title}</h1>
            {description ? (
              <p className="mt-3 text-pretty text-app-body leading-[1.6] tracking-[-0.006em] text-[var(--text-secondary)]">{description}</p>
            ) : null}
            <div className="mt-8">{children}</div>
            {footer ? (
              <div className="mt-8 border-t border-[var(--border-subtle)] pt-6 text-app-body text-[var(--text-secondary)]">{footer}</div>
            ) : null}
          </div>
        </main>

        <footer className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 py-6 text-[12.5px] text-[var(--text-tertiary)]">
          <span>© Fydell</span>
          <Link href="/terms" className="hover:text-[var(--text-secondary)]">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-[var(--text-secondary)]">
            Privacy
          </Link>
        </footer>
      </div>

      <aside className="sticky top-0 hidden h-[100dvh] overflow-hidden border-l border-[var(--border-subtle)] bg-[var(--surface-panel)] lg:block">
        <AuthShowcase variant={showcase} />
      </aside>
    </div>
  );
}
