import Link from "next/link";
import { ButtonLink } from "@/components/marketing/ui";
import { EvidenceRail } from "@/components/marketing/motifs/EvidenceRail";

/** Fydell-native homepage sections after the hero investigation canvas. */
export default function HomeProductStory() {
  return (
    <>
      {/* Watch the investigation */}
      <section className="relative z-10 border-t border-[var(--border-subtle)] py-20 lg:py-24">
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="flat-type text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
              Watch what the candidate actually examined
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/50">
              Not a skill checklist. Production runs, quality events, and the yield definition
              for a fictional manufacturer - Northline Components.
            </p>
          </div>
          <div
            className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 lg:col-span-7"
            data-scene="investigate-crop"
            data-fixture="northline-ops-yield"
          >
            <p className="text-[13px] font-medium text-white/90">Current period filter</p>
            <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--border-subtle)]">
              <table className="w-full text-left text-[12.5px] tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-white/40">
                    <th className="px-3 py-2 font-medium">Line</th>
                    <th className="px-3 py-2 font-medium">Shift</th>
                    <th className="px-3 py-2 font-medium">Completed / planned</th>
                    <th className="px-3 py-2 font-medium">Yield</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="px-3 py-2">L1</td>
                    <td className="px-3 py-2">Day</td>
                    <td className="px-3 py-2">900 / 1000</td>
                    <td className="px-3 py-2">90.0%</td>
                  </tr>
                  <tr className="bg-[var(--fydell-evidence)]/10">
                    <td className="px-3 py-2 text-white">L2</td>
                    <td className="px-3 py-2">Day</td>
                    <td className="px-3 py-2">820 / 1000</td>
                    <td className="px-3 py-2 text-[var(--fydell-risk)]">82.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <EvidenceRail className="mt-4">
              <p className="text-[13px] text-white/75">
                Bookmarked: L2 Day completed units diverge after accounting for HOLD_RECLASS volume.
              </p>
            </EvidenceRail>
          </div>
        </div>
      </section>

      {/* Revision delta */}
      <section className="relative z-10 border-t border-[var(--border-subtle)] py-20 lg:py-24">
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12">
          <div className="order-2 rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 lg:order-1 lg:col-span-7"
            data-scene="revision-delta"
            data-fixture="northline-ops-yield-curveball"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[10px] border border-[var(--border-subtle)] p-4">
                <p className="text-[12px] font-medium text-white/45">Original finding</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/80">
                  Apparent plant-wide yield decline is largely a mid-period classification mapping.
                </p>
              </div>
              <div className="rounded-[10px] border border-[var(--border-subtle)] p-4">
                <p className="text-[12px] font-medium text-white/45">New operational fact</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-white/80">
                  Reporting-code change confirmed - leadership still needs a next-shift call on residual risk.
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-[10px] border border-[var(--border-subtle)] p-4">
              <p className="text-[12px] font-medium text-white/45">Revised conclusion</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white">
                Retain the measurement artifact claim. Add: residual operational signal on L2 Day requires
                validation before the next shift - not plant-wide blame.
              </p>
              <p className="mt-2 text-[12.5px] text-white/45">
                Reason: quality events show elevated REWORK_FIT / SCRAP_MATERIAL beyond HOLD_RECLASS.
              </p>
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-5">
            <h2 className="flat-type text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
              See what happens when the facts change
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/50">
              One curveball arrives after investigation. Candidates must revise or defend their
              conclusion with evidence - not restart from a blank page.
            </p>
          </div>
        </div>
      </section>

      {/* Inspectable claim */}
      <section className="relative z-10 border-t border-[var(--border-subtle)] py-20 lg:py-24">
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="flat-type text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
              Open every consequential claim
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/50">
              Employers see the artifact and the trail: support, limitation, and exact source - not a
              single opaque score.
            </p>
          </div>
          <div
            className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 lg:col-span-7"
            data-scene="inspectable-claim"
            data-fixture="ops-yield-report-sample"
          >
            <EvidenceRail>
              <p className="text-[14px] font-medium text-white">
                Primary driver is the mid-period HOLD_RECLASS mapping
              </p>
              <p className="mt-2 text-[13px] text-white/55">
                Support: reporting note + HOLD_RECLASS only in current quality_events.
              </p>
              <p className="mt-2 text-[13px] text-white/55">
                Limitation: mid-period start means plant-wide restatement is approximate.
              </p>
              <p className="mt-3 text-[12.5px] text-[var(--fydell-evidence-selected)]">
                Source open: Metric dictionary · Reporting-change note
              </p>
            </EvidenceRail>
          </div>
        </div>
      </section>

      {/* Oral defense */}
      <section className="relative z-10 border-t border-[var(--border-subtle)] py-20 lg:py-24">
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12">
          <div
            className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 lg:col-span-7"
            data-scene="oral-defense"
            data-fixture="ops-yield-defense-sample"
          >
            <p className="text-[12px] font-medium text-white/45">Evidence-grounded follow-up</p>
            <p className="mt-3 text-[15px] font-medium leading-snug text-white">
              You attributed most of the decline to HOLD_RECLASS. Walk us through how you still concluded
              L2 Day needs action before the next shift.
            </p>
            <p className="mt-4 text-[12.5px] text-white/40">
              Grounded in the candidate&apos;s cited rows - not a generic interview script or chat bot.
            </p>
          </div>
          <div className="lg:col-span-5">
            <h2 className="flat-type text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
              Ask the follow-up the work earned
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/50">
              Oral-defense questions are generated from the attempt&apos;s evidence. Facilitator notes
              are labeled when recording is unavailable.
            </p>
          </div>
        </div>
      </section>

      {/* Work Receipt */}
      <section className="relative z-10 border-t border-[var(--border-subtle)] py-20 lg:py-24">
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="flat-type text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
              Leave with a private Work Receipt
            </h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/50">
              Candidates control what leaves the platform: field-scoped shares, expiration, and
              immediate revoke. Not a public profile.
            </p>
          </div>
          <div
            className="rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-5 lg:col-span-7"
            data-scene="work-receipt"
            data-fixture="receipt-share-sample"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <p className="text-[14px] font-medium text-white">Work Receipt</p>
                <p className="mt-1 text-[12.5px] text-white/45">
                  Operations performance investigation · Data Analyst
                </p>
              </div>
              <p className="rounded-[6px] border border-[var(--border-subtle)] px-2 py-1 text-[12px] text-white/60">
                Private
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-[13px] text-white/70">
              <li>Demonstrated: metric judgment, residual-risk isolation</li>
              <li>Scope: this evaluation version only</li>
              <li>Share: fields selected · expires in 7 days · revocable</li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-[6px] border border-[var(--border-subtle)] px-2.5 py-1 text-[12px] text-white/55">
                Authorized share active
              </span>
              <span className="rounded-[6px] border border-[var(--border-subtle)] px-2.5 py-1 text-[12px] text-white/55">
                Revoke available
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pilot CTA */}
      <section className="relative z-10 border-t border-[var(--border-subtle)] py-20 lg:py-24">
        <div className="mkt-content max-w-2xl">
          <h2 className="flat-type text-[26px] font-semibold tracking-[-0.025em] text-white sm:text-[30px]">
            Run one serious Data Analyst pilot
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/50">
            One employer cohort, one published evaluation version, secure invites, inspectable
            evidence, and candidate-controlled receipts. October scope is this loop - not a
            marketplace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
            <ButtonLink href="/product" variant="secondary">
              See the product
            </ButtonLink>
          </div>
          <p className="mt-6 text-[12.5px] text-white/35">
            Prefer to explore first?{" "}
            <Link href="/login" className="text-white/55 underline-offset-2 hover:text-white hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
