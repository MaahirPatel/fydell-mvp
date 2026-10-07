import MarketingShell from "@/components/layout/MarketingShell";
import PassportView from "@/components/passport/PassportView";
import BuilderReportDemo from "@/components/marketing/home/BuilderReportDemo";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import ProfileWorkspace from "@/components/marketing/site/ProfileWorkspace";
import ApplicantReview from "@/components/marketing/site/ApplicantReview";
import SimulationWorkspace from "@/components/marketing/site/SimulationWorkspace";
import { Feature, SiteClosing, SiteFaq, SiteHero } from "@/components/marketing/site/Sections";
import { LATEST } from "@/components/marketing/site/releases";
import { SAMPLE_PASSPORT } from "@/lib/marketing/sample-passport";

export const metadata = {
  title: { absolute: "Fydell: Engineering work, ready to be seen" },
  description:
    "Bring your projects, contributions and technical evidence into one Passport. Share your work, apply to roles, and give hiring teams a clearer view of what you've built.",
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "I don't have a public GitHub portfolio. Can I still use Fydell?",
    a: "Yes. Upload a project as a ZIP, describe a project in your own words, or accept an employer's invitation and take a simulation without any repositories. Having no public code is never counted against you.",
  },
  {
    q: "What can an employer see?",
    a: "Only what you put in a share link or an application: the projects you chose, at the versions you chose. You can see each link's scope, set an expiry and revoke it. Copies someone already saved cannot be recalled.",
  },
  {
    q: "How is AI used?",
    a: "Findings come from reading the code in the files each report lists. Where a language model writes a summary, the report says so. In simulations the tool policy is shown before you start, and you describe any AI help in your own words; Fydell cannot see the tools you use.",
  },
  {
    q: "Does Fydell score or rank engineers?",
    a: "No. There is no overall rating, rank or fit score. Reviewers read evidence against their own requirements and record their own decisions.",
  },
] as const;

export default function HomePage() {
  return (
    <MarketingShell>
      <SiteHero
        announcement={{ href: "/changelog", label: `Fydell Desktop ${LATEST.version} for macOS, Windows and Linux` }}
        title={["Engineering work.", "Ready to be seen."]}
        lead="Bring your projects, contributions, and technical evidence into one Passport. Share your work, apply to roles, and give hiring teams a clearer view of what you've built."
        primary={{ href: "/signup", label: "Sign up" }}
        secondary={{ href: "/demo", label: "Explore the platform" }}
        supporting={{ href: "/download", label: "Download Fydell" }}
      >
        <ProductFrame
          size="hero"
          interactive
          title="Fydell · Passport"
          label="An engineer's Passport: selected projects, the open project's contribution, and one finding with the source lines it cites. Select a project or a finding."
          caption="A fictional engineer and projects. Select a project or a finding."
        >
          <ProfileWorkspace />
        </ProductFrame>
      </SiteHero>

      <Feature
        id="projects"
        layout="text"
        title="Give your projects a professional home."
        body={
          <>
            <p>Add the work you want to be known for, from a public repository, an uploaded ZIP, or a description in your own words. Each project says what it is, why it existed, and what part was yours.</p>
            <p>Team work stays honest. Your contribution is shown as your statement, separate from anything read from the code.</p>
          </>
        }
        link={{ href: "/products/builder-profiles", label: "About Builder Profiles" }}
        points={[
          { title: "Public repository", body: "Read at a commit you can see. Findings link to the exact lines." },
          { title: "Uploaded source", body: "For code you may share privately. Analyzed the same way, with no public link." },
          { title: "Described project", body: "For work you can't share. Labelled as your description, with no source analyzed." },
        ]}
      />

      <Feature
        id="reports"
        title="See the evidence behind each finding."
        body="A Builder Report lists what the code shows, one finding at a time. Each finding opens the lines it cites, the revision it was read at, and what it can't tell you: skipped files, tests that were read but not run, questions the code leaves open."
        link={{ href: "/products/builder-reports", label: "About Builder Reports" }}
      >
        <ProductFrame interactive title="Builder Report" label="A Builder Report for a fictional project. Select a finding to see the lines it cites and its limits.">
          <BuilderReportDemo />
        </ProductFrame>
      </Feature>

      <Feature
        id="passport"
        layout="split"
        flip
        title="Choose the work you share."
        body={
          <>
            <p>Your Passport is private until you create a link. Each link carries only the projects you tick, at the versions you pin, with an expiry if you want one.</p>
            <p>Preview exactly what a recipient will see before you send it, and revoke the link at any time.</p>
          </>
        }
        link={{ href: "/products/engineering-passport", label: "About the Engineering Passport" }}
      >
        <ProductFrame interactive title="Recipient preview" label="A Passport as a recipient sees it. Fictional engineer and project.">
          <div className="max-h-[620px] overflow-y-auto">
            <PassportView passport={SAMPLE_PASSPORT} mode="sample" />
          </div>
        </ProductFrame>
      </Feature>

      <Feature
        id="employers"
        title="Bring applicants and evidence into one workspace."
        body="Publish a role with its requirements and one application link. Engineers apply by choosing which projects to share. Your team reads each application requirement by requirement: supporting evidence, not yet enough, or nothing shared, and records its own decision."
        link={{ href: "/products/hiring-workspace", label: "About the Hiring Workspace" }}
      >
        <ProductFrame interactive title="Hiring Workspace · Applicants" label="A hiring team's review of one applicant against the role's requirements. Select a requirement to see the evidence.">
          <ApplicantReview />
        </ProductFrame>
      </Feature>

      <Feature
        id="simulations"
        title="Explore the questions the existing work leaves open."
        body="When a requirement isn't covered, invite the engineer to a short simulation: a small working codebase, a brief, a simulated team to ask, and a stated time. The engineer sees what is recorded, and what you receive, before starting."
        link={{ href: "/products/simulations", label: "About Simulations" }}
      >
        <ProductFrame tag="Preview" title="Simulation · Webhook retry incident" label="A candidate's simulation: the brief and requirements, the project files, a public test run, and the team thread docked beside the brief.">
          <SimulationWorkspace />
        </ProductFrame>
      </Feature>

      <Feature
        id="desktop"
        layout="text"
        title="Keep your work connected."
        body={
          <>
            <p>Fydell Desktop opens an invited simulation in a workspace on your computer: an editor with the brief, tests and team thread beside the code, and submission from the same window. Sign-in hands off from your browser, and your Passport is in the app too.</p>
            <p>The desktop app is optional. Everything works in the browser.</p>
          </>
        }
        link={{ href: "/download", label: `Download Fydell ${LATEST.version}` }}
        points={[
          { title: "macOS", body: "Apple silicon." },
          { title: "Windows", body: "64-bit, Windows 10 and 11." },
          { title: "Linux", body: "64-bit AppImage, .deb and .rpm." },
        ]}
      />

      <SiteFaq items={FAQ} />

      <SiteClosing
        title="Bring your work into the conversation."
        body="Free for engineers. Hiring teams can start with one role."
        primary={{ href: "/signup", label: "Sign up" }}
        secondary={{ href: "/contact", label: "Contact sales" }}
      />
    </MarketingShell>
  );
}
