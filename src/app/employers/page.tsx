import MarketingShell from "@/components/layout/MarketingShell";
import BuilderReportDemo from "@/components/marketing/home/BuilderReportDemo";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import ApplicantReview from "@/components/marketing/site/ApplicantReview";
import SimulationWorkspace from "@/components/marketing/site/SimulationWorkspace";
import { Feature, SiteClosing, SiteFaq, SiteHero } from "@/components/marketing/site/Sections";
import { BACKEND_WEBHOOK_RETRY_V1 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition";
import { PRICING, usd } from "@/lib/marketing/pricing";

export const metadata = {
  title: "For Employers",
  description: "Publish a role, receive applications with the engineering work candidates chose to share, and review it requirement by requirement.",
  alternates: { canonical: "/employers" },
};

export default function EmployersPage() {
  return (
    <MarketingShell>
      <SiteHero
        title={["Hire on the work", "engineers have done."]}
        lead="Publish a role with its requirements. Applicants share the projects they choose, and your team reads that evidence requirement by requirement, then decides."
        primary={{ href: "/signup?as=employer", label: "Create a role" }}
        secondary={{ href: "/contact", label: "Contact sales" }}
        supporting={{ href: "/pricing", label: "See pricing" }}
      >
        <ProductFrame size="hero" interactive title="Hiring Workspace · Applicants" label="A hiring team's review of one applicant against the role's requirements. Select a requirement to see the evidence.">
          <ApplicantReview />
        </ProductFrame>
      </SiteHero>

      <Feature
        id="roles"
        layout="text"
        title="One role. One link. Every application in one place."
        body="Write the requirements once. Share the role link wherever you recruit. Applications arrive with the projects each engineer chose, pinned to the versions they shared."
        link={{ href: "/products/hiring-workspace", label: "About the Hiring Workspace" }}
        points={[
          { title: "Requirements first", body: "Each application is read against the same list, so reviews stay comparable." },
          { title: "Pinned evidence", body: "What you review doesn't change underneath you after the applicant applies." },
          { title: "Your decision", body: "Advance, hold or decline is recorded by your team and is not sent to the applicant." },
        ]}
      />

      <Feature
        id="evidence"
        layout="split"
        flip
        title="Check the evidence yourself."
        body={
          <>
            <p>Every finding opens the exact lines it cites, the revision it was read at, and what it can&apos;t tell you.</p>
            <p>Engineers&apos; statements and your reviewers&apos; judgments are labelled separately from what was read in the code.</p>
          </>
        }
        link={{ href: "/products/builder-reports", label: "About Builder Reports" }}
      >
        <ProductFrame interactive title="Builder Report" label="A Builder Report for a fictional project. Select a finding to see the lines it cites and its limits.">
          <BuilderReportDemo />
        </ProductFrame>
      </Feature>

      <Feature
        id="simulations"
        title="Fill the gaps with a short simulation."
        body={`When shared work doesn't cover a requirement, invite the applicant to a simulation. Today's scenario is the ${SCENARIO.title}: a small Python service, a brief, simulated teammates and a requirement update partway through, about ${SCENARIO.targetMinutes} minutes of work.`}
        link={{ href: "/products/simulations", label: "About Simulations" }}
      >
        <ProductFrame tag="Preview" title="Simulation · Webhook retry incident" label="A candidate's simulation: the brief and requirements, the project files, a public test run, and the team thread docked beside the brief.">
          <SimulationWorkspace />
        </ProductFrame>
      </Feature>

      <SiteFaq
        title="Questions from hiring teams"
        items={[
          { q: "Does Fydell score or rank candidates?", a: "No. Fydell organizes the evidence and runs the simulation checks. Your reviewers read it against your requirements and make the decision." },
          { q: "What roles does Fydell cover?", a: "Applications work for any engineering role. Simulations start with one backend scenario in Python; more are in development and are not listed until they are ready." },
          { q: "Can candidates use AI tools?", a: "Fydell cannot observe AI tools and does not claim to detect them. Candidates describe any AI help in their own words, and that is labelled as their statement." },
          { q: "What does it cost?", a: `Applications are never billed. Simulations are ${usd(PRICING.starterPerSimulation)} per completed simulation on Starter, or ${usd(PRICING.teamMonthly)} a month with ${PRICING.teamIncluded} included on Team. Card checkout is not open yet; contact sales to activate a plan.` },
        ]}
      />

      <SiteClosing
        title="Bring one open role."
        body="Create a workspace, publish the role and share its link."
        primary={{ href: "/signup?as=employer", label: "Create a role" }}
        secondary={{ href: "/contact", label: "Contact sales" }}
      />
    </MarketingShell>
  );
}
