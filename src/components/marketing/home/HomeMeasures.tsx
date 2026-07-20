import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

type Bucket = "strong_evidence" | "needs_review" | "limited_evidence" | "not_observed";

const BUCKET_META: Record<Bucket, { label: string; className: string }> = {
  strong_evidence: {
    label: "Strong evidence",
    className: "border-[rgba(103,217,160,0.24)] bg-[rgba(103,217,160,0.09)] text-[#8EE4B8]",
  },
  needs_review: {
    label: "Needs review",
    className: "border-[rgba(86,98,255,0.28)] bg-[rgba(86,98,255,0.09)] text-[#9FADFF]",
  },
  limited_evidence: {
    label: "Limited evidence",
    className: "border-[var(--border-default)] bg-white/[0.02] text-[rgba(244,245,247,0.62)]",
  },
  not_observed: {
    label: "Not observed",
    className: "border-white/[0.06] bg-transparent text-[rgba(244,245,247,0.32)]",
  },
};

const TRAITS: { name: string; moment: string; bucket: Bucket }[] = [
  {
    name: "Elicitation",
    moment: "Asked Dana what \u201Cuseful\u201D meant before writing any code — then asked again once Priya joined the thread.",
    bucket: "strong_evidence",
  },
  {
    name: "Contradiction handling",
    moment: "Named the conflict between Dana's dashboard ask and Priya's root-cause ask explicitly, instead of quietly picking one.",
    bucket: "strong_evidence",
  },
  {
    name: "Data integrity vigilance",
    moment: "Ran reconcile.py before trusting the late-rate number — caught the 3 rows the naive join silently dropped.",
    bucket: "strong_evidence",
  },
  {
    name: "Scope renegotiation",
    moment: "Told Dana the deadline moved up, but the handoff never states what specifically got cut from the original plan.",
    bucket: "needs_review",
  },
  {
    name: "Technical execution",
    moment: "Reached a passing reconciliation test and a clean eval run before the final submission.",
    bucket: "strong_evidence",
  },
  {
    name: "AI tool judgment",
    moment: "Used the AI assist to draft a query, but the handoff doesn't say whether the output was checked against the reconciled numbers.",
    bucket: "limited_evidence",
  },
  {
    name: "Verification discipline",
    moment: "Ran the preview command once, early — no second check after the scope cut that followed the curveball.",
    bucket: "limited_evidence",
  },
  {
    name: "Limitation honesty",
    moment: "Ship-gate note names the carrier's self-reported on-time rate as unverified, not confirmed against the shipment data.",
    bucket: "strong_evidence",
  },
  {
    name: "Prioritization under pressure",
    moment: "Cut dashboard polish first when the board meeting moved up; kept the reconciled numbers intact.",
    bucket: "needs_review",
  },
  {
    name: "Communication & translation",
    moment: "Session ended before reaching a written handoff — no plain-language recommendation to evaluate.",
    bucket: "not_observed",
  },
];

export default function HomeMeasures() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal className="max-w-[640px]">
          <h2 className="section-heading flat-type">Evidence, not vibes.</h2>
          <p className="section-desc mt-5">
            Ten traits, scored independently from cited moments in the session — not a black-box
            percentage. Every trait lands in one of four buckets, and a trait with no opportunity
            to show up is labeled not observed, never scored as a zero.
          </p>
        </Reveal>

        <div className="mt-12 border-t border-[var(--border-subtle)]">
          {TRAITS.map((trait, i) => {
            const meta = BUCKET_META[trait.bucket];
            return (
              <Reveal key={trait.name} delay={0.015 * i}>
                <div className="grid items-start gap-3 border-b border-[var(--border-subtle)] py-5 sm:grid-cols-[0.85fr_1.85fr_auto] sm:gap-6">
                  <h3
                    className="text-[14.5px] text-[#F4F5F7]"
                    style={{ fontWeight: 560, letterSpacing: "-0.015em" }}
                  >
                    {trait.name}
                  </h3>
                  <p className="text-[13.5px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                    {trait.moment}
                  </p>
                  <span
                    className={`inline-flex h-6 shrink-0 items-center rounded-[6px] border px-2 text-[11px] ${meta.className}`}
                    style={{ fontWeight: 520 }}
                  >
                    {meta.label}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.06} className="mt-8 flex flex-wrap items-center gap-3 rounded-[10px] border border-[var(--border-subtle)] bg-white/[0.015] px-5 py-4">
          <span
            className="inline-flex h-6 items-center rounded-[6px] border border-[var(--border-default)] px-2 text-[11px] text-[rgba(244,245,247,0.72)]"
            style={{ fontWeight: 520 }}
          >
            Fit score: 74 / 100 · secondary metric
          </span>
          <p className="text-[13px] leading-[1.5] text-[rgba(244,245,247,0.5)]">
            The composite is <span className="text-[rgba(244,245,247,0.72)]">design-weighted</span> — a
            deliberate rollup of the traits above, not yet outcome-validated against on-the-job
            performance. Read the ten traits first; the number is context, not the verdict.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
