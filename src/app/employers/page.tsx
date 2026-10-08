import MarketingShell from "@/components/layout/MarketingShell";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import ApplicantReview from "@/components/marketing/site/ApplicantReview";
import ColorStage from "@/components/marketing/site/ColorStage";
import StoryStrip from "@/components/marketing/site/StoryStrip";
import EmployerReview from "@/components/marketing/site/EmployerReview";
import HiringFlow from "@/components/marketing/site/HiringFlow";
import SimulationTemplates, { templateCatalog } from "@/components/marketing/site/SimulationTemplates";
import { Feature, SiteClosing, SiteFaq, SiteHero } from "@/components/marketing/site/Sections";
import { PRICING, usd } from "@/lib/marketing/pricing";

export const metadata = {
  title: "For Employers",
  description: "Give candidates a task that reflects your role. Review their changes, tests, and task communication in one place.",
  alternates: { canonical: "/employers" },
};

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export default function EmployersPage() {
  const catalog = templateCatalog();
  return (
    <MarketingShell>
      <SiteHero
        title={["See how they work", "before you hire them."]}
        lead="Give candidates a task that reflects your role. Review their changes, tests, and task communication in one place."
        primary={{ href: "/signup?as=employer", label: "Create a workspace" }}
        supporting={{ href: "/sandbox", label: "Explore demo" }}
      >
        <ColorStage tone="employer">
          <ProductFrame size="hero" title="Fydell · Submission review" label="A hiring team's review of one submission: a criterion, the changed lines and checks behind it, the one item left open, and the next step.">
          <EmployerReview />
        </ProductFrame>
        </ColorStage>
        <StoryStrip current="employer" />
      </SiteHero>

      <Feature
        id="flow"
        layout="text"
        title="From template to decision."
        body="Start from a task that already works, make it about your business, and check it before anyone sees it."
      >
        <HiringFlow catalog={catalog} />
      </Feature>

      <Feature
        id="templates"
        title="Start from a simulation that already works."
        body={
          <>
            <p>
              Every template is a complete task with a starter project, public and protected tests, a reference solution and simulated teammates.
              {catalog.total ? ` ${catalog.total} are validated today, across ${list(catalog.tracks)}.` : ""}
            </p>
            <p>A template is offered only while its current version passes every check. Change it, and it leaves the catalog until it passes again.</p>
          </>
        }
        link={{ href: "/products/simulations", label: "About Simulations" }}
      >
        <SimulationTemplates />
      </Feature>

      <Feature
        id="applications"
        title="Applications that arrive with the work."
        body="Publish a role with its requirements and share the link. Applicants include the projects they choose, and your team reads that evidence requirement by requirement. Invite anyone to a simulation where the evidence runs out."
        link={{ href: "/products/hiring-workspace", label: "About the Hiring Workspace" }}
      >
        <ProductFrame interactive title="Hiring Workspace · Applicants" label="A hiring team's review of one applicant against the role's requirements. Select a requirement to see the evidence.">
          <ApplicantReview />
        </ProductFrame>
      </Feature>

      <SiteFaq
        title="Questions from hiring teams"
        items={[
          { q: "Does Fydell score or rank candidates?", a: "No. Fydell runs the tests and organizes the evidence. Your reviewers read it against your requirements and make the decision." },
          {
            q: "Which roles can I assess?",
            a: catalog.total
              ? `Simulations cover ${list(catalog.tracks)} today. Other engineering tracks are offered once a template for them passes validation. Applications work for any engineering role.`
              : "Applications work for any engineering role. Simulation tracks are offered once their templates pass validation.",
          },
          { q: "Can candidates use AI tools?", a: "You choose the policy for each simulation, and candidates see it before they start. Fydell does not claim to detect AI tools. When the built-in assistant is allowed, its use is recorded and shown to your team." },
          {
            q: "How long does a simulation take?",
            a: `${catalog.total ? `Templates run ${catalog.minMinutes === catalog.maxMinutes ? catalog.minMinutes : `${catalog.minMinutes} to ${catalog.maxMinutes}`} minutes of task time, plus untimed setup. ` : ""}You can set a different length when you adapt a template or upload your own.`,
          },
          { q: "What does it cost?", a: `Applications are never billed. Simulations are ${usd(PRICING.starterPerSimulation)} per completed simulation on Starter, or ${usd(PRICING.teamMonthly)} a month with ${PRICING.teamIncluded} included on Team. Card checkout is not open yet; contact sales to activate a plan.` },
        ]}
      />

      <SiteClosing
        title="Bring one open role."
        body="Create a workspace, choose a simulation template and invite your first candidate."
        primary={{ href: "/signup?as=employer", label: "Create a workspace" }}
        secondary={{ href: "/contact", label: "Contact sales" }}
      />
    </MarketingShell>
  );
}
