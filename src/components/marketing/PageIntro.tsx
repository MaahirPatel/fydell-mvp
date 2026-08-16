import type { ReactNode } from "react";

/**
 * Linear-style page open: title on the left, reading column on the right.
 * Stacked title-then-lede is what made inner pages read as a template.
 */
export function PageIntro({
  title,
  lead,
  meta,
  actions,
}: {
  title: string;
  lead: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="pb-12 pt-[128px] sm:pt-[144px]">
      <div className="mkt-content">
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-16">
          <h1 className="page-display lg:col-span-6">{title}</h1>
          <div className="lg:col-span-6 lg:pt-1.5">
            {meta}
            <p className={meta ? "page-lead" : "page-lead mt-0"}>{lead}</p>
            {actions ? (
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
