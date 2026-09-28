import Link from "next/link";
import { Check } from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import PricingEstimator from "@/components/marketing/PricingEstimator";
import { Kicker } from "@/components/marketing/ui";
import s from "@/components/marketing/home/fydell-home.module.css";
import { PRICING, planSignupHref, usd } from "@/lib/marketing/pricing";

export const metadata = {
  title: "Pricing",
  description: `Free for engineers. Hiring teams pay ${usd(PRICING.starterPerSimulation)} per completed simulation, or ${usd(PRICING.teamMonthly)} a month with ${PRICING.teamIncluded} included.`,
};

type Plan = {
  key: string;
  name: string;
  badge?: string;
  price: string;
  per?: string;
  unit: string;
  includes: readonly string[];
  action: { label: string; href: string };
  solid?: boolean;
  featured?: boolean;
};

const PLANS: readonly Plan[] = [
  {
    key: "engineers",
    name: "Engineers",
    price: "Free",
    unit: "Always. For anyone building or sharing a passport.",
    includes: [
      "Engineering Passport from public repositories",
      "Source-linked findings with coverage",
      "Scoped, revocable share links",
      "JSON export of your record",
      "Simulations you are invited to",
    ],
    action: { label: "Build your passport", href: "/passport/new" },
  },
  {
    key: "starter",
    name: "Starter",
    price: usd(PRICING.starterPerSimulation),
    per: "/ simulation",
    unit: "Pay per completed simulation. No monthly fee.",
    includes: [
      "Unlimited roles, invitations, and reviewers",
      "Python backend simulation",
      "Evidence reports with citations",
      "Open passports candidates share with you",
      "Decision log and reviewer notes",
    ],
    action: { label: "Start on Starter", href: planSignupHref("starter") },
  },
  {
    key: "team",
    name: "Team",
    badge: "Recommended",
    price: usd(PRICING.teamMonthly),
    per: "/ month",
    unit: `${PRICING.teamIncluded} completed simulations included, then ${usd(PRICING.teamOverage)} each.`,
    includes: [
      "Everything in Starter",
      `${PRICING.teamIncluded} completed simulations every month`,
      `${usd(PRICING.teamOverage)} per extra simulation`,
      "Priority support from the Fydell team",
      "Onboarding call for your first role",
    ],
    action: { label: "Start on Team", href: planSignupHref("team") },
    solid: true,
    featured: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    unit: `For ${PRICING.enterpriseFrom}+ completed simulations a month.`,
    includes: [
      "Everything in Team",
      "Volume pricing and contract terms",
      "Security and data-handling review",
      "Invoiced billing",
      "Named contact",
    ],
    action: { label: "Talk to us", href: "/contact" },
  },
];

const FAQ = [
  {
    q: "What exactly is billed?",
    a: "A completed simulation: a candidate submitted an attempt and it produced a report. Invitations, expired links, abandoned attempts, and runs that fail for infrastructure reasons are never billed.",
  },
  {
    q: "Do reviewers or roles cost extra?",
    a: "No. Every plan includes unlimited roles, invitations, and reviewers. You pay for completed work, not seats.",
  },
  {
    q: "What happens to unused Team simulations?",
    a: "Included simulations reset each month and do not roll over. If your volume varies a lot, Starter may cost less; the estimator shows both.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Move between Starter and Team at the start of any billing month. Enterprise terms are set in your agreement.",
  },
  {
    q: "Do engineers ever pay?",
    a: "Never. Passports, share links, exports, and invited simulations are free for engineers.",
  },
  {
    q: "What is covered today?",
    a: "Simulations cover Python backend work. Frontend, full-stack, and AI/ML candidates can be reviewed through their Engineering Passport evidence at no charge.",
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingShell>
      <div className={s.page}>
        <section className={s.hero}>
          <div className={`${s.container} ${s.heroCopyIn}`}>
            <Kicker>Pricing</Kicker>
            <h1 className={s.title}>Free for engineers. <span className="t-evidence">Pay per completed simulation.</span></h1>
            <div className={s.heroRow}>
              <p className={s.lede}>
                Nothing billed until a candidate finishes. Pick a plan or estimate your month below.
              </p>
            </div>
          </div>

          <div className={s.container}>
            <div className={s.plans}>
              {PLANS.map((plan) => (
                <div key={plan.key} id={plan.key} className={`${s.plan} ${plan.featured ? s.planFeatured : ""}`}>
                  <p className={s.planName}>
                    {plan.name}
                    {plan.badge ? <span className={s.example}>{plan.badge}</span> : null}
                  </p>
                  <p className={s.planPrice}>
                    {plan.price}
                    {plan.per ? <small>{plan.per}</small> : null}
                  </p>
                  <p className={s.planUnit}>{plan.unit}</p>
                  <ul className={s.planList}>
                    {plan.includes.map((item) => (
                      <li key={item}>
                        <Check aria-hidden /> {item}
                      </li>
                    ))}
                  </ul>
                  <div className={s.planAction}>
                    <Link href={plan.action.href} className={plan.solid ? s.btnSolid : s.btnGhost}>
                      {plan.action.label}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="estimate" className={`${s.container} ${s.chapter}`}>
          <div className={s.chapterHead}>
            <h2 className={s.chapterTitle}>Estimate your month</h2>
            <p className={s.chapterCopy}>
              Drag to your expected volume of completed simulations. The estimator compares Starter and Team at
              published prices and flags the cheaper one.
            </p>
          </div>
          <PricingEstimator />
        </section>

        <section className={`${s.container} ${s.chapter}`} aria-labelledby="pricing-faq">
          <h2 id="pricing-faq" className={s.chapterTitle}>Billing questions</h2>
          <div className={s.faq}>
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${s.container} ${s.closing}`}>
          <h2 className={s.closingTitle}>
            Start with one role.
            <br />
            <span>Pay only when candidates finish.</span>
          </h2>
          <div className={s.closingRow}>
            <p className={s.lede}>Prices in US dollars, excluding applicable taxes.</p>
            <div className={s.heroActions}>
              <Link href="/signup?as=employer" className={s.btnSolid}>Start hiring</Link>
              <Link href="/contact" className={s.btnGhost}>Talk to us</Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
