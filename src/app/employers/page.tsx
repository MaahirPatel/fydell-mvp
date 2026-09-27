import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import {
  ChapterHead,
  Features,
  HeroWindow,
  ReviewVisual,
  SimulationVisual,
} from "@/components/marketing/home/FydellHome";
import s from "@/components/marketing/home/fydell-home.module.css";
import { PRICING, usd } from "@/lib/marketing/pricing";

export const metadata = {
  title: "For employers",
  description:
    "Review software engineers on evidence you can open: source-linked Engineering Passports and simulations in working codebases. Pay only for completed simulations.",
};

const FAQ = [
  {
    q: "What does a candidate actually do in a simulation?",
    a: "They get a brief, a working repository with a realistic defect, a test suite, and an AI-written patch that may or may not be correct. They investigate, change code, run tests, and submit. The session is timed and every recorded action is disclosed to them up front.",
  },
  {
    q: "Does Fydell rank candidates or make the decision?",
    a: "No. Fydell does not score, rank, or recommend a hire. It shows your team the evidence, with citations and stated limits, and records the decision your reviewers make.",
  },
  {
    q: "Which roles are covered?",
    a: "The simulation library covers Python backend work today. Frontend, full-stack, and AI/ML candidates can be reviewed through their Engineering Passport evidence.",
  },
  {
    q: "What counts as a completed simulation?",
    a: "A submitted attempt that produced a report. Invitations, expired links, and runs that fail for infrastructure reasons are never billed.",
  },
  {
    q: "Can candidates see our notes or decision?",
    a: "No. Reviewer notes and decisions stay inside your workspace. The candidate's own view is assembled separately.",
  },
] as const;

export default function EmployersPage() {
  return (
    <MarketingShell>
      <div className={s.page}>
        <section className={s.hero}>
          <div className={`${s.container} ${s.heroCopyIn}`}>
            <p className={s.eyebrow}>
              <span className={s.eyebrowDot} aria-hidden />
              For employers
            </p>
            <h1 className={s.heroTitle}>Review engineers on work you can open</h1>
            <div className={s.heroRow}>
              <p className={s.lede}>
                Source-linked Engineering Passports and simulations in working codebases. Your team decides on
                evidence, not on résumé keywords or a take-home nobody can verify.
              </p>
              <div className={s.heroActions}>
                <Link href="/signup?as=employer" className={s.btnSolid}>Start hiring</Link>
                <Link href="/pricing" className={s.btnGhost}>See pricing</Link>
              </div>
            </div>
          </div>
          <div className={s.stage}>
            <div className={s.stageInner}>
              <HeroWindow />
            </div>
          </div>
        </section>

        <section id="simulate" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="01"
            label="Try the demo"
            href="/demo"
            title="Invite candidates into a working codebase"
            copy="Send a simulation instead of a take-home. Candidates fix a realistic incident with real tests and an AI patch to judge. Drag the timeline to see what a reviewer sees afterwards."
          />
          <SimulationVisual />
          <Features dot="var(--brand-violet)" items={["Working codebases", "Recorded test runs", "AI patch review", "Timed scope"]} />
        </section>

        <section id="review" className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="02"
            label="How review works"
            href="/how-it-works#review"
            title="Every claim opens to its source"
            copy="Click through the findings below. Project evidence and simulation results sit side by side, each with the code behind it and the limits of what it shows. Record a decision and the whole team can audit it."
          />
          <ReviewVisual />
          <Features dot="var(--brand-warm)" items={["Evidence reports", "Reviewer notes", "Decision log", "Interview prompts"]} />
        </section>

        <section className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="03"
            label="Trust and security"
            href="/trust"
            title="Built to be checked, not believed"
            copy="Hiring evidence is only useful if it holds up. Fydell states its limits beside every claim and keeps the decision with your team."
          />
          <div className={s.ledger} style={{ ["--ledger-dot" as string]: "var(--brand-warm)" }}>
            <div>
              <p className={s.ledgerHead}>What your team gets</p>
              <ul>
                <li><strong>Findings with citations</strong> to the file, lines, and commit.</li>
                <li><strong>Test results from a trusted harness</strong>, not a model&apos;s opinion.</li>
                <li><strong>Interview prompts</strong> drawn from gaps in the candidate&apos;s own work.</li>
                <li><strong>A decision log</strong> showing who decided what, and on which evidence.</li>
              </ul>
            </div>
            <div style={{ ["--ledger-dot" as string]: "var(--brand-coral)" }}>
              <p className={s.ledgerHead}>What Fydell will not do</p>
              <ul>
                <li><strong>Rank or reject candidates.</strong> The decision stays with you.</li>
                <li><strong>Claim to detect AI use.</strong> Candidates are told what is recorded.</li>
                <li><strong>Share your notes.</strong> Candidates never see reviewer judgment.</li>
                <li><strong>Pool candidates.</strong> You see only the people you invited or who shared with you.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={`${s.container} ${s.chapter}`}>
          <ChapterHead
            index="04"
            label="Full pricing"
            href="/pricing"
            title="Pay for completed work, not seats"
            copy="Invite as many candidates and reviewers as you like. You are billed only when a candidate submits a simulation that produces a report."
          />
          <div className={s.strip}>
            <Link href="/pricing#starter" className="group">
              <p className={s.stripFigure}>{usd(PRICING.starterPerSimulation)}</p>
              <p className={s.stripLabel}>Starter: per completed simulation, no commitment.</p>
            </Link>
            <Link href="/pricing#team" className="group">
              <p className={s.stripFigure}>{usd(PRICING.teamMonthly)}<span className="text-[0.5em] text-[var(--text-tertiary)]">/mo</span></p>
              <p className={s.stripLabel}>Team: {PRICING.teamIncluded} completed simulations included, then {usd(PRICING.teamOverage)} each.</p>
            </Link>
            <Link href="/pricing#estimate" className="group">
              <p className={`${s.stripFigure} flex items-center gap-2`}>Estimate <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" aria-hidden /></p>
              <p className={s.stripLabel}>Work out your monthly cost from your hiring volume.</p>
            </Link>
          </div>
        </section>

        <section className={`${s.container} ${s.chapter}`} aria-labelledby="emp-faq">
          <h2 id="emp-faq" className={s.chapterTitle}>Questions hiring teams ask</h2>
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
            Bring one open role.
            <br />
            <span>Review candidates on their work.</span>
          </h2>
          <div className={s.closingRow}>
            <p className={s.lede}>Set up a workspace in minutes. Pay only for completed simulations.</p>
            <div className={s.heroActions}>
              <Link href="/signup?as=employer" className={s.btnSolid}>Start hiring</Link>
              <Link href="/contact" className={s.btnGhost}>Talk to us</Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
