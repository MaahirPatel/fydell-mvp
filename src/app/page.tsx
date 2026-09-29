import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import EvaluationShot from "@/components/marketing/kit/EvaluationShot";
import {
  Closing,
  Details,
  Hero,
  Ledger,
  Section,
  SectionHead,
  Stage,
  Statement,
  Timeline,
  Trio,
  Visual,
} from "@/components/marketing/kit/Kit";
import { FigDecide, FigDesktop, FigIncident, FigPassport, FigReport, FigTrail } from "@/components/marketing/kit/Figs";
import { BriefShot, ReportShot, TestsShot, TrailShot } from "@/components/marketing/kit/Shots";

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
        aside={{ href: "/download", strong: "New", label: "Fydell desktop 0.1.4" }}
        actions={
          <>
            <Link href="/get-started" className="l-btn l-btn-lg l-btn-solid">Get started</Link>
            <Link href="/demo" className="l-btn l-btn-lg l-btn-ghost">Explore demo</Link>
          </>
        }
      >
        <Stage hero art="lake" title="Fydell · Evaluation FYD-2048" label="Example: an evaluation in the Fydell employer workspace">
          <EvaluationShot />
        </Stage>
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

      <Section id="brief" labelledBy="brief-title">
        <SectionHead
          id="brief-title"
          title={["Start from a real", "incident"]}
          lead="The candidate gets what an engineer on your team would get: an incident brief, a codebase that runs, and teammates who answer questions. Halfway through, the requirement changes."
          link={{ href: "/product#brief", label: "How a simulation runs" }}
        />
        <Visual art="coast" title="Fydell Desktop · INC-2291" label="Example: the INC-2291 brief and the team thread">
          <BriefShot />
        </Visual>
        <Details
          items={[
            { title: "Working code", body: "A small service with a real bug, real tests, and a setup check that runs first." },
            { title: "Teammates who answer", body: "Written answers, the same for every candidate. Asking is optional and never penalised." },
            { title: "One requirement update", body: "Posted by the team partway through, the way scope actually moves at work." },
          ]}
        />
      </Section>

      <Section id="trail" labelledBy="trail-title">
        <SectionHead
          id="trail-title"
          title={["Every step,", "on the record"]}
          lead="The desktop app records a disclosed work trail: the files they open and change, the commands they run, their test results and when each happened. Nothing outside that list."
          link={{ href: "/trust", label: "What is and isn't recorded" }}
        />
        <Visual art="hills" title="Fydell Desktop · Work trail" label="Example: a candidate's work trail and the notice they accepted">
          <TrailShot />
        </Visual>
      </Section>

      <Section id="checks" labelledBy="checks-title">
        <SectionHead
          id="checks-title"
          title={["Checked on the code", "they submitted"]}
          lead="On submit, the project is sealed with a checksum and run against hidden checks in an isolated sandbox. The result is the same no matter whose laptop it was written on."
          link={{ href: "/security", label: "How submissions are handled" }}
        />
        <Visual art="lake" title="Fydell · Hidden checks" label="Example: hidden checks run against a submitted snapshot">
          <TestsShot />
        </Visual>
      </Section>

      <Section id="report" labelledBy="report-title">
        <SectionHead
          id="report-title"
          title={["A report your team", "can stand behind"]}
          lead="Your reviewers write the findings. Each one must cite a file, a test, a message or a handoff answer before the report can be released. Observations and gaps are labelled, and there is no score."
          link={{ href: "/employers", label: "Fydell for hiring teams" }}
        />
        <Visual art="coast" title="Fydell · Report" label="Example: a cited report with the team's decision">
          <ReportShot />
        </Visual>
      </Section>

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

      <Section id="passport" labelledBy="passport-title">
        <SectionHead
          id="passport-title"
          title={["Engineers keep", "their work"]}
          lead="Every engineer gets a receipt for what they submitted, and can build an Engineering Passport from their own public repositories: findings linked to the exact lines, shared only with the employers they choose."
          link={{ href: "/passport/new", label: "Build your passport" }}
        />
        <Trio
          items={[
            { fig: <FigPassport />, title: "A passport you own", body: "Built from your public repositories at a pinned commit. Free for engineers." },
            { fig: <FigReport />, title: "Findings with line citations", body: "What the code demonstrates, linked to files and line ranges." },
            { fig: <FigDesktop />, title: "Simulations on your machine", body: "The Fydell desktop app for macOS and Windows sets up each project." },
          ]}
        />
      </Section>

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
