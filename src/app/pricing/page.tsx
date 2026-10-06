import MarketingShell from "@/components/layout/MarketingShell";
import { Closing, Faq, Hero, Plans, Section, SectionHead, Table, Timeline } from "@/components/marketing/kit/Kit";
import { PRICING, planSignupHref, usd } from "@/lib/marketing/pricing";

export const metadata = {
  title: "Pricing",
  description: `Free for engineers. Hiring teams pay ${usd(PRICING.starterPerSimulation)} per completed simulation, or ${usd(PRICING.teamMonthly)} a month with ${PRICING.teamIncluded} included.`,
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <Hero
        compact
        title={["Pricing"]}
      >
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
          eyebrow="Plans"
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
          eyebrow="How billing works"
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
        <SectionHead id="questions-title" eyebrow="FAQ" small title={["Questions"]} link={{ href: "/contact", label: "Ask us anything else" }} />
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
