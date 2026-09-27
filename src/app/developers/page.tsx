import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import {
  ChapterHead,
  Features,
  IntakeVisual,
  ShareVisual,
  SimulationVisual,
} from "@/components/marketing/home/FydellHome";
import s from "@/components/marketing/home/fydell-home.module.css";

export const metadata = {
  title: "For developers",
  description:
    "Build a free Engineering Passport from your public GitHub repositories. Every finding cites your code, and you decide which employers see it.",
};

const STEPS = [
  { href: "#import", title: "Connect", body: "Paste your GitHub profile and pick up to three public repositories." },
  { href: "#findings", title: "Check", body: "Read every finding against the lines it cites. Add what you built, in your words." },
  { href: "#share", title: "Share", body: "Send one link per employer. Preview it first; revoke it whenever you like." },
  { href: "#simulate", title: "Prove more", body: "When a company invites you, show how you work in a real codebase." },
] as const;

const FAQ = [
  {
    q: "Does it cost anything?",
    a: "No. Building, sharing, and exporting your Engineering Passport is free, and always will be. Hiring teams pay for the simulations they run.",
  },
  {
    q: "Does Fydell run my code?",
    a: "Never. Repositories are read at a pinned commit and analyzed as text. Nothing you import is executed, installed, or built.",
  },
  {
    q: "Which languages are supported?",
    a: "Python gets the deepest analysis today. Other languages still show structure, manifests, tests, and CI configuration, and every passport lists exactly which files were read and which were skipped.",
  },
  {
    q: "Will employers see a score?",
    a: "No. There is no overall rating or ranking. Employers see findings that cite your code, your own statements labelled as yours, and anything Fydell could not assess.",
  },
  {
    q: "Can I use private repositories?",
    a: "Not yet. Passports are built from public repositories only, so nothing private ever leaves GitHub.",
  },
  {
    q: "What happens if I revoke a link?",
    a: "The employer immediately loses access to that link. Other links you have shared are unaffected.",
  },
] as const;

export default function DevelopersPage() {
  return (
    <MarketingShell>
      <div className={s.page}>
        <section className={s.hero}>
          <div className={`${s.container} ${s.heroCopyIn}`}>
            <h1 className={s.title}>Get hired for the work you have already done</h1>
            <div className={s.heroRow}>
              <p className={s.lede}>
                Turn your public repositories into an Engineering Passport. Every finding cites the exact lines, and
                you decide which employers see it.
              </p>
              <div className={s.heroActions}>
                <Link href="/passport/new" className={s.btnSolid}>Build your passport</Link>
                <Link href="/demo" className={s.btnGhost}>See an example</Link>
              </div>
            </div>
            <nav aria-label="Steps" className={`${s.steps} ${s.steps4}`}>
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
            label="Start building"
            href="/passport/new"
            title="Start from repositories you already have"
            copy="No new portfolio to write. Paste your GitHub profile, choose the projects that represent you, and Fydell reads them at a pinned commit so every finding points at code that will not move."
          />
          <IntakeVisual />
          <Features dot="var(--brand-teal)" items={["Free forever", "Public repositories", "Pinned commits", "Read, never run"]} />
        </section>

        <section id="findings" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="02"
            label="How findings work"
            href="/how-it-works#passport"
            title="Credit for what the code actually shows"
            copy="A finding names what your code demonstrates and links the lines. Your own description of the project sits beside it, labelled as yours, so reviewers can tell what was observed from what you told them."
          />
          <div className={s.ledger} style={{ ["--ledger-dot" as string]: "var(--brand-teal)" }}>
            <div>
              <p className={s.ledgerHead}>What employers see</p>
              <ul>
                <li><strong>Findings with citations</strong> to file, line range, and commit.</li>
                <li><strong>Your statement</strong> about what you built and what you owned.</li>
                <li><strong>Coverage</strong>: what was read and what was skipped, with reasons.</li>
                <li><strong>Simulation results</strong>, only if you completed one and chose to share it.</li>
              </ul>
            </div>
            <div style={{ ["--ledger-dot" as string]: "var(--brand-coral)" }}>
              <p className={s.ledgerHead}>What they never see</p>
              <ul>
                <li><strong>A score or ranking.</strong> Fydell does not produce one.</li>
                <li><strong>Anything you switched off</strong> on that employer&apos;s link.</li>
                <li><strong>Other employers&apos; links</strong> or who else you shared with.</li>
                <li><strong>Your email</strong>, unless you choose to include it.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="share" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="03"
            label="Privacy and control"
            href="/trust"
            title="One link per employer, on your terms"
            copy="Try the switches below. Each link carries only the sections you allow, you preview exactly what the recipient sees before sending, and you can revoke it at any time."
          />
          <ShareVisual />
          <Features dot="var(--brand-teal)" items={["Scoped links", "Recipient preview", "One-click revoke", "JSON export"]} />
        </section>

        <section id="simulate" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="04"
            label="Try the demo"
            href="/demo"
            title="When invited, show how you work"
            copy="Some employers invite you to a simulation: a short, realistic incident in a working codebase. The recording rules are on the page before you start, and the result joins your passport only if you share it."
          />
          <SimulationVisual />
          <Features dot="var(--brand-violet)" items={["Disclosed recording", "Real tests", "Timed scope", "Yours to share"]} />
        </section>

        <section className={`${s.container} ${s.chapter}`} aria-labelledby="dev-faq">
          <h2 id="dev-faq" className={s.chapterTitle}>Questions engineers ask</h2>
          <div className={s.faq}>
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${s.container} ${s.closing}`}>
          <h2 className={s.closingTitle}>
            Your code already makes the case.
            <br />
            <span>Let it speak in the interview.</span>
          </h2>
          <div className={s.closingRow}>
            <p className={s.lede}>Free for engineers. No card, no trial, no catch.</p>
            <div className={s.heroActions}>
              <Link href="/passport/new" className={s.btnSolid}>Build your passport</Link>
              <Link href="/signup?as=developer" className={s.btnGhost}>Create an account</Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
