import s from "../site.module.css";
import Reveal from "../Reveal";
import {
  ArrowLink,
  Band,
  ButtonLink,
  Caption,
  ClosingCTA,
  FAQ,
  FeatureTrio,
  PageHero,
  Section,
  SectionHead,
  Stage,
} from "../primitives";
import { DecisionStack, ReportDoc, IncidentRipple } from "../Illustrations";
import { AttemptReview, ReportEditor, RoleDetail } from "../visuals/app";
import { CitedReport } from "../visuals/panels";

export default function EmployersPage() {
  return (
    <>
      <PageHero
        title="Decide on work your team can cite"
        lead="Invite candidates to a real engineering incident. Review what they changed, ran and asked. Write a report where every finding points at the evidence, then record your decision."
        actions={
          <>
            <ButtonLink href="/signup?as=employer">Start hiring</ButtonLink>
            <ButtonLink href="/pricing" variant="secondary">
              See pricing
            </ButtonLink>
          </>
        }
      >
        <Stage>
          <RoleDetail />
        </Stage>
        <Caption>a role with six invited candidates.</Caption>
      </PageHero>

      <Section>
        <FeatureTrio
          items={[
            {
              title: "Real incidents, invite-only",
              body: "Candidates reach a simulation only through your invitation. There is no public catalogue to practise on.",
              art: <IncidentRipple />,
              glow: "red",
            },
            {
              title: "Your reviewers write it",
              body: "Fydell organises the evidence. The findings, and the words in them, belong to your team.",
              art: <ReportDoc />,
              glow: "blue",
            },
            {
              title: "Your team decides",
              body: "Advance, Hold or Decline, recorded by you. Nothing is sent to the candidate automatically.",
              art: <DecisionStack />,
              glow: "violet",
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHead
          title="Review the attempt, not a summary of it"
          lead="The code changes, the full work trail, hidden check results and the candidate's handoff answers sit side by side, all from the same sealed snapshot."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <AttemptReview />
            <Caption>reviewing Candidate 04.</Caption>
          </div>
        </Reveal>
      </Section>

      <Band tone="lavender">
        <SectionHead
          title="Nothing is released without evidence"
          lead="Each finding needs a citation: a file and line, a test, a thread message or a handoff answer. Until every finding has one, the report cannot be released."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <ReportEditor />
            <Caption>a draft with one uncited finding, so release is blocked.</Caption>
          </div>
        </Reveal>
      </Band>

      <Section>
        <SectionHead
          title="A decision your team can explain"
          lead="The released report reads the same to everyone who opens it. It carries no score, so the conversation stays on what the candidate did."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <Stage quiet>
              <CitedReport decision="Hold" />
            </Stage>
            <Caption>a released report with the team&apos;s decision recorded as Hold.</Caption>
          </div>
        </Reveal>
        <div className={s.linkRow}>
          <ArrowLink href="/trust">What candidates are told</ArrowLink>
        </div>
      </Section>

      <Section>
        <SectionHead title="Questions hiring teams ask" />
        <div className={s.headToVisual}>
          <FAQ
            items={[
              {
                q: "Does Fydell score or rank candidates?",
                a: "No. There is no score, rating, percentile or ranking anywhere in the product. Your reviewers write findings and record a decision.",
              },
              {
                q: "Does Fydell detect cheating or AI use?",
                a: "No, and it does not claim to. It records the work trail the candidate agreed to, and your team judges the work.",
              },
              {
                q: "What do we pay for?",
                a: "Completed simulations only. Invitations, expired links, abandoned attempts and runs that fail on our side are never billed.",
              },
              {
                q: "Who sees the report?",
                a: "Members of your workspace. Recording a decision sends nothing to the candidate.",
              },
              {
                q: "How long does a simulation take?",
                a: "Each incident states its time limit, typically about an hour. The timer starts when the candidate opens the brief.",
              },
              {
                q: "What does the candidate need?",
                a: "The Fydell desktop app on macOS or Windows. The app prepares the project; there is nothing else to install.",
              },
            ]}
          />
        </div>
      </Section>

      <ClosingCTA
        title="Start with one role"
        lead="Set up a role, invite a candidate, and read your first cited report."
        primary={{ href: "/signup?as=employer", label: "Start hiring" }}
        secondary={{ href: "/contact", label: "Talk to us" }}
      />
    </>
  );
}
