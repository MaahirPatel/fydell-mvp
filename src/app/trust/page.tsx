import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";

export const metadata = {
  title: "Trust · Fydell",
  description: "What Fydell does and doesn't do today — stated plainly, without invented outcomes or candidates.",
};

const SECTIONS = [
  {
    title: "No fabricated candidates or outcomes",
    body: "Every mission, session, receipt, and decision you see inside Fydell is backed by a real row in our database, created by a real action someone took. We don't seed demo data that looks like real people.",
  },
  {
    title: "Simulations are simulations",
    body: "Project Relay runs in your browser against a scenario codebase — not a live production system. No real customer data or systems are touched during a session.",
  },
  {
    title: "Evidence is rule-based, and we say so",
    body: "Findings on a work receipt come from simple rules over the recorded event timeline (command runs, file saves, chat messages, timing). Each finding states its confidence and its limitations. We don't present this as a certified psychometric assessment.",
  },
  {
    title: "Technical failures aren't charged",
    body: "If a session breaks for reasons outside the FDE's control — and we can confirm it — it's flagged as a technical failure and never billed, and never counted against your mission total.",
  },
  {
    title: "You control your own evidence",
    body: "FDEs decide who sees their work receipts. Employers only see evidence from missions they posted themselves. Nothing is broadcast to a public network.",
  },
  {
    title: "What's still early",
    body: "We're a founding pilot. The network view, richer graph, and outcome tracking are intentionally minimal right now — we'd rather ship something honest and small than something impressive and fake.",
  },
];

export default function TrustPage() {
  return (
    <MarketingShell>
      <PageHero
        title="What we do — and don't — today."
        description="Stated plainly, so you can decide whether to trust the evidence."
        narrow
      />

      <section className="mkt-section border-t border-[var(--border-subtle)]">
        <Container>
          <div className="border-t border-[var(--border-subtle)]">
            {SECTIONS.map((s, i) => (
              <Reveal key={s.title} delay={0.02 * i}>
                <div className="grid gap-3 border-b border-[var(--border-subtle)] py-6 sm:grid-cols-[0.9fr_1.4fr] sm:gap-8">
                  <h3 className="text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                    {s.title}
                  </h3>
                  <p className="text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </MarketingShell>
  );
}
