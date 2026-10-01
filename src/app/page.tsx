import { BriefcaseBusiness, Code2 } from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import { Hero } from "@/components/marketing/kit/Kit";
import {
  Audience,
  Bento,
  CalmHead,
  CalmSection,
  ClosingPanel,
  PathCards,
  Questions,
  Steps,
  TrustList,
} from "@/components/marketing/kit/Calm";
import {
  BriefFragment,
  ChecksFragment,
  CitationFragment,
  DecisionFragment,
  TeamFragment,
  UpdateFragment,
} from "@/components/marketing/kit/Fragments";

export const metadata = {
  title: { absolute: "Fydell: Hire on the work, not the résumé" },
  description:
    "Candidates spend about an hour fixing a realistic problem in a real codebase. Your team reviews exactly what they did, and decides.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero
        title={["Hire on the work,", "not the résumé."]}
        lead="Candidates spend about an hour fixing a realistic problem in a real codebase. Your team reviews exactly what they did, and decides."
        aside={{ href: "/download", strong: "New", label: "Fydell desktop 0.1.5 for Windows and Mac" }}
      >
        <PathCards
          items={[
            {
              eyebrow: "I am hiring",
              title: "See how a candidate works before you interview them",
              cta: "Start with one role",
              href: "/employers",
              icon: <BriefcaseBusiness />,
              tone: "violet",
            },
            {
              eyebrow: "I am an engineer",
              title: "Show employers code you wrote, linked to the exact lines",
              cta: "Build my passport, free",
              href: "/passport/new",
              icon: <Code2 />,
              tone: "teal",
            },
          ]}
        />
      </Hero>

      <CalmSection id="inside" labelledBy="inside-title">
        <CalmHead
          id="inside-title"
          title={["Closer to a first week", "than a quiz."]}
          lead="A résumé tells you where someone has worked. A Fydell simulation shows how they work, with the same kind of problem your team handles on a normal day."
        />
        <Bento
          items={[
            {
              wide: true,
              tone: "teal",
              title: "A real problem",
              body: "A small service with a real bug, real tests, and a brief from the team that owns it.",
              label: "An incident brief listing three things to do.",
              visual: <BriefFragment />,
            },
            {
              tone: "violet",
              title: "Teammates who answer",
              body: "The same written answers for everyone. Asking is optional.",
              label: "A candidate asks which failures are temporary and the engineering lead answers.",
              visual: <TeamFragment />,
            },
            {
              tone: "amber",
              title: "The requirement moves",
              body: "One update arrives partway through, the way scope changes at work.",
              label: "A new request posted at 14:18.",
              visual: <UpdateFragment />,
            },
            {
              wide: true,
              tone: "blue",
              title: "Checked on what they sent",
              body: "The submission is sealed and run against hidden checks in a clean sandbox, not on their laptop.",
              label: "14 of 15 hidden checks passed, with one failure named in plain words.",
              visual: <ChecksFragment />,
            },
            {
              wide: true,
              tone: "coral",
              title: "Every point cites the work",
              body: "A finding without a file, a test or a message behind it cannot be released.",
              label: "A finding linked to retry_policy.py, lines 6 to 7.",
              visual: <CitationFragment />,
            },
            {
              tone: "violet",
              title: "Your team decides",
              body: "Advance, Hold or Decline. Fydell never scores the person.",
              label: "Advance, Hold and Decline, with Advance chosen.",
              visual: <DecisionFragment />,
            },
          ]}
        />
      </CalmSection>

      <CalmSection id="how" labelledBy="how-title">
        <CalmHead
          id="how-title"
          title={["Three steps.", "Nothing hidden."]}
          lead="Candidates always know what comes next, and your team always knows why a decision was made."
          link={{ href: "/product", label: "The full walkthrough" }}
        />
        <Steps
          items={[
            {
              title: "Invite",
              body: "Pick the simulation that fits the role and invite candidates by email. They read exactly what is recorded before anything starts.",
            },
            {
              title: "They do the work",
              body: "About an hour on a real codebase in the Fydell desktop app, with teammates who answer questions and one requirement change along the way.",
            },
            {
              title: "You decide",
              body: "Your team reads a report where every point cites the work, then records Advance, Hold or Decline. Fydell never scores the person.",
            },
          ]}
        />
      </CalmSection>

      <CalmSection label="Who Fydell is for">
        <Audience
          dark={{
            id: "teams",
            eyebrow: "For hiring teams",
            title: "Interview the people who already showed you.",
            points: [
              "A simulation matched to the role you are hiring for",
              "A report your reviewers write, with every point cited",
              "Advance, Hold or Decline, recorded with the reason",
            ],
            primary: { href: "/signup?as=employer", label: "Start with one role" },
            secondary: { href: "/demo", label: "Explore the demo" },
          }}
          light={{
            id: "engineers",
            eyebrow: "For engineers",
            title: "Keep proof of what you can do.",
            points: [
              "A free passport built from your public GitHub projects",
              "A receipt for every simulation you send",
              "Private until you share a link, and you can turn it off",
            ],
            primary: { href: "/passport/new", label: "Build my passport" },
            secondary: { href: "/download", label: "Get the desktop app" },
          }}
        />
      </CalmSection>

      <CalmSection labelledBy="trust-title">
        <CalmHead
          id="trust-title"
          title={["Clear about what", "it will not do."]}
          lead="Hiring is a decision about a person. Fydell gives your team evidence and stays out of the judgement."
          link={{ href: "/trust", label: "Read the trust page" }}
        />
        <TrustList
          yes={[
            { strong: "Shows the list first.", rest: "Files, commands, tests and timing, before anything starts." },
            { strong: "Requires citations.", rest: "A finding without evidence cannot be released." },
            { strong: "Gives a receipt.", rest: "With a checksum of exactly what was sent." },
          ]}
          no={[
            { strong: "Never scores or ranks people.", rest: "No rating, percentile or fit score." },
            { strong: "Never polices AI use.", rest: "Candidates describe any AI help in their own words." },
            { strong: "Never records outside the list.", rest: "No screen, webcam, microphone or keystrokes." },
          ]}
        />
      </CalmSection>

      <Questions
        id="faq"
        link={{ href: "/contact", label: "Ask us something else" }}
        items={[
          { q: "How long does a simulation take?", a: "About an hour once the candidate presses Start. Setup comes first and is untimed." },
          {
            q: "Do candidates need to install anything?",
            a: "The Fydell desktop app for Windows or Mac. It sets up the project, and a setup check says if anything else is needed before the clock starts.",
          },
          { q: "Does Fydell score candidates?", a: "No. Your reviewers write the findings and record the decision. Fydell checks that every finding cites the work." },
          { q: "Can candidates use AI tools?", a: "Fydell cannot see tools outside the app and never guesses. Candidates can describe any AI help in their own words." },
          { q: "Who can see an engineer's passport?", a: "Only employers the engineer sends a link to. Each link can be turned off at any time." },
        ]}
      />

      <ClosingPanel title={["Hire on the work.", "Start with one role."]} />
    </MarketingShell>
  );
}
