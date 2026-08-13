import MarketingShell from "@/components/layout/MarketingShell";
import EvidenceFlow from "@/components/marketing/home/EvidenceFlow";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import { ButtonLink } from "@/components/marketing/ui";
import { EvidenceRail } from "@/components/marketing/motifs/EvidenceRail";

export const metadata = {
  title: "Product | Fydell",
  description:
    "One employer-led Data Analyst work trial: investigate, adapt when facts change, review inspectable evidence, and leave with a private Work Receipt.",
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <section className="pb-16 pt-[112px] sm:pt-[120px]">
        <div className="mkt-content">
          <h1 className="flat-type max-w-3xl text-[36px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[44px]">
            A work trial with an inspectable evidence trail
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/50">
            Fydell runs one published Data Analyst evaluation for a versioned employer cohort.
            Candidates investigate synthetic Northline operations data, revise when facts change,
            and employers open every consequential claim to its source.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              Sign in
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] py-16">
        <div className="mkt-content">
          <h2 className="flat-type text-[24px] font-semibold tracking-[-0.02em] text-white">
            Investigation canvas
          </h2>
          <p className="mt-2 max-w-xl text-[14.5px] text-white/50">
            The same Northline ops-yield fixture candidates use in the workbench.
          </p>
          <div className="mt-8">
            <HeroSimPreview />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] py-16">
        <div className="mkt-content">
          <h2 className="flat-type text-[24px] font-semibold tracking-[-0.02em] text-white">
            Invite, work, evidence
          </h2>
          <div className="mt-8">
            <EvidenceFlow />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-subtle)] py-16">
        <div className="mkt-content grid gap-8 lg:grid-cols-2">
          <div className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5">
            <h2 className="text-[16px] font-semibold text-white">Inspectable claims</h2>
            <EvidenceRail className="mt-4">
              <p className="text-[14px] text-white">
                Primary driver is the mid-period HOLD_RECLASS mapping
              </p>
              <p className="mt-2 text-[13px] text-white/50">
                Support, limitation, and source stay visible together.
              </p>
            </EvidenceRail>
          </div>
          <div className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5">
            <h2 className="text-[16px] font-semibold text-white">What we do not claim</h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">
              We do not automate hire or reject decisions, invent biometric identity, or claim
              remote-desktop or external-AI detection. Platform failures become review states - not
              negative candidate scores.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
