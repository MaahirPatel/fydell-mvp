import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import {
  Closing,
  Details,
  Faq,
  Hero,
  Ledger,
  Section,
  SectionHead,
  Stage,
  Statement,
  Trio,
  Visual,
} from "@/components/marketing/kit/Kit";
import { FigConsent, FigDesktop, FigIncident, FigPassport, FigReport } from "@/components/marketing/kit/Figs";
import { BriefShot, ReceiptShot, TrailShot } from "@/components/marketing/kit/Shots";

export const metadata = {
  title: "For engineers",
  description:
    "Show how you work on a real engineering incident. You see what is recorded before you start and keep a receipt of what you submitted. Free for engineers.",
  alternates: { canonical: "/developers" },
};

export default function DevelopersPage() {
  return (
    <MarketingShell>
      <Hero
        title={["Show how you work,", "not how you interview"]}
        lead="Work a real incident in your own time, with your own tools. You see exactly what is recorded before you start, and you keep a receipt of what you submitted. Fydell is free for engineers."
        aside={{ href: "/download", strong: "Download", label: "Fydell for macOS and Windows" }}
        actions={
          <>
            <Link href="/passport/new" className="l-btn l-btn-lg l-btn-solid">Build your passport</Link>
            <Link href="/signup" className="l-btn l-btn-lg l-btn-ghost">Create an account</Link>
          </>
        }
      >
        <Stage hero label="Example: the work trail and the notice shown before you start">
          <TrailShot />
        </Stage>
      </Hero>

      <Section>
        <Statement
          lead="No whiteboard, no trick questions, no one watching."
          rest="Just a codebase with a real problem, a team that answers when you ask, and an hour to do what you would do at work."
        />
        <Trio
          items={[
            { fig: <FigIncident />, title: "A problem worth solving", body: "Production-style incidents in small, working services. Read the brief, find the cause, fix it properly." },
            { fig: <FigDesktop />, title: "Your machine, your tools", body: "The desktop app sets up the project. Edit in the editor you already use." },
            { fig: <FigPassport />, title: "Work you can point to", body: "Build an Engineering Passport from your own repositories and share it on your terms." },
          ]}
        />
      </Section>

      <Section id="simulation" labelledBy="simulation-title">
        <SectionHead
          id="simulation-title"
          eyebrow="The simulation"
          title={["What a simulation", "is like"]}
          lead="You get an incident brief, a repository that runs, and two teammates. Ask them anything; their answers are written in advance, so every candidate gets the same information. About twenty minutes in, the team posts one requirement update."
        />
        <Visual label="Example: the incident brief and the team thread">
          <BriefShot />
        </Visual>
        <Details
          items={[
            { title: "Asking is optional", body: "Not asking is never counted against you. If you assume, say so in your handoff." },
            { title: "Setup comes first", body: "A setup check runs before the clock matters. Setup problems are not held against you." },
            { title: "Three short answers", body: "What changed, what you tested, and what remains unresolved. Short and accurate beats long." },
          ]}
        />
      </Section>

      <Section id="receipt" labelledBy="receipt-title">
        <SectionHead
          id="receipt-title"
          eyebrow="Submission"
          title={["A receipt for", "what you sent"]}
          lead="When you submit, your project is sealed with a checksum. You keep a receipt with that checksum, so you always know exactly what the employer reviewed."
        />
        <Visual label="Example: a submission receipt" fade={false}>
          <ReceiptShot />
        </Visual>
      </Section>

      <Section id="passport" labelledBy="passport-title">
        <SectionHead
          id="passport-title"
          eyebrow="Engineering passport"
          title={["An Engineering", "Passport you own"]}
          lead="Paste your GitHub profile and pick up to three public repositories. Fydell reads them at a pinned commit and lists what the code shows, each finding linked to the exact lines. You decide who sees it, and you can revoke a link at any time."
          link={{ href: "/passport/new", label: "Build your passport, no account needed" }}
        />
        <Trio
          items={[
            { fig: <FigPassport />, title: "From code you already wrote", body: "Public repositories, read at a pinned commit so every finding refers to the same code." },
            { fig: <FigReport />, title: "Every finding cites its lines", body: "What the code demonstrates, linked to files and line ranges. Unassessed areas are listed, not guessed." },
            { fig: <FigConsent />, title: "Shared on your terms", body: "Each link is scoped to one employer. Preview what they will see, and revoke it in one click." },
          ]}
        />
      </Section>

      <Section id="boundaries" labelledBy="boundaries-title">
        <SectionHead
          id="boundaries-title"
          eyebrow="Recording"
          title={["What is recorded,", "and what never is"]}
          lead="The list is shown before you start and is the same for every candidate. The employer's report can only cite what is on it."
          link={{ href: "/trust", label: "Read the trust page" }}
        />
        <Ledger
          yes={{
            title: "Recorded during a simulation",
            items: [
              { strong: "File changes", rest: "in the simulation project folder." },
              { strong: "Commands and test runs", rest: "you start from the app, with their results." },
              { strong: "Timing", rest: "of each step, so the order of your work is clear." },
              { strong: "Team messages and your handoff", rest: "exactly as you wrote them." },
            ],
          }}
          no={{
            title: "Never recorded",
            items: [
              { strong: "Your screen, webcam or microphone.", rest: "Nothing is captured visually or by audio." },
              { strong: "Keystrokes.", rest: "Only saved file changes, never typing." },
              { strong: "Other apps and files.", rest: "Nothing outside the simulation folder." },
              { strong: "Anything outside a session.", rest: "Recording starts when you begin and stops when you submit." },
            ],
          }}
        />
      </Section>

      <Section id="questions" labelledBy="questions-title">
        <SectionHead id="questions-title" eyebrow="FAQ" small title={["Questions from", "engineers"]} lead="The short answers." />
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
        primary={{ href: "/passport/new", label: "Build your passport" }}
        secondary={{ href: "/download", label: "Download the app" }}
      />
    </MarketingShell>
  );
}
