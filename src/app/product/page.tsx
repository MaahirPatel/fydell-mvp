import MarketingShell from "@/components/layout/MarketingShell";
import {
  Closing,
  Details,
  Hero,
  Section,
  SectionHead,
  Timeline,
  Visual,
} from "@/components/marketing/kit/Kit";
import { BriefShot, DesktopShot, ReceiptShot, ReportShot, TestsShot, TrailShot } from "@/components/marketing/kit/Shots";

export const metadata = {
  title: "Product",
  description:
    "How a Fydell engineering simulation runs, from the invitation to the team's decision: the desktop app, the disclosed work trail, hidden checks and the cited report.",
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <Hero
        compact
        title={["From invitation", "to decision"]}
        lead="One engineering loop, the same for every candidate. Here is each step, what the candidate sees, and what your team gets."
      >
        <Section tight>
          <Timeline
            items={[
              { title: "Invite", body: "Your team picks the simulation and invites candidates.", meta: "01" },
              { title: "Work", body: "The candidate works the incident in the desktop app.", meta: "02", tone: "blue" },
              { title: "Update", body: "The team changes one requirement partway through.", meta: "03", tone: "red" },
              { title: "Submit", body: "Sealed archive, three-part handoff, receipt.", meta: "04" },
              { title: "Decide", body: "Hidden checks, a cited report, a team decision.", meta: "05", tone: "blue" },
            ]}
          />
        </Section>
      </Hero>

      <Section id="brief" labelledBy="brief-title">
        <SectionHead
          id="brief-title"
          title={["1. The brief and", "the team"]}
          lead="Every simulation opens on an incident written by the team that owns the service: what happened, what they need, and what is out of scope. Two simulated teammates answer questions from a fixed set of written answers, and say so if asked."
        />
        <Visual label="Example: the INC-2291 brief with the team thread">
          <BriefShot />
        </Visual>
      </Section>

      <Section id="work" labelledBy="work-title">
        <SectionHead
          id="work-title"
          title={["2. The work, in", "the desktop app"]}
          lead="The Fydell app for macOS and Windows sets up the project, runs the setup check, and keeps the brief, the team thread and the timer beside the code. Candidates can edit in whichever editor they prefer."
          link={{ href: "/download", label: "Download Fydell" }}
        />
        <Visual label="Example: a candidate mid-simulation in the Fydell desktop app">
          <DesktopShot />
        </Visual>
        <Details
          items={[
            { title: "Setup check first", body: "Confirms the project runs before any work starts." },
            { title: "Brief, team and timer", body: "Always one click away from the code." },
            { title: "Disclosed recording", body: "A persistent indicator while the trail is being recorded." },
          ]}
        />
      </Section>

      <Section id="update" labelledBy="update-title">
        <SectionHead
          id="update-title"
          title={["3. One requirement", "changes"]}
          lead="Partway through, the team posts one requirement update in the thread and under Updates. It is the same update, at the same point, for every candidate. The trail shows what they did next."
        />
        <Visual label="Example: the work trail, including the requirement update">
          <TrailShot />
        </Visual>
      </Section>

      <Section id="submit" labelledBy="submit-title">
        <SectionHead
          id="submit-title"
          title={["4. Submit, hand off,", "keep a receipt"]}
          lead="On submit the project is packaged and hashed. The candidate answers three questions (what changed, what they tested, what remains unresolved) and gets a receipt with the checksum."
        />
        <Visual label="Example: a submission receipt" fade={false}>
          <ReceiptShot />
        </Visual>
      </Section>

      <Section id="checks" labelledBy="checks-title">
        <SectionHead
          id="checks-title"
          title={["5. Hidden checks,", "then the report"]}
          lead="Fydell runs hidden checks against the sealed submission in an isolated sandbox, through the public interface described in the brief. Your reviewers then see the diff, the results and the trail together."
          link={{ href: "/security", label: "How the sandbox works" }}
        />
        <Visual label="Example: hidden checks against a submitted snapshot">
          <TestsShot />
        </Visual>
      </Section>

      <Section id="report" labelledBy="report-title">
        <SectionHead
          id="report-title"
          title={["6. Your team writes", "it and decides"]}
          lead="Reviewers write findings, each one citing its evidence, and label observations separately from gaps. The report cannot be released until every finding is cited. Then the team records Advance, Hold or Decline."
          link={{ href: "/employers", label: "Fydell for hiring teams" }}
        />
        <Visual label="Example: a cited report with the team's decision">
          <ReportShot />
        </Visual>
      </Section>

      <Closing title={["See it on", "a real role."]} secondary={{ href: "/demo", label: "Open the demo" }} />
    </MarketingShell>
  );
}
