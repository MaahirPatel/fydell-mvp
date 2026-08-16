import { ButtonLink } from "@/components/marketing/ui";

/**
 * The last thing on a marketing page.
 *
 * Every page previously hand-rolled its own closing section, which is why the
 * homepage ended in a 720px left-aligned column and /product ended in a 620px
 * one with a single button. Neither read as an ending; they read as one more
 * section that happened to be last.
 *
 * This is the one place the page centres. The rest of the site is left-aligned
 * editorial, so switching axis is what signals "this is the end" without
 * needing a heavier band, a bigger type size, or decoration.
 */
function Arrow() {
  return (
    <span
      aria-hidden
      className="-mr-0.5 transition-transform duration-150 ease-[var(--ease)] group-hover:translate-x-[3px]"
    >
      →
    </span>
  );
}

export default function ClosingCTA({
  title,
  body,
  note,
  primary,
  secondary,
  className = "",
}: {
  title: string;
  body: string;
  note?: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  className?: string;
}) {
  return (
    <section
      className={[
        "border-t border-[var(--border-subtle)] bg-[var(--surface-band)]",
        "pb-28 pt-24 lg:pb-32 lg:pt-28",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mkt-content">
        <div className="mx-auto flex max-w-[640px] flex-col items-center text-center">
          <h2 className="section-heading max-w-none text-balance">{title}</h2>
          <p className="mt-5 max-w-[52ch] text-[1.125rem] leading-[1.6] text-[var(--text-secondary)]">
            {body}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={primary.href} variant="primary" className="group">
              {primary.label}
              <Arrow />
            </ButtonLink>
            {secondary ? (
              <ButtonLink
                href={secondary.href}
                variant="secondary"
                className="group"
              >
                {secondary.label}
                <Arrow />
              </ButtonLink>
            ) : null}
          </div>

          {note ? (
            <p className="mt-8 max-w-[54ch] text-[13px] leading-[1.6] text-[var(--text-tertiary)]">
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
