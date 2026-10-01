import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import {
  Details,
  Faq,
  Hero,
  Section,
  SectionHead,
  Statement,
  Trio,
} from "@/components/marketing/kit/Kit";
import { FigChecks, FigConsent, FigReport } from "@/components/marketing/kit/Figs";
import { Bento, ClosingPanel } from "@/components/marketing/kit/Calm";
import { BriefFragment, TeamFragment, UpdateFragment } from "@/components/marketing/kit/Fragments";
import { PRICING, usd } from "@/lib/marketing/pricing";

export const metadata = {
  title: "For hiring teams",
  description:
    "Invite candidates to a real engineering incident. Your team reviews the recorded work, writes a cited report and decides.",
  alternates: { canonical: "/employers" },
};

export default function EmployersPage() {
  return (
    <MarketingShell>
      <Hero
        title={["Decide on evidence", "your team can check"]}
        lead="Invite candidates to a real engineering incident. Review the code they submitted, the checks it passed and how they worked, then record a decision the whole team can trace."
        aside={{ href: "/pricing", strong: usd(PRICING.starterPerSimulation), label: "per completed simulation" }}
        actions={
          <>
            <Link href="/signup?as=employer" className="l-btn l-btn-lg l-btn-solid">Create a role</Link>
            <Link href="/demo" className="l-btn l-btn-lg l-btn-ghost">See an example report</Link>
          </>
        }
      >
      </Hero>

      <Section>
        <Statement
          lead="Interviews test how people talk about work."
          rest="A simulation shows the work: an unfamiliar codebase, a vague requirement, a teammate to ask, and a change of scope halfway through."
        />
        <Trio
          items={[
            { fig: <FigConsent />, title: "Candidates consent first", body: "They see exactly what is recorded before they start, and get a receipt when they finish." },
            { fig: <FigChecks />, title: "Checks on the sealed code", body: "Hidden checks run on the sealed submission in an isolated sandbox, never on the candidate's machine." },
            { fig: <FigReport />, title: "Findings with sources", body: "Every finding links to a file, a test, a message or a handoff answer. No citation, no release." },
          ]}
        />
      </Section>

      <Section id="review" labelledBy="review-title">
        <SectionHead
          id="review-title"
          title={["Review the work,", "not a summary of it"]}
          lead="Open the submitted diff next to the hidden check results. Every run is tied to the exact archive the candidate submitted, identified by its checksum."
        />
        <Details
          items={[
            { title: "Sealed submissions", body: "The archive is hashed on submit. The report can only cite what is in it." },
            { title: "Same checks for everyone", body: "Every candidate for a role gets the same scenario, teammates and update." },
            { title: "Setup is not held against them", body: "A setup check runs first. If something outside their control slows them down, support is one click away." },
          ]}
        />
      </Section>

      <Section id="process" labelledBy="process-title">
        <SectionHead
          id="process-title"
          title={["See how they", "got there"]}
          lead="The work trail shows the order things happened: what they read first, when they asked, how often they tested, and what they did after the requirement changed."
        />
        <div style={{ marginTop: 56 }}>
          <Bento
            items={[
              {
                tone: "teal",
                title: "What they read first",
                body: "Whether they started with the brief, the logs or the code.",
                label: "An incident brief listing three things to do.",
                visual: <BriefFragment />,
              },
              {
                tone: "violet",
                title: "When they asked",
                body: "Which questions they asked the team, and when.",
                label: "A candidate asks which failures are temporary and the engineering lead answers.",
                visual: <TeamFragment />,
              },
              {
                tone: "amber",
                title: "What they did after the change",
                body: "How they handled the one requirement update.",
                label: "A new request posted at 14:18.",
                visual: <UpdateFragment />,
              },
            ]}
          />
        </div>
      </Section>

      <Section id="questions" labelledBy="questions-title">
        <SectionHead
          id="questions-title"
          title={["Questions from", "hiring teams"]}
          lead="The short answers. For anything else, talk to us."
          link={{ href: "/contact", label: "Contact sales" }}
        />
        <Faq
          items={[
            { q: "What roles does Fydell cover today?", a: "Backend engineering, starting with a Python webhook-retry incident. More engineering scenarios are in development; we will not list a role until its simulation is ready." },
            { q: "How long does a simulation take?", a: "About an hour of focused work. Candidates get a deadline when they accept the invitation and can start whenever suits them before it." },
            { q: "Does Fydell score or rank candidates?", a: "No. Fydell records the work and runs the checks. Your reviewers write the findings and make the decision. There is no overall score." },
            { q: "Can candidates use AI tools?", a: "Fydell cannot observe AI tools and does not claim to detect them. Candidates describe any AI assistance in their own words, and the report labels that as their statement." },
            { q: "When are we charged?", a: `When a candidate submits. Invitations, expired links and abandoned attempts are never billed. Starter is ${usd(PRICING.starterPerSimulation)} per completed simulation.` },
          ]}
        />
      </Section>

      <ClosingPanel
        title={["Bring one open role.", "Decide on the work."]}
        primary={{ href: "/signup?as=employer", label: "Create a role" }}
      />
    </MarketingShell>
  );
}
