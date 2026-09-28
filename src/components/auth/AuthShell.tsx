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
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--surface-canvas)]">
      {/* Ambient brand wash: a whisper of violet-blue along the top edge,
          dissolving into the warm canvas. Present, not noticeable. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-340px] h-[600px] w-[min(920px,120vw)] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(86,98,255,0.10),rgba(122,79,160,0.05),transparent)]" />
      </div>

      <header className="relative z-10 flex h-16 shrink-0 items-center px-6 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-[6px]"
          aria-label="Fydell home"
        >
          <FydellLogo height={22} />
        </Link>
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
            <p className="mt-3 text-balance text-center text-app-body font-[430] leading-[1.6] tracking-[-0.006em] text-[var(--text-secondary)]">
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
