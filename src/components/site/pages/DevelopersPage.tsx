import type { CSSProperties } from "react";
import s from "../site.module.css";
import Reveal from "../Reveal";
import {
  Band,
  ButtonLink,
  Caption,
  CheckItem,
  ClosingCTA,
  FAQ,
  FeatureTrio,
  PageHero,
  Section,
  SectionHead,
  Stage,
} from "../primitives";
import { ConsentChecklist, PassportCard, DesktopWindow } from "../Illustrations";
import { ConsentScreen, PassportBuilderMock, PassportView, Receipt } from "../visuals/panels";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

export default function DevelopersPage() {
  return (
    <>
      <PageHero
        title="Build your passport from code you already wrote"
        lead="Point Fydell at your public GitHub repositories. It reads them at a pinned commit and links every finding to the exact lines. You decide who sees it, and you can take it back."
        actions={
          <>
            <ButtonLink href="/passport/new">Build your passport</ButtonLink>
            <ButtonLink href="/download" variant="secondary">
              Download the app
            </ButtonLink>
          </>
        }
      >
        <Stage>
          <PassportView />
        </Stage>
        <Caption>a passport for the ledger-sync repository.</Caption>
      </PageHero>

      <Section>
        <FeatureTrio
          items={[
            {
              title: "Cited, line by line",
              body: "Every finding points at a line range in your repository at a pinned commit, so anyone can check it.",
              art: <PassportCard />,
              glow: "blue",
            },
            {
              title: "Shared on your terms",
              body: "Share with a link you control. Revoke it and access ends at once. Nothing is public by default.",
              art: <ConsentChecklist />,
              glow: "teal",
            },
            {
              title: "One app for invitations",
              body: "When a team invites you to a simulation, it runs in the desktop app on macOS or Windows. Free, like the passport.",
              art: <DesktopWindow />,
              glow: "violet",
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHead
          title="Pick the repositories, pin the commit"
          lead="Paste your GitHub profile, choose the public repositories that show your work, and Fydell reads each one at the commit you pin. Try it without an account; sign up to save it."
        />
        <Reveal className={`${s.headToVisual} ${s.gridWide}`}>
          <div data-r="visual" style={i(0)}>
            <PassportBuilderMock />
            <Caption>choosing two repositories.</Caption>
          </div>
          <div className={s.card} data-r="" style={i(1)}>
            <h3 className={s.h3} style={{ marginBottom: 18 }}>
              What Fydell reads
            </h3>
            <ul className={s.checkList}>
              <CheckItem>Public repositories you select, at the commit you pin</CheckItem>
              <CheckItem>The code and tests in those repositories</CheckItem>
              <CheckItem never>Private repositories, or anything you did not select</CheckItem>
              <CheckItem never>Your activity outside those repositories</CheckItem>
            </ul>
            <div style={{ marginTop: 24 }}>
              <ButtonLink href="/passport/new" variant="secondary" size="sm">
                Start building
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </Section>

      <Band tone="rose">
        <SectionHead
          title="When an employer invites you"
          lead="Some teams will invite you to a simulation: a real incident in a real codebase, in the Fydell desktop app. You read exactly what is recorded before you start, and you keep a receipt of what you submitted."
        />
        <Reveal className={`${s.headToVisual} ${s.grid2}`}>
          <div data-r="visual" style={i(0)}>
            <ConsentScreen />
            <Caption>what you see before starting.</Caption>
          </div>
          <div data-r="visual" style={i(1)}>
            <Receipt />
            <Caption>your receipt after submitting.</Caption>
          </div>
        </Reveal>
      </Band>

      <Section>
        <SectionHead title="Questions engineers ask" />
        <div className={s.headToVisual}>
          <FAQ
            items={[
              {
                q: "Is the passport public?",
                a: "No. It is private until you create a share link, and each link can be revoked.",
              },
              {
                q: "Does it give me a score?",
                a: "No. Findings describe what the code shows and cite the lines. There is no score, rating or ranking.",
              },
              {
                q: "What does a simulation record?",
                a: "Files you change, commands you run in the Fydell terminal, test runs and timing, and messages to the simulated team. Never your screen, camera, microphone, browsing or keystrokes.",
              },
              {
                q: "Can I practise simulations?",
                a: "Simulations are invite-only; employers choose who takes them. The passport is always open to you.",
              },
            ]}
          />
        </div>
      </Section>

      <ClosingCTA
        title="Show the work you have already done"
        lead="It takes a GitHub URL and a few minutes. It is free, and it stays yours."
        primary={{ href: "/passport/new", label: "Build your passport" }}
        secondary={{ href: "/trust", label: "How your data is handled" }}
      />
    </>
  );
}
