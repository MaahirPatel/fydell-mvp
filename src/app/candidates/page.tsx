import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import {
  Closing,
  Details,
  Faq,
  Hero,
  Section,
  SectionHead,
  Stage,
  Statement,
  Trio,
} from "@/components/marketing/kit/Kit";
import { FigConsent, FigDesktop, FigIncident, FigReport } from "@/components/marketing/kit/Figs";
import { BriefShot } from "@/components/marketing/kit/Shots";

export const metadata = {
  title: "For engineers",
  description:
    "Show your work, not just your work history. Complete realistic simulations and control what you share.",
  alternates: { canonical: "/candidates" },
};

export default function CandidatesPage() {
  return (
    <MarketingShell>
      <Hero
        title={["Show your work,", "not just your work history"]}
        lead="Fydell simulations are short, realistic work samples for applied technical roles. You investigate, decide, and explain, then keep control of what you share."
        aside={{ href: "/download", strong: "Download", label: "Fydell for macOS and Windows" }}
        actions={
          <>
            <Link href="/signup" className="l-btn l-btn-lg l-btn-solid">Create an account</Link>
            <Link href="/trust" className="l-btn l-btn-lg l-btn-ghost">What is recorded</Link>
          </>
        }
      >
        <Stage hero label="Example: the incident brief and the team thread">
          <BriefShot />
        </Stage>
      </Hero>

      <Section>
        <Statement
          lead="No whiteboard, no trick questions, no one watching."
          rest="Just a codebase with a real problem, a team that answers when you ask, and time to do what you would do at work."
        />
        <Trio
          items={[
            { fig: <FigIncident />, title: "What the simulation contains", body: "A clear mission, real materials (data, docs, tickets), a stakeholder you can question, and a short timer. Work autosaves." },
            { fig: <FigDesktop />, title: "What is recorded", body: "Your answers, resources you open, stakeholder questions, revisions, and timing. Enough to show how you worked, not a personality profile." },
            { fig: <FigReport />, title: "What the employer receives", body: "An evidence report with competency bands, cited actions, and suggested follow-up questions. Not a hire or reject label." },
          ]}
        />
      </Section>

      <Section id="session" labelledBy="session-title">
        <SectionHead
          id="session-title"
          title={["Your path", "through a session"]}
          lead="You get an incident brief, a repository that runs, and two teammates. Ask them anything; their answers are written in advance, so every candidate gets the same information. About twenty minutes in, the team posts one requirement update."
        />
        <Details
          items={[
            { title: "Invitation", body: "Open a private link for a specific role simulation." },
            { title: "Work sample", body: "Use the materials, ask clarifying questions, submit your decision." },
            { title: "Your record", body: "Review the result and choose what, if anything, to share later." },
            { title: "Asking is optional", body: "Not asking is never counted against you. If you assume, say so in your handoff." },
            { title: "Setup comes first", body: "A setup check runs before the clock matters. Setup problems are not held against you." },
          ]}
        />
      </Section>

      <Section id="control" labelledBy="control-title">
        <SectionHead
          id="control-title"
          title={["You control", "what you share"]}
          lead="Your portable record is yours. Employers only see attempts for simulations they ran."
          link={{ href: "/trust", label: "Read the trust page" }}
        />
        <Trio
          items={[
            { fig: <FigConsent />, title: "Your portable record", body: "You choose whether a verified result is added to a privacy-controlled record you can share later." },
            { fig: <FigReport />, title: "Sharing and privacy", body: "Employers only see attempts for simulations they ran. You control portable-record visibility." },
            { fig: <FigDesktop />, title: "AI use", body: "If the simulation permits in-product AI, its use is recorded and summarized for the employer. Outside tools are not inferred or claimed." },
          ]}
        />
      </Section>

      <Section id="questions" labelledBy="questions-title">
        <SectionHead id="questions-title" title={["Questions from", "engineers"]} lead="The short answers." />
        <Faq
          items={[
            { q: "Do I pay anything?", a: "No. Simulations and your Engineering Passport are free for engineers. Employers pay." },
            { q: "Can I use AI tools?", a: "Fydell cannot see them and does not try to detect them. At the end you describe any AI help in your own words, and the report labels that as your statement." },
            { q: "Do I get feedback?", a: "You keep your receipt. Whether the employer shares their report with you is up to them." },
            { q: "What if something breaks?", a: "Use the Support link shown during the simulation. Problems outside your control are not held against you." },
          ]}
        />
      </Section>

      <Closing
        title={["Show the work.", "Keep the receipt."]}
        primary={{ href: "/signup", label: "Create an account" }}
        secondary={{ href: "/download", label: "Download the app" }}
      />
    </MarketingShell>
  );
}
