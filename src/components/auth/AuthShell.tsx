import Link from "next/link";
import FydellLogo from "@/components/brand/FydellLogo";
import s from "./auth.module.css";

/**
 * The frame for every authentication screen.
 *
 * Without an aside it is one centred column: wordmark, heading, form, footer.
 * With an aside (signup), the form keeps the left column and the right column
 * sits on the graph-paper table showing what happens next with real product
 * data. The aside is hidden below the large breakpoint so a phone gets the
 * form and nothing else.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
  width = "narrow",
  aside,
  headerAction,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "narrow" | "wide";
  aside?: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  const header = (
    <header className="relative z-10 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
      <div className="flex h-14 items-center justify-between px-5 sm:px-8">
        <Link href="/" className="inline-flex items-center rounded-[6px]" aria-label="Fydell home">
          <FydellLogo height={20} />
        </Link>
        {headerAction ?? (
          <Link
            href="/"
            className="inline-flex h-8 items-center rounded-[6px] px-[10px] text-[13px] text-[var(--text-secondary)] transition-colors duration-100 hover:text-[var(--text-primary)]"
          >
            Back to fydell.com
          </Link>
        )}
      </div>
    </header>
  );

  const heading = (align: "left" | "center") => (
    <>
      <h1 className={`auth-display ${align === "center" ? "text-center" : ""}`}>{title}</h1>
      {description ? (
        <p
          className={`mt-3 text-pretty text-app-body leading-[1.6] tracking-[-0.006em] text-[var(--text-secondary)] ${
            align === "center" ? "text-balance text-center" : ""
          }`}
        >
          {description}
        </p>
      ) : null}
    </>
  );

  const foot = (align: "left" | "center") =>
    footer ? (
      <div
        className={`mt-8 border-t border-[var(--border-subtle)] pt-6 text-app-body text-[var(--text-secondary)] ${
          align === "center" ? "text-center" : ""
        }`}
      >
        {footer}
      </div>
    ) : null;

  if (aside) {
    return (
      <div className="site-linear relative flex min-h-[100dvh] flex-col bg-[var(--surface-canvas)]">
        {header}
        <main id="main" className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="flex justify-center px-5 py-10 sm:px-8 sm:py-14 lg:items-center lg:py-16">
            <div className="w-full max-w-[420px]">
              {heading("left")}
              <div className="mt-8">{children}</div>
              {foot("left")}
            </div>
          </div>
          <aside
            aria-label="What happens after you sign up"
            className={`${s.table} hidden border-l border-[var(--border-subtle)] lg:flex lg:items-center lg:justify-center`}
          >
            <div className="w-full max-w-[540px] px-10 py-16 xl:px-14">{aside}</div>
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="site-linear relative flex min-h-[100dvh] flex-col bg-[var(--surface-canvas)]">
      {header}
      <main
        id="main"
        className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 items-center justify-center px-5 py-12 sm:px-6 sm:py-16"
      >
        <div className={width === "wide" ? "w-full max-w-[560px]" : "w-full max-w-[400px]"}>
          {heading("center")}
          <div className="mt-8">{children}</div>
          {foot("center")}
        </div>
      </main>
    </div>
  );
}
