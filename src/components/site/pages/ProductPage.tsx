import type { CSSProperties } from "react";
import s from "../site.module.css";
import Reveal from "../Reveal";
import {
  Band,
  ButtonLink,
  Caption,
  ClosingCTA,
  FeatureTrio,
  PageHero,
  Section,
  SectionHead,
  Stage,
} from "../primitives";
import { ChecksGrid, ConsentChecklist, DesktopWindow, ReportDoc, WorkTrail, IncidentRipple } from "../Illustrations";
import HeroWorkspace from "../visuals/HeroWorkspace";
import { CitedReport, ConsentScreen, HiddenChecks, IncidentBrief, Receipt, WorkTrailPanel } from "../visuals/panels";
import { DesktopProvisioning } from "../visuals/app";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

export default function ProductPage() {
  return (
    <>
      <PageHero
        title="One incident, from brief to decision"
        lead="Fydell gives a candidate a real incident in a real codebase, records a disclosed trail of the work, checks the code they submit, and hands your team what it needs to write a cited report."
        actions={
          <>
            <ButtonLink href="/signup?as=employer">Start hiring</ButtonLink>
            <ButtonLink href="/download" variant="secondary">
              Download the app
            </ButtonLink>
          </>
        }
      >
        <Stage>
          <HeroWorkspace />
        </Stage>
        <Caption>the desktop app during the webhook retry incident.</Caption>
      </PageHero>

      <Section>
        <FeatureTrio
          items={[
            {
              title: "The desktop app",
              body: "macOS and Windows. A file tree, an editor, a terminal, tests and a team thread in one window.",
              art: <DesktopWindow />,
              glow: "blue",
            },
            {
              title: "Consent before anything",
              body: "The candidate reads what is recorded and what never is, then chooses to start.",
              art: <ConsentChecklist />,
              glow: "teal",
            },
            {
              title: "Checks on the snapshot",
              body: "Hidden checks run in an isolated sandbox against the exact code that was submitted.",
              art: <ChecksGrid />,
              glow: "violet",
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHead
          title="A brief, a codebase and a team"
          lead="Each simulation is an incident: a brief like the ones your engineers read, working code with tests, and a simulated team who answer questions the way colleagues do."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <IncidentBrief />
            <Caption>INC-2291 and its team thread.</Caption>
          </div>
        </Reveal>
      </Section>

      <Section>
        <SectionHead
          title="The requirement changes partway through"
          lead="One update arrives mid-task, as it would on a real team. How someone absorbs it is some of the most useful evidence a simulation produces."
        />
        <Reveal className={`${s.headToVisual} ${s.grid3}`}>
          {[
            ["Arrives in the thread", "The update lands where the team talks, marked in red, with the time it arrived."],
            ["Recorded in the trail", "What the candidate did after it, and when, is part of the work trail."],
            ["Checked like the rest", "Hidden checks cover the new requirement, so the report can cite what held."],
          ].map(([t, b], n) => (
            <div key={t} className={s.card} data-r="" style={i(n)}>
              <h3 className={s.h3}>{t}</h3>
              <p className={s.body} style={{ marginTop: 8 }}>
                {b}
              </p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Band tone="lavender">
        <SectionHead
          title="What is recorded, and what never is"
          lead="The work trail is files changed, commands run, test runs and timing. It never includes the screen, the camera, the microphone, browsing or keystrokes."
        />
        <Reveal className={`${s.headToVisual} ${s.grid2}`}>
          <div data-r="visual" style={i(0)}>
            <ConsentScreen />
            <Caption>the consent screen.</Caption>
          </div>
          <div data-r="visual" style={i(1)}>
            <WorkTrailPanel />
            <Caption>the trail for one attempt.</Caption>
          </div>
        </Reveal>
      </Band>

      <Section>
        <SectionHead
          title="Prepared on their machine, checked on ours"
          lead="The app verifies the project snapshot before work starts. On submit the project is sealed with a checksum, and hidden checks run on that snapshot in an isolated sandbox."
        />
        <Reveal className={`${s.headToVisual} ${s.grid2}`}>
          <div data-r="visual" style={i(0)}>
            <DesktopProvisioning />
            <Caption>preparing the workspace.</Caption>
          </div>
          <div data-r="visual" style={i(1)}>
            <Receipt />
            <Caption>the receipt after submitting.</Caption>
          </div>
        </Reveal>
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <HiddenChecks />
            <Caption>hidden checks on the submitted snapshot.</Caption>
          </div>
        </Reveal>
      </Section>

      <Section>
        <SectionHead
          title="Your team writes the report"
          lead="Reviewers write each finding and attach the evidence it rests on. Release stays blocked until every finding cites something. The team records Advance, Hold or Decline."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <Stage quiet>
              <CitedReport />
            </Stage>
            <Caption>a released report.</Caption>
          </div>
        </Reveal>
      </Section>

      <Section>
        <FeatureTrio
          items={[
            { title: "Real incidents", body: "Authored scenarios with working code and tests, not puzzles.", art: <IncidentRipple />, glow: "red" },
            { title: "Disclosed trail", body: "Only the work itself, listed before the candidate starts.", art: <WorkTrail />, glow: "teal" },
            { title: "Cited reports", body: "Findings link to lines, tests, messages and answers.", art: <ReportDoc />, glow: "blue" },
          ]}
        />
      </Section>

      <ClosingCTA
        title="See it on one role"
        lead="Create a role, invite one candidate and read the report your team writes. You pay only for completed simulations."
        primary={{ href: "/signup?as=employer", label: "Start hiring" }}
        secondary={{ href: "/pricing", label: "See pricing" }}
      />
    </>
  );
}
