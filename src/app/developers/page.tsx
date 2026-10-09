import MarketingShell from "@/components/layout/MarketingShell";
import PassportView from "@/components/passport/PassportView";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import TintStage from "@/components/marketing/site/TintStage";
import ProfileWorkspace from "@/components/marketing/site/ProfileWorkspace";
import SimulationWorkspace from "@/components/marketing/site/SimulationWorkspace";
import { Feature, SiteClosing, SiteFaq, SiteHero } from "@/components/marketing/site/Sections";
import { BACKEND_WEBHOOK_RETRY_V1 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition";
import { SAMPLE_PASSPORT } from "@/lib/marketing/sample-passport";

export const metadata = {
  title: "For Engineers",
  description: "Present your projects with the evidence behind them, share exactly what you choose, and apply to roles with your work. Free for engineers.",
  alternates: { canonical: "/developers" },
};

export default function DevelopersPage() {
  return (
    <MarketingShell>
      <SiteHero
        title={["Show the work", "behind your resume."]}
        lead="Bring your projects, contributions, and source-linked findings into one profile. Choose what to share."
        primary={{ href: "/signup", label: "Sign up" }}
        supporting={{ href: "/download", label: "Download Fydell" }}
      >
        <TintStage tint="teal">
          <ProductFrame size="hero" interactive title="Fydell · Passport" label="One project in an engineer's Passport: its purpose, their part, and a finding opened to the source lines it cites. Select a highlight to open it.">
            <ProfileWorkspace />
          </ProductFrame>
        </TintStage>
      </SiteHero>

      <Feature
        id="projects"
        layout="text"
        title="Start with the work you already have."
        body="Add a project in a minute. Fydell reads public and uploaded code at a fixed revision and links every finding to its lines. Work you can't share can still be described, clearly labelled as your description."
        link={{ href: "/products/builder-profiles", label: "About Builder Profiles" }}
        points={[
          { title: "Import from GitHub", body: "Up to three public repositories at a time, each read at a commit you can see." },
          { title: "Upload a ZIP", body: "For code you're allowed to share privately. No public link to the source." },
          { title: "Describe it", body: "For employer or confidential work. What you built and what changed, in your words." },
        ]}
      />

      <Feature
        id="sharing"
        layout="split"
        title="Share on your terms."
        body={
          <>
            <p>Nothing leaves your account until you create a link or apply. Each link includes only the projects you tick, at the versions you pin.</p>
            <p>Preview what the recipient sees, set an expiry, and revoke the link whenever you like.</p>
          </>
        }
        link={{ href: "/products/engineering-passport", label: "About the Engineering Passport" }}
      >
        <ProductFrame interactive title="Recipient preview" label="A Passport as a recipient sees it. Fictional engineer and project.">
          <div className="max-h-[560px] overflow-y-auto">
            <PassportView passport={SAMPLE_PASSPORT} mode="sample" />
          </div>
        </ProductFrame>
      </Feature>

      <Feature
        id="applying"
        layout="text"
        title="Apply with your work, not just a resume."
        body="When a hiring team shares a role link, apply by choosing which projects to include. The team reads them against the role's requirements. If something isn't covered, they can ask you a question tied to that requirement or invite you to a simulation."
        points={[
          { title: "Your choice of projects", body: "Each application carries only the projects you select for it." },
          { title: "No hidden score", body: "There is no overall rating or rank. Reviewers record their own reading." },
          { title: "Always free", body: "Applying, invitations and simulations never cost engineers anything." },
        ]}
      />

      <Feature
        id="simulations"
        title="Simulations, disclosed up front."
        tint="blue"
        body={`If you're invited to a simulation, you see the brief, the time (${SCENARIO.defaultAllowedMinutes} minutes for about ${SCENARIO.targetMinutes} of work), the AI tool policy and what is recorded before anything starts. Setup time doesn't count, and asking the team questions is optional.`}
        link={{ href: "/products/simulations", label: "About Simulations" }}
      >
        <ProductFrame tag="Preview" title="Simulation · Webhook retry incident" label="A candidate's simulation: the brief and requirements, the project files, a public test run, and the team thread docked beside the brief.">
          <SimulationWorkspace />
        </ProductFrame>
      </Feature>

      <SiteFaq
        title="Questions from engineers"
        items={[
          { q: "Do I pay anything?", a: "No. Your profile, Passport, reports, applications and simulations are free. A Pro plan is in preview and will never be required to apply." },
          { q: "Can I use AI tools in a simulation?", a: "Yes, the same way you would at work, unless the brief says otherwise. Fydell cannot see your tools and does not try to detect them. You describe any AI help in your own words." },
          { q: "What if a finding about my code is wrong?", a: "Flag it, add context, or propose a different reading. Your note is attributed to you and shown next to the finding; the original stays visible." },
          { q: "Do I need the desktop app?", a: "No. Everything works in the browser. The desktop app is an option for working simulations in a local workspace." },
        ]}
      />

      <SiteClosing
        title="Put your work where it can be seen."
        body="Create your profile and add your first project."
        primary={{ href: "/signup", label: "Sign up" }}
        secondary={{ href: "/download", label: "Download Fydell" }}
      />
    </MarketingShell>
  );
}
