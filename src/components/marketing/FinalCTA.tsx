import { ButtonLink } from "@/components/marketing/ui";

export default function FinalCTA() {
  return (
    <section className="border-t border-white/[0.08] bg-[#080B12]">
      <div className="mx-auto max-w-[1180px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[480px]">
            <h2
              className="text-white"
              style={{
                fontSize: "clamp(1.85rem, 3.5vw, 2.75rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.04em",
                fontWeight: 620,
              }}
            >
              Run one FP&amp;A work trial.
            </h2>
            <p className="mt-4 max-w-[480px] text-[16px] leading-[1.65] text-white/[0.66]">
              Start with one role. Review structured evidence. Decide who is worth interviewing.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
            <ButtonLink href="/sample-report" variant="secondary">
              See sample report
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
