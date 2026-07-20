import { Container, EditorialHeader } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const LOOP_STEPS = [
  { day: "Day 0", title: "Invite", body: "Send one FDE candidate a private link. No marketplace, no queue." },
  { day: "Day 1–3", title: "Session", body: "A 50-minute recorded Relay session, on their own time." },
  { day: "Day 4–6", title: "Receipt", body: "Trait-level evidence, buckets, and cited moments land in your inbox." },
  { day: "Day 7–14", title: "Decision", body: "Your team reviews the receipt and decides who moves to a real interview." },
];

const REASONS = [
  {
    title: "It's a filter, not an interview",
    body: "The receipt tells you who's worth a senior engineer's hour, not who gets the offer. You still interview — with a transcript instead of a gut feeling.",
  },
  {
    title: "Built to sit next to your ATS",
    body: "Every receipt exports as a structured record — CSV, PDF, or a link — that attaches to the candidate you already have in Greenhouse or Ashby. We're not claiming a live integration; we haven't shipped one yet.",
  },
  {
    title: "Priced for a real hiring loop",
    body: "One mission, one FDE, one decision. Run it before the first technical interview, not as a fourth round nobody asked for.",
  },
];

export default function HomeHiringLoop() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <EditorialHeader
            heading="Built for the FDE hiring loop."
            description="A 12–21 day loop from invite to decision — sized to fit before your team burns senior-engineer hours on a candidate who won't clear the bar."
          />
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-0 border-t border-[var(--border-subtle)] sm:mt-16 sm:grid-cols-4">
          {LOOP_STEPS.map((step, i) => (
            <Reveal key={step.day} delay={0.03 * i}>
              <div className="border-b border-[var(--border-subtle)] py-6 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
                <p className="text-[12px] tabular-nums text-[rgba(244,245,247,0.4)]">{step.day}</p>
                <h3 className="mt-2 text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                  {step.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-10 border-t border-[var(--border-subtle)] pt-12 sm:grid-cols-3 sm:gap-8 lg:gap-12">
          {REASONS.map((r, i) => (
            <Reveal key={r.title} delay={0.03 * i}>
              <h3
                className="text-[15px] text-[#F4F5F7]"
                style={{ fontWeight: 560, letterSpacing: "-0.015em" }}
              >
                {r.title}
              </h3>
              <p className="mt-2 max-w-[300px] text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
                {r.body}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
