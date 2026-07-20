import { Container, EditorialHeader } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const CONTENTS = [
  {
    tag: "Messy data",
    title: "A hand-kept sheet that disagrees with the system export.",
    body:
      "Northbeam's ops team tracks delays by hand in a CSV that was never validated against the TMS export. Three rows use a different shipment-ID format and get silently dropped by a naive join — the dashboard looks confident and reports a late rate 5 points too low.",
  },
  {
    tag: "Stakeholder conflict",
    title: "The ops manager and the VP want two different deliverables.",
    body:
      "Dana wants something her team can check every morning. Priya wants a root-cause writeup she can defend to the board. Neither of them resolves it — and the board meeting gets moved up a day, mid-session, with no warning.",
  },
  {
    tag: "AI-assisted, not AI-trusted",
    title: "The workspace includes an AI assist. Using it isn't the test.",
    body:
      "Candidates can ask an AI tool to draft a patch or a query. What we score is whether they verified the output — ran it, read the diff, checked the number — before shipping it, not whether they used the tool at all.",
  },
  {
    tag: "A real ship gate",
    title: "Submission requires naming what's still unverified.",
    body:
      "Before the workspace freezes, the candidate has to state what they built, how they know it works, and what they're not sure about. A confident handoff with nothing named against it is itself a finding — not a pass.",
  },
];

export default function HomeSimulationContents() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <EditorialHeader
            heading="What the simulation contains."
            description="Project Relay is one synthetic company, one underspecified ask, and one 50-minute window. Nothing here is a puzzle with a clean answer."
          />
        </Reveal>

        <div className="mt-14 grid gap-10 sm:mt-16 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-14 lg:gap-x-14">
          {CONTENTS.map((item, i) => (
            <Reveal key={item.tag} delay={0.03 * i}>
              <div className="border-t border-[var(--border-subtle)] pt-6">
                <p
                  className="text-[11px] uppercase tracking-[0.06em] text-[#8FA0FF]"
                  style={{ fontWeight: 560 }}
                >
                  {item.tag}
                </p>
                <h3
                  className="mt-2.5 text-[16px] text-[#F4F5F7]"
                  style={{ fontWeight: 560, letterSpacing: "-0.018em" }}
                >
                  {item.title}
                </h3>
                <p className="mt-2.5 max-w-[440px] text-[14px] leading-[1.6] text-[rgba(244,245,247,0.62)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
