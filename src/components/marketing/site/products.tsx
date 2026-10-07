import type { ReactNode } from "react";
import PassportView from "@/components/passport/PassportView";
import BuilderReportDemo from "@/components/marketing/home/BuilderReportDemo";
import { SAMPLE_PASSPORT } from "@/lib/marketing/sample-passport";
import { BACKEND_WEBHOOK_RETRY_V1 as SCENARIO } from "@/lib/eng/scenarios/backend-webhook-retry/definition";
import ProductFrame from "./ProductFrame";
import ProfileWorkspace from "./ProfileWorkspace";
import ApplicantReview from "./ApplicantReview";
import SimulationWorkspace from "./SimulationWorkspace";
import ReleasePanel from "./ReleasePanel";
import { LATEST } from "./releases";
import type { Cta } from "./Sections";

export type ProductSlug = "builder-profiles" | "engineering-passport" | "builder-reports" | "hiring-workspace" | "simulations" | "desktop";

export type ProductPage = {
  name: string;
  title: readonly string[];
  lead: string;
  availability: { state: "available" | "beta" | "preview"; text: string };
  primary: Cta;
  secondary: Cta;
  visual?: ReactNode;
  sections: readonly { title: string; body: string }[];
  limits: readonly string[];
  related: readonly ProductSlug[];
};

