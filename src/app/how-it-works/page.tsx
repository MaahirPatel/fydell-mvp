import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import { Kicker } from "@/components/marketing/ui";
import {
  ChapterHead,
  Features,
  IntakeVisual,
  ReviewVisual,
  ShareVisual,
  SimulationVisual,
} from "@/components/marketing/home/FydellHome";
import s from "@/components/marketing/home/fydell-home.module.css";

export const metadata = {
  title: "How it works",
  description:
    "How Fydell turns public repositories and working-codebase simulations into evidence a hiring team can open, check, and decide on.",
};

const STEPS = [
  { href: "#import", title: "Import", body: "The engineer connects public GitHub repositories. Each is pinned to a commit." },
  { href: "#passport", title: "Passport", body: "Findings cite files and lines. What could not be assessed is listed, not hidden." },
  { href: "#simulate", title: "Simulate", body: "Candidates fix a realistic incident in a working codebase with real tests." },
  { href: "#review", title: "Review", body: "Reviewers open every claim to its source and log a team decision." },
  { href: "#share", title: "Share", body: "Engineers scope each link to one employer and can revoke it at any time." },
] as const;

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <div className={s.page}>
        <section className={s.hero}>
          <div className={`${s.container} ${s.heroCopyIn}`}>
            <Kicker>How it works</Kicker>
            <h1 className={s.heroTitle}>From a repository to a <span className="t-evidence">hiring decision</span></h1>
            <div className={s.heroRow}>
              <p className={s.lede}>
                Five steps, each one recorded. Every claim Fydell makes about an engineer points back to code, a
                commit, or a test run that a reviewer can open.
              </p>
              <div className={s.heroActions}>
                <Link href="/passport/new" className={s.btnSolid}>Build a passport</Link>
                <Link href="/demo" className={s.btnGhost}>Open the demo</Link>
              </div>
            </div>
            <nav aria-label="Steps" className={s.steps}>
              {STEPS.map((step, i) => (
                <a key={step.href} href={step.href} className={s.step}>
                  <span className={s.stepNum}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={s.stepTitle}>{step.title}</span>
                  <span className={s.stepBody}>{step.body}</span>
                </a>
              ))}
            </nav>
          </div>
        </section>

        <section id="import" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="01"
            label="Import"
            href="/passport/new"
            title="Start from code the engineer already wrote"
            copy="Paste a GitHub profile, choose up to three public repositories, and add a short statement about what you built. Fydell fetches the tree at a pinned commit so every later finding refers to the same code."
          />
          <IntakeVisual />
          <Features dot="var(--brand-teal)" items={["Public repositories", "Pinned commits", "File-level coverage", "Contribution statements"]} />
        </section>

        <section id="passport" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="02"
            label="Passport"
            href="/passport/new"
            title="Findings that show their work"
            copy="Each finding names what the code demonstrates and links the exact lines. Statements the engineer writes stay separate from what Fydell observed, and authorship stays unverified until confirmed."
          />
          <div className={s.ledger} style={{ ["--ledger-dot" as string]: "var(--brand-teal)" }}>
            <div>
              <p className={s.ledgerHead}>What a passport records</p>
              <ul>
                <li><strong>Source-linked findings</strong> with file, line range, and commit.</li>
                <li><strong>Coverage</strong>: how many files were read, and which were skipped with a reason.</li>
                <li><strong>The engineer&apos;s own statement</strong>, labelled as theirs.</li>
                <li><strong>Role signals</strong> such as testing, API design, or data handling, only when the code shows them.</li>
              </ul>
            </div>
            <div style={{ ["--ledger-dot" as string]: "var(--brand-coral)" }}>
              <p className={s.ledgerHead}>What Fydell never does</p>
              <ul>
                <li><strong>Run imported code.</strong> Repositories are read, never executed.</li>
                <li><strong>Score the person.</strong> There is no overall rating or ranking.</li>
                <li><strong>Guess past the evidence.</strong> Unassessed areas are listed as unassessed.</li>
                <li><strong>Share without consent.</strong> A passport is private until the engineer shares it.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="simulate" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="03"
            label="Simulate"
            href="/demo"
            title="Watch the work happen, not a quiz"
            copy="Candidates get a brief, a working repository, a failing behaviour, and an AI-written patch that may or may not be right. They investigate, change code, and run tests. What gets recorded is disclosed before they begin."
          />
          <SimulationVisual />
          <Features dot="var(--brand-violet)" items={["Working codebases", "Trusted test harness", "AI patch review", "Disclosed telemetry"]} />
        </section>

        <section id="review" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="04"
            label="Review"
            href="/signup?as=employer"
            title="A decision the whole team can check"
            copy="Reviewers see project findings and simulation results side by side, open each one to its code, and record a decision with notes. The log shows who decided what, and on which evidence."
          />
          <ReviewVisual />
          <Features dot="var(--brand-warm)" items={["Evidence reports", "Reviewer notes", "Decision log", "Interview prompts"]} />
        </section>

        <section id="share" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="05"
            label="Share"
            href="/trust"
            title="The engineer holds the keys"
            copy="Each share link is scoped to one employer. The engineer previews exactly what that employer will see, chooses which sections to include, and can revoke access in one click."
          />
          <ShareVisual />
          <Features dot="var(--brand-teal)" items={["Scoped links", "Recipient preview", "One-click revoke"]} />
        </section>

        <section className={`${s.container} ${s.closing}`}>
          <h2 className={s.closingTitle}>
            Bring one open engineering role.
            <br />
            <span>Review candidates on their work.</span>
          </h2>
          <div className={s.closingRow}>
            <p className={s.lede}>Free for engineers. Hiring teams pay per completed simulation.</p>
            <div className={s.heroActions}>
              <Link href="/signup?as=employer" className={s.btnSolid}>Start hiring</Link>
              <Link href="/pricing" className={s.btnGhost}>
                View pricing <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
