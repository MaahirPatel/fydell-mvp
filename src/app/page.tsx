import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { Closing, Hero, Ledger, Section, SectionHead, Statement, Timeline, Trio } from "@/components/marketing/kit/Kit";
import { FigDecide, FigIncident, FigTrail } from "@/components/marketing/kit/Figs";
import {
  BriefPicture,
  ChecksPicture,
  Feature,
  HeroFlow,
  PassportPicture,
  ReportPicture,
  TrailPicture,
} from "@/components/marketing/kit/Plain";

export const metadata = {
  title: { absolute: "Fydell: The hiring system built on real engineering work" },
  description:
    "Bring together project evidence and realistic simulations. Engineers show their skills; hiring teams review cited evidence and find their next engineer.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero
        title={["The hiring system built on", "real engineering work."]}
        lead="Bring together project evidence and realistic simulations. Show your skills. Find your next engineer."
        aside={{ href: "/download", strong: "New", label: "Fydell desktop 0.1.5" }}
        actions={
          <>
            <Link href="/get-started" className="l-btn l-btn-lg l-btn-solid">Get started</Link>
            <Link href="/demo" className="l-btn l-btn-lg l-btn-ghost">Explore demo</Link>
          </>
        }
      >
        <HeroFlow />
      </Hero>

      <Section>
        <Statement
          lead="A resume tells you where someone has worked."
          rest="Fydell shows you how they work: what they ask, what they change, how they test it, and what they do when the requirement moves."
        />
        <Trio
          items={[
            {
              fig: <FigIncident />,
              title: "A real incident, not a puzzle",
              body: "A working repository with a production-style failure and a brief from the team that owns it.",
            },
            {
              fig: <FigTrail />,
              title: "Every step on the record",
              body: "Files, commands, test runs and timing, disclosed to the candidate before they begin.",
            },
            {
              fig: <FigDecide />,
              title: "Your team makes the call",
              body: "Fydell never scores the person. Your reviewers write the report and record the decision.",
            },
          ]}
        />
      </Section>

      <Feature
        id="brief"
        title="Start from a real incident"
        lead="The candidate gets what an engineer on your team would get: a brief, a codebase that runs, and teammates who answer questions. Halfway through, the requirement changes."
        points={[
          "A small service with a real bug and real tests",
          "Teammates who answer, the same way for everyone",
          "One requirement update, the way scope moves at work",
        ]}
        link={{ href: "/product#brief", label: "How a simulation runs" }}
      >
        <BriefPicture />
      </Feature>

      <Feature
        id="trail"
        flip
        title="Every step, on the record"
        lead="The desktop app keeps a work trail: the files they open and change, the commands they run, their tests, and when each happened. The candidate sees the list before they start."
        link={{ href: "/trust", label: "What is and isn't recorded" }}
      >
        <TrailPicture />
      </Feature>

      <Feature
        id="checks"
        title="Checked on the code they sent"
        lead="When the candidate sends their work, it is sealed and run against hidden checks in a clean sandbox. The result is the same no matter whose laptop it was written on."
        link={{ href: "/security", label: "How submissions are handled" }}
      >
        <ChecksPicture />
      </Feature>

      <Feature
        id="report"
        flip
        title="A report your team can stand behind"
        lead="Your reviewers write the findings, and each one must point to a file, a test or a message before the report can be released. There is no score."
        link={{ href: "/employers", label: "Fydell for hiring teams" }}
      >
        <ReportPicture />
      </Feature>

      <Section id="loop" labelledBy="loop-title">
        <SectionHead
          id="loop-title"
          title={["One loop, from role", "to decision"]}
          lead="The whole process is five steps. Candidates always know what comes next, and your team always knows why a decision was made."
        />
        <Timeline
          items={[
            { title: "Create a role", body: "Pick the simulation that fits the job and invite candidates by email.", meta: "Your team" },
            { title: "Consent", body: "The candidate reads what is recorded and agrees before anything starts.", meta: "Candidate", tone: "blue" },
            { title: "Work the incident", body: "In the desktop app, with one requirement update along the way.", meta: "About an hour", tone: "red" },
            { title: "Submit and hand off", body: "Three short answers and a receipt the candidate keeps.", meta: "Candidate" },
            { title: "Review and decide", body: "A cited report, then Advance, Hold or Decline.", meta: "Your team", tone: "blue" },
          ]}
        />
      </Section>

      <Feature
        id="passport"
        title="Engineers keep their work"
        lead="Every engineer gets a receipt for what they sent. They can also build an Engineering Passport from their own public code: findings linked to the exact lines, private until they share a link."
        points={["Free for engineers", "Built from public GitHub projects", "You choose who sees it, and can turn a link off"]}
        link={{ href: "/passport/new", label: "Build your passport" }}
      >
        <PassportPicture />
      </Feature>

      <Section id="boundaries" labelledBy="boundaries-title">
        <SectionHead
          id="boundaries-title"
          title={["Clear about what", "it will not do"]}
          lead="Hiring is a decision about a person. Fydell gives your team evidence and stays out of the judgement."
          link={{ href: "/trust", label: "Read the trust page" }}
        />
        <Ledger
          yes={{
            title: "What Fydell does",
            items: [
              { strong: "Records a disclosed trail.", rest: "Files, commands, test runs and timing, listed before the candidate starts." },
              { strong: "Runs hidden checks.", rest: "On the submitted snapshot, in an isolated sandbox." },
              { strong: "Requires citations.", rest: "A finding without evidence cannot be released." },
              { strong: "Gives the candidate a receipt.", rest: "With a checksum of exactly what they submitted." },
            ],
          }}
          no={{
            title: "What Fydell never does",
            items: [
              { strong: "Score or rank people.", rest: "There is no overall rating, percentile or fit score." },
              { strong: "Forecast future performance.", rest: "The report describes this work and nothing beyond it." },
              { strong: "Police AI use.", rest: "Fydell can't see AI tools. Candidates describe any AI help in their own words." },
              { strong: "Record outside the list.", rest: "No screen, webcam, microphone, browsing or keystrokes." },
            ],
          }}
        />
      </Section>

      <Closing title={["Hire on the work.", "Start with one role."]} />
    </MarketingShell>
  );
}