export const PRODUCTS: Record<ProductSlug, ProductPage> = {
  "builder-profiles": {
    name: "Builder Profiles",
    title: ["Your projects,", "presented properly."],
    lead: "A Builder Profile holds the projects you want to be known for. Each one says what it is, why it existed, what part was yours, and what the code shows, kept apart so nobody has to guess who did what.",
    availability: { state: "available", text: "Available to every engineer account, free." },
    primary: { href: "/signup", label: "Sign up" },
    secondary: { href: "/demo", label: "Explore the platform" },
    visual: (
      <ProductFrame size="hero" interactive title="Fydell · Passport" label="An engineer's projects, the open project's contribution, and one finding with its cited lines. Select a project or a finding.">
        <ProfileWorkspace />
      </ProductFrame>
    ),
    sections: [
      { title: "Three ways to add a project", body: "Import a public GitHub repository, upload a ZIP of code you're allowed to share, or describe a project in your own words when the code can't leave your employer." },
      { title: "Your part, in your words", body: "Write what you built, what you inherited and who you worked with. It is shown as your statement, never as something Fydell verified." },
      { title: "Featured and private", body: "Feature the projects you lead with. Keep others private; private projects never appear in a share link." },
    ],
    limits: ["Owning a repository does not prove who wrote each line, and the profile never says it does.", "Described projects carry no findings, and are labelled that way."],
    related: ["engineering-passport", "builder-reports"],
  },
  "engineering-passport": {
    name: "Engineering Passport",
    title: ["Share the work", "that's relevant."],
    lead: "The Passport is how your work leaves Fydell. Choose the projects for one recipient, pin the versions, preview exactly what they will see, then send a link you can revoke.",
    availability: { state: "available", text: "Available to every engineer account, free." },
    primary: { href: "/signup", label: "Sign up" },
    secondary: { href: "/demo", label: "Explore a sample Passport" },
    visual: (
      <ProductFrame size="hero" interactive title="Recipient preview" label="A Passport as a recipient sees it. Fictional engineer and project.">
        <div className="max-h-[680px] overflow-y-auto">
          <PassportView passport={SAMPLE_PASSPORT} mode="sample" />
        </div>
      </ProductFrame>
    ),
    sections: [
      { title: "Scoped links", body: "Each link includes only the projects you tick. Pin the versions you shared, or let the link follow your newest analysis." },
      { title: "Recipient preview", body: "See the shared view before anyone else does, rendered with the same rules the link uses." },
      { title: "Expiry and revocation", body: "Set an expiry, or revoke a link at any time. Applying to a role uses the same choice of projects." },
    ],
    limits: ["Revoking stops the link, but copies someone already saved cannot be recalled.", "A Passport describes the work shared in it and nothing beyond it."],
    related: ["builder-profiles", "hiring-workspace"],
  },
  "builder-reports": {
    name: "Builder Reports",
    title: ["Findings you can", "check line by line."],
    lead: "A Builder Report reads a project at a fixed revision and lists what the code shows. Every finding opens the lines it cites and states what it can't tell you.",
    availability: { state: "available", text: "Available for imported repositories and uploaded source." },
    primary: { href: "/signup", label: "Sign up" },
    secondary: { href: "/demo", label: "Open the sample report" },
    visual: (
      <ProductFrame size="hero" interactive title="Builder Report" label="A Builder Report for a fictional project. Select a finding to see the lines it cites and its limits.">
        <BuilderReportDemo />
      </ProductFrame>
    ),
    sections: [
      { title: "Cited, at a revision", body: "Findings link to a file and line range at the commit that was read, so everyone refers to the same code." },
      { title: "Coverage stated", body: "How many files were read, which were skipped and why: vendored code, lockfiles, binaries." },
      { title: "Labelled by basis", body: "Observations from the code, the engineer's statements and reviewers' judgments are labelled separately. Correct a finding and your note appears beside it." },
    ],
    limits: ["Tests are read, not run.", "A report does not judge seniority, predict performance, or detect AI use."],
    related: ["builder-profiles", "engineering-passport"],
  },
  "hiring-workspace": {
    name: "Hiring Workspace",
    title: ["Applicants and evidence,", "in one place."],
    lead: "Publish a role with its requirements and one application link. Engineers apply with the projects they choose, and your team reviews each application requirement by requirement.",
    availability: { state: "available", text: "Available to employer accounts. Applying never costs engineers anything." },
    primary: { href: "/signup?as=employer", label: "Create a role" },
    secondary: { href: "/contact", label: "Contact sales" },
    visual: (
      <ProductFrame size="hero" interactive title="Hiring Workspace · Applicants" label="A hiring team's review of one applicant against the role's requirements. Select a requirement to see the evidence.">
        <ApplicantReview />
      </ProductFrame>
    ),
    sections: [
      { title: "One link per role", body: "A public role page lists the requirements. Applications arrive with the projects each engineer chose to share, at pinned versions." },
      { title: "Requirement by requirement", body: "Mark each requirement as supported, not yet enough, or not covered, with the finding that supports your reading." },
      { title: "Ask for what's missing", body: "Send a question tied to a requirement, or invite the applicant to a simulation. Decisions are recorded by your team and are not sent to the applicant." },
    ],
    limits: ["No evidence on a requirement is not evidence against the applicant.", "Fydell does not rank, score or filter applicants."],
    related: ["simulations", "engineering-passport"],
  },
  simulations: {
    name: "Simulations",
    title: ["Work samples for", "the questions left open."],
    lead: "A simulation is a short, disclosed piece of engineering work: a small codebase, a brief, simulated teammates to ask, and a stated time. Employers use one when shared projects don't cover a requirement.",
    availability: { state: "available", text: `Available by employer invitation. Today's scenario: ${SCENARIO.title} (backend, Python).` },
    primary: { href: "/signup?as=employer", label: "Create a role" },
    secondary: { href: "/developers", label: "What engineers can expect" },
    visual: (
      <ProductFrame size="hero" tag="Preview" title="Simulation · Webhook retry incident" label="A candidate's simulation: the brief and requirements, the project files, a public test run, and the team thread docked beside the brief.">
        <SimulationWorkspace />
      </ProductFrame>
    ),
    sections: [
      { title: "Disclosed before you start", body: `The brief, the time (${SCENARIO.defaultAllowedMinutes} minutes for about ${SCENARIO.targetMinutes} of work), the AI tool policy and what is recorded are shown first. Setup time does not count.` },
      { title: "A team to ask", body: "Simulated teammates reply from the scenario's facts, and every candidate gets the same answers. About 20 minutes in, the team posts one requirement update." },
      { title: "Checks after submission", body: "Fydell runs its checks on the submitted code. Reviewers read the results with the handoff and write their own findings." },
    ],
    limits: ["Fydell cannot observe AI tools and does not claim to detect them.", "One scenario is live today. More engineering scenarios are in development and are not listed until they are ready."],
    related: ["hiring-workspace", "desktop"],
  },
  desktop: {
    name: "Desktop",
    title: ["Fydell on", "your computer."],
    lead: "Fydell Desktop opens invited simulations in a workspace on your computer: an editor with the brief, tests and team thread beside the code. Sign-in hands off from your browser, and your Passport is in the app too.",
    availability: { state: "beta", text: `Beta. Version ${LATEST.version}, unsigned test builds for macOS, Windows and Linux.` },
    primary: { href: "/download", label: "Download Fydell" },
    secondary: { href: "/changelog", label: "Read the changelog" },
    visual: <ReleasePanel />,
    sections: [
      { title: "An editor, not a form", body: "The workspace puts the brief, public tests, team thread and submission beside the code, with a command palette and keyboard shortcuts." },
      { title: "Browser sign-in", body: "Sign-in completes in your browser and hands back to the app. Opening a Fydell link focuses the running app." },
      { title: "Optional", body: "Nothing requires the desktop app. Every invitation also works in the browser." },
    ],
    limits: ["Builds are not yet code-signed: macOS and Windows warn on first launch.", "There are no automatic updates yet. Install new versions from the download page."],
    related: ["simulations", "builder-profiles"],
  },
};

export const PRODUCT_SLUGS = Object.keys(PRODUCTS) as ProductSlug[];
