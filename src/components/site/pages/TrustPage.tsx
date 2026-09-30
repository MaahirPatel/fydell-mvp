import type { CSSProperties } from "react";
import s from "../site.module.css";
import Reveal from "../Reveal";
import { Band, Caption, CheckItem, PageHero, Section, SectionHead } from "../primitives";
import { ConsentScreen, HiddenChecks } from "../visuals/panels";
import { ContactLink } from "@/components/ui/ContactLink";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

/** Only controls that exist in the implementation today. */
export const CONTROLS: [string, string][] = [
  [
    "Workspace isolation",
    "Every candidate, invitation, attempt and report belongs to one organisation. Row-level security on the database filters reads by membership, so one workspace cannot read another's rows.",
  ],
  [
    "Scoped invitations",
    "A candidate link is bound to one email address and one version of the simulation, and it expires. Opening it grants access to nothing else in the workspace.",
  ],
  [
    "Authentication",
    "Accounts are managed by Supabase Auth. Fydell never stores passwords. Sessions are cookie-based and verified on the server, and post-login redirects are checked against an allowlist.",
  ],
  [
    "Sealed submissions",
    "On submit the project snapshot is sealed with a sha256 checksum and the attempt becomes read-only through the application. It does not prevent changes by a database administrator.",
  ],
  [
    "Isolated checks",
    "Hidden checks run on the sealed snapshot in an isolated sandbox, not on the candidate's machine and not against any live system.",
  ],
  [
    "Separate candidate and employer views",
    "What a candidate sees is produced separately from the employer's report. Expected answers and reviewer notes never reach the candidate.",
  ],
];

export function ControlsList() {
  return (
    <Reveal as="dl" className={s.faq} style={{ gridTemplateColumns: "1fr" }}>
      {CONTROLS.map(([t, d], n) => (
        <div
          key={t}
          className={`${s.faqItem} ${s.defRow}`}
          data-r="row"
          style={i(n)}
        >
          <dt className={s.h3}>{t}</dt>
          <dd className={s.body}>{d}</dd>
        </div>
      ))}
    </Reveal>
  );
}

export default function TrustPage() {
  return (
    <>
      <PageHero
        title="What Fydell records, checks and claims"
        lead="Hiring is a consequential decision, for the team and for the candidate. This page states what the product does, what it never does, and the controls that exist today."
      />

      <Section tight>
        <SectionHead
          title="Candidates read it first"
          lead="Before a simulation starts, the candidate sees exactly what will be recorded and what never is. Nothing is recorded until they choose to start."
        />
        <Reveal className={`${s.headToVisual} ${s.gridWide}`}>
          <div data-r="visual" style={i(0)}>
            <ConsentScreen />
            <Caption>the consent screen.</Caption>
          </div>
          <div className={s.card} data-r="" style={i(1)}>
            <h3 className={s.h3} style={{ marginBottom: 18 }}>
              Candidates can always
            </h3>
            <ul className={s.checkList}>
              <CheckItem>See the full list of what is recorded before starting</CheckItem>
              <CheckItem>Decline to start, with nothing recorded</CheckItem>
              <CheckItem>Keep a receipt with the checksum of what they submitted</CheckItem>
              <CheckItem>Control who sees their passport, and revoke links</CheckItem>
            </ul>
          </div>
        </Reveal>
      </Section>

      <Section>
        <SectionHead
          title="Checked on the submission, not the person"
          lead="Hidden checks run on the sealed snapshot in an isolated sandbox. They test the code. They do not watch, profile or rate the candidate."
        />
        <Reveal className={s.headToVisual}>
          <div data-r="visual">
            <HiddenChecks />
            <Caption>hidden check results for one submission.</Caption>
          </div>
        </Reveal>
      </Section>

      <Band tone="lavender">
        <SectionHead
          title="What Fydell does not claim"
          lead="Some things hiring tools often promise are not things Fydell can honestly offer. We say so plainly."
        />
        <Reveal className={`${s.headToVisual} ${s.grid2}`}>
          <div className={s.card} data-r="" style={i(0)}>
            <ul className={s.checkList}>
              <CheckItem never>It does not score, rank, rate or compare candidates</CheckItem>
              <CheckItem never>It does not predict how someone will perform in a job</CheckItem>
              <CheckItem never>It does not detect cheating or AI use</CheckItem>
            </ul>
          </div>
          <div className={s.card} data-r="" style={i(1)}>
            <ul className={s.checkList}>
              <CheckItem never>It does not remove bias from hiring; your team still decides</CheckItem>
              <CheckItem never>It does not record screens, cameras, microphones, browsing or keystrokes</CheckItem>
              <CheckItem never>It holds no third-party security certification, and does not imply one</CheckItem>
            </ul>
          </div>
        </Reveal>
      </Band>

      <Section id="security">
        <SectionHead title="Controls in place today" lead="Each of these is implemented now. Nothing on this list is planned work." />
        <div className={s.headToVisual}>
          <ControlsList />
        </div>
        <p className={s.body} style={{ marginTop: 40 }}>
          Questions about any of this? Write to <ContactLink />.
        </p>
      </Section>
    </>
  );
}
