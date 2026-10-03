import MarketingShell from "@/components/layout/MarketingShell";
import { Closing, Faq, Hero, Plans, Section, SectionHead, Table, Timeline } from "@/components/marketing/kit/Kit";
import { PRICING, planSignupHref, usd } from "@/lib/marketing/pricing";

export const metadata = {
  title: "Pricing",
  description:
    "Start with a $750 assisted pilot: one backend opening, up to ten applicants, requirement mapping, human-reviewed evidence briefs, and a results discussion.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <Hero compact title={["Start with an assisted pilot."]}>
        <div className="l-container">
          <p style={{ maxWidth: "62ch", margin: "0 auto 32px", textAlign: "center" }}>
            One opening, ten applicants, and a human-reviewed evidence brief. We do the setup
            with you, then walk through the results together. $750, one-time, no subscription.
          </p>
          <Plans
            plans={[
              {
                name: "Assisted pilot",
                price: "$750",
                per: "one-time",
                note: "For hiring teams",
                features: [
                  "One backend or API opening",
                  "Up to ten applicants reviewed",
                  "Requirement mapping to evidence",
                  "Human-reviewed briefs with citations",
                  "Results discussion with our team",
                ],
                cta: { href: "/contact?interest=pilot", label: "Discuss your opening" },
                featured: true,
              },
            ]}
          />
          <p style={{ maxWidth: "62ch", margin: "24px auto 0", textAlign: "center", fontSize: 14, opacity: 0.7 }}>
            We confirm scope and turnaround with you before anything is billed. Invoiced or paid
            by payment link. We don&apos;t promise unlimited simulations or guaranteed hires.
          </p>
        </div>
      </Hero>

      <Section id="self-serve" labelledBy="self-serve-title">
        <SectionHead id="self-serve-title" title={["Self-serve plans"]} />
        <div className="l-container">
          <p style={{ maxWidth: "62ch", marginBottom: 24 }}>
            A separate service for teams running simulations on their own. These plans remain
            available for existing commitments.
          </p>
        </div>
      </Section>

      <Hero compact title={["Pricing"]}>
        <div className="l-container">
          <Plans
            plans={[
              {
                name: "Engineers",
                price: "Free",
                note: "For engineers",
                features: ["Invited simulations", "Submission receipts", "Engineering Passport", "Share links you control"],
                cta: { href: "/signup", label: "Create an account" },
              },
              {
                name: "Starter",
                price: usd(PRICING.starterPerSimulation),
                per: "per simulation",
                note: "Pay per submission",
                features: ["No monthly fee", "Unlimited roles and reviewers", "Backend engineering simulation", "Cited reports", "Decision log"],
                cta: { href: planSignupHref("starter"), label: "Start on Starter" },
              },
              {
                name: "Team",
                price: usd(PRICING.teamMonthly),
                per: "per month",
                note: "For hiring teams",
                features: ["Everything in Starter", `${PRICING.teamIncluded} simulations a month`, `Then ${usd(PRICING.teamOverage)} each`, "Priority support", "Onboarding for your first role"],
                cta: { href: planSignupHref("team"), label: "Start on Team" },
                featured: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                note: `${PRICING.enterpriseFrom}+ simulations a month`,
                features: ["Everything in Team", "Volume pricing", "Security review", "Invoiced billing"],
                cta: { href: "/contact", label: "Contact sales" },
              },
            ]}
          />
        </div>
      </Hero>

      <Section id="compare" labelledBy="compare-title">
        <SectionHead
          id="compare-title"
          title={["Compare plans"]}
        />
        <Table
          head={["", "Engineers", "Starter", "Team", "Enterprise"]}
          rows={[
            ["Completed simulations", "Invited only", `${usd(PRICING.starterPerSimulation)} each`, `${PRICING.teamIncluded} a month, then ${usd(PRICING.teamOverage)}`, "Volume pricing"],
            ["Roles and reviewers", "Not applicable", "Unlimited", "Unlimited", "Unlimited"],
            ["Cited reports", "Your receipt", "Included", "Included", "Included"],
            ["Support", "Email", "Email", "Priority", "Priority"],
            ["Billing", "Free", "Card, per simulation", "Card, monthly", "Invoice"],
          ]}
        />
      </Section>

      <Section id="billing" labelledBy="billing-title">
        <SectionHead
          id="billing-title"
          title={["Billing"]}
        />
        <Timeline
          items={[
            { title: "Invite", body: "Send as many invitations as you like. Nothing is charged.", meta: "Free" },
            { title: "Candidate submits", body: "One submission is one completed simulation.", meta: "Charged", tone: "blue" },
            { title: "Abandoned or expired", body: "Attempts that never submit are never billed.", meta: "Free", tone: "red" },
            { title: "Change plans", body: "Switch from settings. The new plan starts next cycle.", meta: "Anytime" },
          ]}
        />
      </Section>

      <Section id="questions" labelledBy="questions-title">
        <SectionHead id="questions-title" title={["Questions"]} link={{ href: "/contact", label: "Ask us anything else" }} />
        <Faq
          items={[
            { q: "Is there a free trial?", a: "There is no separate trial. Starter has no monthly fee, so you pay only when a candidate submits." },
            { q: "What if a candidate doesn't finish?", a: "You pay nothing. Invitations, expired links and abandoned attempts are never billed." },
            { q: "Is there a contract?", a: "No. Starter and Team are month to month. Cancel from your billing settings." },
            { q: "How do you take payment?", a: "Through Stripe. All major credit and debit cards work. Enterprise can pay by invoice." },
          ]}
        />
      </Section>

      <Closing title={["Start with one role."]} primary={{ href: planSignupHref("starter"), label: "Start on Starter" }} />
    </MarketingShell>
  );
}
