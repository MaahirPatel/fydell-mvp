import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = {
  title: "Terms",
  description: "Fydell terms of use.",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="pb-14 pt-[132px] sm:pt-[148px]">
        <div className="mkt-content">
          <h1 className="page-display">Terms.</h1>
          <p className="page-lead">
            Full terms of use are being prepared. Until they are published, the
            agreement made with your organization governs use of the product.
          </p>
        </div>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)] pb-24">
        <div className="mkt-content max-w-[640px]">
          <p className="text-[15px] leading-[1.7] text-[var(--text-secondary)]">
            Fydell provides work-evaluation and evidence-report services to
            hiring teams. For questions about the current agreement, contact{" "}
            <a
              href="mailto:hello@fydell.com"
              className="text-[var(--text-primary)] underline underline-offset-2"
            >
              hello@fydell.com
            </a>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
