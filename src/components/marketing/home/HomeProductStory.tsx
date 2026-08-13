import { ButtonLink } from "@/components/marketing/ui";

/**
 * The employer narrative after the hero.
 *
 * Every scene renders real Northline fixture content rather than an image of a
 * dashboard. Sections alternate side so the page has rhythm without needing
 * decoration, and each one answers a question an employer actually asks.
 */

const SECTION = "border-t border-[var(--border-subtle)] mkt-section";
const FRAME =
  "rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6";

function Copy({ heading, body }: { heading: string; body: string }) {
  return (
    <div>
      <h2 className="section-heading">{heading}</h2>
      <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}

function Row({
  copy,
  scene,
  reverse,
}: {
  copy: React.ReactNode;
  scene: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className={SECTION}>
      <div className="mkt-content grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div
          className={`lg:col-span-5 ${reverse ? "order-1 lg:order-2" : ""}`}
        >
          {copy}
        </div>
        <div
          className={`min-w-0 lg:col-span-7 ${reverse ? "order-2 lg:order-1" : ""}`}
        >
          {scene}
        </div>
      </div>
    </section>
  );
}

export default function HomeProductStory() {
  return (
    <>
      <Row
        copy={
          <Copy
            heading="Real material, not a skills checklist"
            body="Production runs, quality events and the official yield definition for Northline Components, a fictional manufacturer. The candidate has to decide what matters."
          />
        }
        scene={
          <div className={FRAME} data-scene="investigate-crop">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                production_runs.csv
              </p>
              <p className="text-[12.5px] text-[var(--text-tertiary)]">
                Filtered to current period
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {["Line", "Shift", "Completed / planned", "Yield"].map(
                      (h, i) => (
                        <th
                          key={h}
                          scope="col"
                          className={`py-2 pr-4 text-[11.5px] font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)] ${
                            i === 3 ? "text-right" : ""
                          }`}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td className="py-2.5 pr-4 text-[var(--text-primary)]">L1</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Day</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">
                      900 / 1000
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[var(--text-primary)]">
                      90.0%
                    </td>
                  </tr>
                  <tr className="border-b border-[var(--border-subtle)] bg-[rgba(242,107,130,0.07)]">
                    <td className="py-2.5 pr-4 text-[var(--text-primary)]">L2</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Day</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">
                      820 / 1000
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-[var(--fydell-risk)]">
                      82.0%
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-[var(--text-primary)]">L1</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Night</td>
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">
                      750 / 800
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[var(--text-primary)]">
                      93.8%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="relative mt-5 border-t border-[var(--border-subtle)] pt-4 pl-3">
              <span
                aria-hidden
                className="absolute bottom-0 left-0 top-4 w-[2px] rounded-full bg-[var(--fydell-evidence)]"
              />
              <p className="text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                Bookmarked by the candidate: L2 Day diverges even after the
                reclassified volume is removed.
              </p>
            </div>
          </div>
        }
      />

      <Row
        reverse
        copy={
          <Copy
            heading="What happens when the facts change"
            body="One new fact arrives after the investigation is under way. The candidate has to revise or defend the conclusion, not restart from a blank page."
          />
        }
        scene={
          <div className={FRAME} data-scene="revision-delta">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-4">
                <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                  First conclusion
                </p>
                <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                  The plant-wide decline is largely a mid-period classification
                  change, not a production failure.
                </p>
              </div>
              <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-4">
                <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                  New fact
                </p>
                <p className="mt-2.5 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                  Operations confirms the reporting change, and still needs a
                  call on real risk before the next shift.
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] border-l-2 border-l-[var(--fydell-risk)] p-4">
              <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                Revised conclusion
              </p>
              <p className="mt-2.5 text-[14px] leading-[1.6] text-[var(--text-primary)]">
                Keep the measurement finding. Add that Line L2 Day carries
                residual risk and should be validated before the next shift.
                This is not plant-wide.
              </p>
              <p className="mt-3 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                Stated uncertainty: rework and scrap on L2 Day exceed the
                reclassified volume, and the cause is not yet established.
              </p>
            </div>
          </div>
        }
      />

      <Row
        copy={
          <Copy
            heading="Open any claim and see what it rests on"
            body="Each consequential claim carries its support, its limitation and the exact source the candidate opened. There is no single opaque score to argue about."
          />
        }
        scene={
          <div className={FRAME} data-scene="inspectable-claim">
            <div className="relative pl-3.5">
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-[var(--fydell-evidence)]"
              />
              <p className="text-[15px] font-medium leading-[1.45] text-[var(--text-primary)]">
                The primary driver is the mid-period HOLD_RECLASS mapping.
              </p>
              <dl className="mt-4 grid gap-3">
                <div>
                  <dt className="text-[12px] font-medium text-[var(--text-tertiary)]">
                    Support
                  </dt>
                  <dd className="mt-1 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                    The reporting note, plus HOLD_RECLASS appearing only in the
                    current period of quality_events.csv.
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-medium text-[var(--text-tertiary)]">
                    Limitation
                  </dt>
                  <dd className="mt-1 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                    The change began mid-period, so any restatement of the prior
                    period is approximate.
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-medium text-[var(--text-tertiary)]">
                    Sources opened
                  </dt>
                  <dd className="mt-1 text-[13.5px] leading-[1.6] text-[var(--text-primary)]">
                    Metric dictionary, reporting-change note, quality_events.csv
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        }
      />

      <Row
        reverse
        copy={
          <Copy
            heading="Ask the follow-up the work earned"
            body="Interview questions are generated from the candidate's own cited rows, so the conversation starts where the evidence gets thin instead of with a generic script."
          />
        }
        scene={
          <div className={FRAME} data-scene="oral-defense">
            <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
              Generated follow-up
            </p>
            <p className="mt-3 text-[16px] font-medium leading-[1.5] text-[var(--text-primary)]">
              You attributed most of the decline to HOLD_RECLASS. Walk us
              through how you still concluded that L2 Day needs action before
              the next shift.
            </p>
            <p className="mt-4 border-t border-[var(--border-subtle)] pt-4 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
              Grounded in the rows this candidate actually cited. When a session
              is not recorded, the report says so rather than leaving a gap.
            </p>
          </div>
        }
      />

      <Row
        copy={
          <Copy
            heading="The candidate keeps a private record"
            body="A Work Receipt belongs to the candidate. They choose which fields to share, for how long, and they can revoke it at any time. It is not a public profile."
          />
        }
        scene={
          <div className={FRAME} data-scene="work-receipt">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                  Work Receipt
                </p>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  Operations performance investigation
                </p>
              </div>
              <span className="inline-flex h-[22px] items-center rounded-[4px] border border-[var(--border-default)] px-1.5 text-[12px] text-[var(--text-secondary)]">
                Private by default
              </span>
            </div>
            <dl className="mt-4 grid gap-2.5 text-[13.5px]">
              {[
                ["Demonstrated", "Metric judgement, residual-risk isolation"],
                ["Scope", "This evaluation version only"],
                ["Sharing", "Selected fields, expires in 7 days, revocable"],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap gap-x-3">
                  <dt className="w-[104px] shrink-0 text-[var(--text-tertiary)]">
                    {label}
                  </dt>
                  <dd className="min-w-0 flex-1 text-[var(--text-secondary)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        }
      />

      <section className={`${SECTION} pb-24`}>
        <div className="mkt-content max-w-[640px]">
          <h2 className="section-heading">Run it on one real role.</h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            Create a workspace, invite a candidate, and read the report. There
            is one evaluation, built properly, rather than a catalogue of short
            tests.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" variant="primary">
              Create your workspace
            </ButtonLink>
            <ButtonLink href="/simulations" variant="secondary">
              See the evaluation
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
