import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import PassportView from "@/components/passport/PassportView";
import BuilderReportDemo from "@/components/marketing/home/BuilderReportDemo";
import { Closing, Details, Faq, Hero, Ledger, Section, SectionHead, Stage, Statement, Timeline, Trio, Visual } from "@/components/marketing/kit/Kit";
import { FigDecide, FigPassport, FigReport } from "@/components/marketing/kit/Figs";
import { BriefShot, ReportShot } from "@/components/marketing/kit/Shots";
import { SAMPLE_PASSPORT } from "@/lib/marketing/sample-passport";

export const metadata = {
  title: { absolute: "Fydell: Engineering careers, backed by real work" },
  description:
    "Engineers turn selected projects into a shareable Passport, with findings linked to the source. Hiring teams review that evidence against the role.",
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "Can I use private or employer code?",
    a: "You can upload a ZIP of a project you are allowed to share. It is analyzed the same way as a public repository and labelled as uploaded source, with no public link to the code. For work you can't share at all, describe the project in your own words; recipients see it labelled as your description, with no source analyzed.",
  },
  {
    q: "I don't have a public GitHub portfolio. Can I still use Fydell?",
    a: "Yes. Upload a project as a ZIP, describe projects in your own words, or accept an employer's invitation and take a simulation without any repositories. Having no public code is never counted against you.",
  },
  {
    q: "How is AI used?",
    a: "Findings come from reading the code in the files listed in each report. Where a language model writes a summary, the report says so. In simulations, the tool policy is shown before you start, and you describe any AI help in your own words; Fydell cannot see the tools you use.",
  },
  {
    q: "What if a finding is wrong?",
    a: "Flag it as inaccurate, add context, or propose a different reading. Your note is attributed to you and shown next to the finding. The original stays visible, so nobody mistakes your statement for a verified fact.",
  },
  {
    q: "What can an employer see?",
    a: "Only what you put in a share link: the projects you chose, at the versions you chose. You can see each link's scope, set an expiry, and revoke it. Revoking stops the link and any review built on it, but copies someone already saved cannot be recalled.",
  },
  {
    q: "What is a simulation?",
    a: "A disclosed work sample: a small working codebase, a brief, and a stated time and scope. Before you begin, you see exactly what is recorded, what the employer receives, and what you get back. Employers only ask for one when they want evidence your projects don't cover.",
  },
  {
    q: "Are there jobs on Fydell?",
    a: "There is no public job board yet. Roles reach you as invitations from the hiring teams that use Fydell. We will not show listings that aren't real.",
  },
] as const;

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero
        title={["Show what you've built.", "See what someone can do."]}
        lead="Engineers turn selected projects into a shareable Passport, with findings linked to the source. Hiring teams review that evidence against the role."
        actions={
          <>
            <Link href="/passport/new" className="l-btn l-btn-lg l-btn-solid">Build your Passport</Link>
            <Link href="/demo" className="l-btn l-btn-lg l-btn-ghost">Explore the demo</Link>
          </>
        }
        note={{ href: "/signup?as=employer", label: "Hiring? Create a role" }}
      >
        <Stage
          hero
          interactive
          art="lake"
          title="Builder Report · example data"
          label="Example Builder Report for a fictional project. Select a finding to see the source lines it cites."
          caption={
            <>
              From a project to a hiring conversation. <Link href="/demo">Explore a sample Builder Report</Link>.
            </>
          }
        >
          <BuilderReportDemo />
        </Stage>
      </Hero>

      <Section id="context" labelledBy="context-title">
        <SectionHead
          id="context-title"
          title={["Give your work the context", "a résumé can't."]}
          lead="A finding says what the code does at one revision. Your contribution says what you did. Fydell keeps the two apart, so team projects are shown honestly and nobody has to guess who wrote what."
        />
        <Details
          items={[
            { title: "The problem", body: "What the project needed to do, in your words, next to the code that does it." },
            { title: "Your contribution", body: "What you built, what you inherited, and who you worked with. Shown as your statement, not as a verified fact." },
            { title: "The source", body: "Each finding opens the exact lines it cites, at a fixed commit." },
            { title: "What was not assessed", body: "Files that were skipped, tests that were read but not run, and questions the code can't answer." },
          ]}
        />
      </Section>

      <Section id="passport" labelledBy="passport-title">
        <SectionHead
          id="passport-title"
          title={["A Passport built from", "work you choose."]}
          lead="Pick the projects that matter, add your context, and preview exactly what a recipient will see before you send a link."
          link={{ href: "/demo", label: "Explore a Passport" }}
        />
        <Visual interactive art="coast" title="Passport · recipient preview" label="Example Passport, as a recipient sees it. Fictional engineer and project.">
          <PassportView passport={SAMPLE_PASSPORT} mode="sample" />
        </Visual>
        <Trio
          items={[
            { fig: <FigPassport />, title: "Selected projects", body: "Only the repositories you add, each analyzed at a commit you can see." },
            { fig: <FigReport />, title: "Evidence with sources", body: "Findings linked to files and line ranges, with their limits stated beside them." },
            { fig: <FigDecide />, title: "Recipient preview", body: "See the shared view before anyone else does, with the same rules the link uses." },
          ]}
        />
      </Section>

      <Section id="review" labelledBy="review-title">
        <SectionHead
          id="review-title"
          title={["One role. One application link.", "A clearer review."]}
          lead="A hiring team publishes a role page with its requirements. Engineers apply by choosing which Passport projects to share, and the team reviews each application requirement by requirement: supporting evidence, not yet enough, nothing shared, or an open concern."
          link={{ href: "/employers", label: "Fydell for hiring teams" }}
        />
        <Visual art="coast" title="Fydell · Review" label="Example: a reviewer's cited findings and the decision the team recorded">
          <ReportShot />
        </Visual>
      </Section>

      <Section id="follow-up" labelledBy="follow-up-title">
        <SectionHead
          id="follow-up-title"
          title={["Ask for the evidence", "you still need."]}
          lead="When a requirement isn't covered, a reviewer can ask the engineer a question tied to it, or invite them to a short simulation. The purpose, expected time and tool policy are shown before anyone is asked to begin."
          link={{ href: "/how-it-works", label: "How follow-ups work" }}
        />
        <Visual art="hills" title="Fydell Desktop · Simulation brief" label="Example: a simulation brief, with scope and expected time shown up front">
          <BriefShot />
        </Visual>
      </Section>

      <Section id="basis" labelledBy="basis-title">
        <SectionHead
          id="basis-title"
          title={["Know what each finding", "is based on."]}
          lead="Every finding shows the excerpt, the revision, how much of the project was read, and what it can't tell you. Observations, engineer statements and reviewer judgments are labelled separately."
          link={{ href: "/trust", label: "How evidence is labelled" }}
        />
        <Timeline
          items={[
            { title: "Observation", body: "What the code at this commit does, with the lines cited.", meta: "From the code" },
            { title: "Engineer statement", body: "Context or a correction from the person who shared the work.", meta: "Attributed", tone: "blue" },
            { title: "Reviewer judgment", body: "Whether a finding supports a requirement, written and signed by a reviewer.", meta: "Attributed" },
            { title: "Limits", body: "Skipped files, unrun tests and open questions, in the normal reading path.", meta: "Always shown", tone: "red" },
          ]}
        />
      </Section>

      <Section id="sharing" labelledBy="sharing-title">
        <SectionHead
          id="sharing-title"
          title={["Choose what", "you share."]}
          lead="Your Passport is private until you create a link. Each link has its own scope, and you stay in control of it."
          link={{ href: "/privacy", label: "Read the privacy policy" }}
        />
        <Ledger
          yes={{
            title: "What you control",
            items: [
              { strong: "Which projects.", rest: "Each link includes only the projects you tick." },
              { strong: "Which versions.", rest: "Pin the versions you shared, or let the link follow your newest analysis." },
              { strong: "How long.", rest: "Set an expiry, or revoke the link at any time." },
              { strong: "Your data.", rest: "Download everything in your Passport as one file." },
            ],
          }}
          no={{
            title: "What Fydell won't claim",
            items: [
              { strong: "Recalling copies.", rest: "Revoking stops the link, but copies someone already saved can't be erased." },
              { strong: "Proving authorship.", rest: "Owning a repository doesn't prove who wrote each line." },
              { strong: "Scoring people.", rest: "There is no overall rating, rank or fit score." },
              { strong: "Predicting performance.", rest: "A report describes this work and nothing beyond it." },
            ],
          }}
        />
      </Section>

      <Section id="vision">
        <Statement
          lead="We're building the proof-of-work network for engineering."
          rest="One Passport you keep, reused with every team you choose to share it with, and evidence that hiring teams can actually check."
        />
      </Section>

      <Section id="faq" labelledBy="faq-title">
        <SectionHead id="faq-title" title={["Questions"]} />
        <Faq items={FAQ} />
      </Section>

      <Closing
        title={["Build your Passport.", "Bring your work into the conversation."]}
        primary={{ href: "/passport/new", label: "Build your Passport" }}
        secondary={{ href: "/signup?as=employer", label: "Hiring? Create a role" }}
      />
    </MarketingShell>
  );
}
