import type { CSSProperties } from "react";
import s from "../site.module.css";
import Reveal from "../Reveal";
import {
  ArrowLink,
  Band,
  ButtonLink,
  Caption,
  CheckItem,
  Container,
  FeatureTrio,
  Section,
  SectionHead,
  Stage,
} from "../primitives";
import { DecisionStack, IncidentRipple, WorkTrail } from "../Illustrations";
import HeroWorkspace from "../visuals/HeroWorkspace";
import {
  CitedReport,
  ConsentScreen,
  HiddenChecks,
  IncidentBrief,
  PassportView,
  Receipt,
  WorkTrailPanel,
} from "../visuals/panels";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

const LOOP = [
  { title: "Create a role", body: "Pick the incident that matches the work. Invite-only; there is no public catalogue." },
  { title: "Invite candidates", body: "Each candidate gets a private link and reads exactly what will be recorded." },
  { title: "They work the incident", body: "In the desktop app, in a real codebase, with a team to ask and a change midway." },
  { title: "Checks run on the snapshot", body: "The submission is sealed with a checksum and checked in an isolated sandbox." },
  { title: "Your team decides", body: "Reviewers write a cited report and record Advance, Hold or Decline." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroWash} aria-hidden />
        <Container>
          <div className={s.heroCopy}>
            <h1 id="hero-title" className={s.display} data-hero="" style={i(0)}>
              Hire engineers on the work itself
            </h1>
            <p className={s.lead} data-hero="" style={i(1)}>
              Candidates work a real incident in a real codebase. Your team reviews what they changed, ran and asked,
              and decides on evidence it can cite.
            </p>
            <div className={s.actions} data-hero="" style={i(2)}>
              <ButtonLink href="/signup?as=employer">Start hiring</ButtonLink>
              <ButtonLink href="/passport/new" variant="secondary">
                Build your passport
              </ButtonLink>
            </div>
          </div>
          <Reveal className={s.heroVisual}>
            <div data-hero-visual="">
              <Stage>
                <HeroWorkspace />
              </Stage>
              <Caption>the desktop app 31 minutes into the webhook retry incident.</Caption>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Statement */}
      <Section>
        <Reveal>
          <p className={s.statement} data-r="">
            <strong className={s.gradientText}>A resume tells you where someone has worked.</strong> Fydell shows you how they work: what they read,
            what they asked, what they changed, and whether it held up.
          </p>
        </Reveal>
      </Section>

      {/* Trio */}
      <Section tight>
        <FeatureTrio
          items={[
            {
              title: "A real incident, not a puzzle",
              body: "Working code, a brief, a team to ask and one change partway through. The work looks like the job.",
              art: <IncidentRipple />,
              glow: "red",
            },
            {
              title: "A disclosed work trail",
              body: "Files changed, commands run, test runs and timing. Nothing else, and the candidate sees the list first.",
              art: <WorkTrail />,
              glow: "teal",
            },
            {
              title: "Your team makes the call",
              body: "Reviewers write the report and record Advance, Hold or Decline. Fydell never scores a person.",
              art: <DecisionStack />,
              glow: "blue",
            },
          ]}
        />
      </Section>

      {/* Start from a real incident */}
      <Section id="incident">
        <SectionHead
          title="Start from a real incident"
          lead="Every simulation opens the way real work does: a brief, a codebase that runs, and people who know more than the brief says."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <IncidentBrief />
            <Caption>the INC-2291 brief beside the team thread.</Caption>
          </div>
        </Reveal>
      </Section>

      {/* Every step on the record */}
      <Band tone="lavender">
        <SectionHead
          title="Every step, on the record"
          lead="The candidate reads what is recorded before they start. The trail shows the work itself, never the person's screen, camera or keystrokes."
        />
        <Reveal className={`${s.headToVisual} ${s.grid2}`}>
          <div data-r="visual" style={i(0)}>
            <ConsentScreen />
            <Caption>the consent screen every candidate sees first.</Caption>
          </div>
          <div data-r="visual" style={i(1)}>
            <WorkTrailPanel />
            <Caption>one attempt&apos;s trail, from brief to sealed snapshot.</Caption>
          </div>
        </Reveal>
      </Band>

      {/* Checked on the code they submitted */}
      <Section>
        <SectionHead
          title="Checked on the code they submitted"
          lead="On submit the project is sealed with a checksum. Hidden checks run against that exact snapshot in an isolated sandbox, and the candidate keeps a receipt."
        />
        <Reveal className={`${s.headToVisual} ${s.gridWide}`}>
          <div data-r="visual" style={i(0)}>
            <HiddenChecks />
            <Caption>hidden checks for Candidate 04.</Caption>
          </div>
          <div data-r="visual" style={i(1)}>
            <Receipt />
            <Caption>the receipt the candidate keeps.</Caption>
          </div>
        </Reveal>
      </Section>

      {/* Report */}
      <Section id="report">
        <SectionHead
          title="A report your team can stand behind"
          lead="Your reviewers write it. A finding cannot be released until it cites a line, a test, a message or a handoff answer. There is no score."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <Stage quiet>
              <CitedReport />
            </Stage>
            <Caption>the team&apos;s report for Candidate 04.</Caption>
          </div>
        </Reveal>
        <div className={s.linkRow}>
          <ArrowLink href="/employers">How reviewing works</ArrowLink>
        </div>
      </Section>

      {/* Loop */}
      <Section>
        <SectionHead title="One loop, from role to decision" lead="Five steps. Your team owns the first and the last." />
        <Reveal as="ol" className={`${s.steps} ${s.headToVisual}`}>
          {LOOP.map((step, n) => (
            <li key={step.title} className={s.step} data-r="" style={i(n)}>
              <span className={s.stepNum}>0{n + 1}</span>
              <h3 className={s.h3}>{step.title}</h3>
              <p className={s.body} style={{ fontSize: 14 }}>
                {step.body}
              </p>
            </li>
          ))}
        </Reveal>
      </Section>

      {/* Passport */}
      <Band tone="rose" id="developers">
        <SectionHead
          title="Engineers keep their work"
          lead="The Engineering Passport is built from an engineer's own public repositories at a pinned commit, with findings linked to exact lines. They share it with links they can revoke. It is free for engineers."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <PassportView />
            <Caption>a passport for the ledger-sync repository.</Caption>
          </div>
        </Reveal>
        <div className={s.linkRow}>
          <ArrowLink href="/developers">Build your passport</ArrowLink>
        </div>
      </Band>

      {/* Limits */}
      <Section>
        <SectionHead
          title="Clear about what it will not do"
          lead="Hiring is a consequential decision. These limits are part of the product, not fine print."
        />
        <Reveal className={`${s.headToVisual} ${s.grid2}`}>
          <div className={s.card} data-r="" style={i(0)}>
            <h3 className={s.h3} style={{ marginBottom: 18 }}>
              Fydell does
            </h3>
            <ul className={s.checkList}>
              <CheckItem>Show the work: files changed, commands run, test runs and timing</CheckItem>
              <CheckItem>Run hidden checks on the exact snapshot the candidate submitted</CheckItem>
              <CheckItem>Require every finding to cite evidence before it is released</CheckItem>
              <CheckItem>Tell candidates exactly what is recorded before they begin</CheckItem>
            </ul>
          </div>
          <div className={`${s.card} ${s.cardQuiet}`} data-r="" style={i(1)}>
            <h3 className={s.h3} style={{ marginBottom: 18 }}>
              Fydell never does
            </h3>
            <ul className={s.checkList}>
              <CheckItem never>Score, rank or rate a candidate</CheckItem>
              <CheckItem never>Record the screen, camera, microphone, browsing or keystrokes</CheckItem>
              <CheckItem never>Claim to predict job performance or detect AI use</CheckItem>
              <CheckItem never>Make the hiring decision for your team</CheckItem>
            </ul>
          </div>
        </Reveal>
      </Section>

      {/* Closing */}
      <section className={s.closing}>
        <div className={s.wash} aria-hidden />
        <Container>
          <Reveal className={s.headStack}>
            <h2 className={s.title} data-r="" style={i(0)}>
              Hire on the work. Start with one role.
            </h2>
            <p className={s.lead} data-r="" style={i(1)}>
              Set up a role, invite a candidate, and read your first cited report. You pay only when a simulation is
              completed.
            </p>
            <div className={s.actions} data-r="" style={{ ...i(2), marginTop: 8 }}>
              <ButtonLink href="/signup?as=employer">Start hiring</ButtonLink>
              <ButtonLink href="/pricing" variant="ghost">
                See pricing
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
