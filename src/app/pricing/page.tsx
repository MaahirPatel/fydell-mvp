import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import ProWaitlistForm from "@/components/marketing/site/ProWaitlistForm";
import { Availability, SiteClosing, SiteFaq, SiteHero } from "@/components/marketing/site/Sections";
import { PRICING, usd } from "@/lib/marketing/pricing";
import s from "@/components/marketing/site/pricing.module.css";

export const metadata = {
  title: "Pricing",
  description: `Free for engineers. Hiring teams pay ${usd(PRICING.starterPerSimulation)} per completed simulation, or ${usd(PRICING.teamMonthly)} a month with ${PRICING.teamIncluded} included.`,
  alternates: { canonical: "/pricing" },
};

type Plan = {
  name: string;
  price: string;
  per?: string;
  summary: string;
  features: readonly string[];
  cta: { href: string; label: string };
  status?: "preview";
};

const HIRING: readonly Plan[] = [
  {
    name: "Starter",
    price: usd(PRICING.starterPerSimulation),
    per: "per completed simulation",
    summary: "No monthly fee. Pay only when a candidate submits.",
    features: ["Roles, application links and reviewers", "Requirement-by-requirement review", "Simulations with cited reports", "Decision log"],
    cta: { href: "/signup?as=employer", label: "Create a workspace" },
  },
  {
    name: "Team",
    price: usd(PRICING.teamMonthly),
    per: "per month",
    summary: `${PRICING.teamIncluded} completed simulations included, then ${usd(PRICING.teamOverage)} each.`,
    features: ["Everything in Starter", `${PRICING.teamIncluded} completed simulations a month`, "Priority support", "Help setting up your first role"],
    cta: { href: "/signup?as=employer", label: "Create a workspace" },
  },
  {
    name: "Hiring Pilot",
    price: "Quoted",
    per: "for one role",
    summary: "A fixed package for one open role, scoped with you before anything starts.",
    features: ["One role, set up with our help", "An agreed number of simulations", "Review support for your team", "A clear end date"],
    cta: { href: "/contact", label: "Contact sales" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    per: `from ${PRICING.enterpriseFrom} simulations a month`,
    summary: "Volume pricing, security review and invoiced billing.",
    features: ["Everything in Team", "Volume pricing", "Security review", "Invoiced billing"],
    cta: { href: "/contact", label: "Contact sales" },
  },
];

const COMPARE: readonly (readonly string[])[] = [
  ["Price", `${usd(PRICING.starterPerSimulation)} per completed simulation`, `${usd(PRICING.teamMonthly)} a month`, "Quoted per role", "Custom"],
  ["Included simulations", "None; pay as you go", `${PRICING.teamIncluded} a month`, "Agreed in the quote", "Agreed in the contract"],
  ["At the limit", "Each completed simulation is billed", `${usd(PRICING.teamOverage)} per extra completed simulation`, "Agreed in the quote", "Volume rate"],
  ["Applications through a role link", "Not billed", "Not billed", "Not billed", "Not billed"],
  ["Analysis and cited reports", "Included", "Included", "Included", "Included"],
  ["Billing", "Card, per simulation", "Card, monthly", "Invoice", "Invoice"],
  ["Cancellation", "No commitment", "Month to month, from billing settings", "Ends on the agreed date", "Per contract"],
  ["Support", "Email", "Priority", "Priority", "Priority"],
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <SiteHero
        title={["Pricing"]}
        lead="Free for engineers. Hiring teams pay per completed simulation, never for applications, invitations or abandoned attempts. Prices in US dollars."
      />

      <section className={s.section} aria-labelledby="engineers-title">
        <div className={s.container}>
          <h2 id="engineers-title" className={s.h2}>
            For engineers
          </h2>
          <p className={s.sectionLead}>Applying to a role never requires a subscription.</p>
          <div className={s.engineerGrid}>
            <article className={s.plan}>
              <p className={s.planName}>Free</p>
              <p className={s.price}>
                $0 <span className={s.per}>forever</span>
              </p>
              <p className={s.summary}>Everything you need to present your work and apply.</p>
              <ul className={s.features}>
                <li>Builder Profile and Engineering Passport</li>
                <li>Projects from GitHub, ZIP uploads or your own description</li>
                <li>Builder Reports with cited findings</li>
                <li>Share links you scope, expire and revoke</li>
                <li>Applications and employer invitations, including simulations</li>
              </ul>
              <p className={s.limitNote}>
                Analysis limits: up to 3 repositories per import and 20 imports an hour. Past a limit you wait for the next hour; nothing is charged.
              </p>
              <Link href="/signup" className="l-btn l-btn-lg l-btn-solid mt-6 self-start">
                Sign up
              </Link>
            </article>

            <article className={s.planPreview} aria-labelledby="pro-title">
              <div className={s.planHead}>
                <p id="pro-title" className={s.planName}>
                  Pro
                </p>
                <Availability state="preview">Preview</Availability>
              </div>
              <p className={s.price}>
                $15 <span className={s.per}>per month, proposed</span>
              </p>
              <p className={s.summary}>
                <strong>Paid subscriptions are not available yet.</strong> This is the plan we intend to offer; the price and contents may change before it opens.
              </p>
              <ul className={s.features}>
                <li>Everything in Free</li>
                <li>Additional analysis capacity</li>
                <li>Private project history</li>
                <li>Ongoing feedback on your projects</li>
              </ul>
              <div className={s.waitlist}>
                <ProWaitlistForm />
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="teams-title">
        <div className={s.container}>
          <h2 id="teams-title" className={s.h2}>
            For hiring teams
          </h2>
          <p className={s.sectionLead}>
            Card checkout is not open yet. Create a workspace and set up your first role now; to activate a paid plan, contact sales.
          </p>
          <div className={s.hiringGrid}>
            {HIRING.map((plan) => (
              <article key={plan.name} className={s.plan}>
                <p className={s.planName}>{plan.name}</p>
                <p className={s.price}>
                  {plan.price} {plan.per ? <span className={s.per}>{plan.per}</span> : null}
                </p>
                <p className={s.summary}>{plan.summary}</p>
                <ul className={s.features}>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href={plan.cta.href} className={`l-btn l-btn-lg mt-auto self-start ${plan.cta.href === "/contact" ? "l-btn-ghost" : "l-btn-solid"}`}>
                  {plan.cta.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={s.section} aria-labelledby="compare-title">
        <div className={s.container}>
          <h2 id="compare-title" className={s.h2}>
            Compare hiring plans
          </h2>
          <div className={s.tableWrap} tabIndex={0} role="region" aria-labelledby="compare-title">
            <table className={s.table}>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  {HIRING.map((p) => (
                    <th key={p.name} scope="col">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => (
                      <td key={`${label}-${i}`}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.tableNote}>
            A completed simulation is one candidate submission. Applications are engineers applying through your role link with the projects they chose; they are not simulation participants and are never billed.
          </p>
        </div>
      </section>

      <SiteFaq
        items={[
          { q: "What counts as a completed simulation?", a: "One candidate submitting their work. Invitations, expired links and attempts that are never submitted are not billed." },
          { q: "Is AI analysis included?", a: "Yes. Analysis of shared projects and the cited reports for simulations are included in every hiring plan. There is no separate usage charge." },
          { q: "Do I need a card to start?", a: "No. You can create a workspace and set up a role without a card. Card checkout is not open yet; contact sales to activate a paid plan." },
          { q: "Can I cancel?", a: "Starter has no commitment. Team is month to month and is cancelled from your workspace's billing settings. Pilot and Enterprise follow the agreed terms." },
          { q: "Do engineers ever pay to apply?", a: "No. Applying to roles, accepting invitations and taking simulations are free. Pro, when it opens, adds capacity and history; it is never required to apply." },
        ]}
      />

      <SiteClosing
        title="Start with one role."
        body="Create a workspace, publish a role and share its application link."
        primary={{ href: "/signup?as=employer", label: "Create a workspace" }}
        secondary={{ href: "/contact", label: "Contact sales" }}
      />
    </MarketingShell>
  );
}
