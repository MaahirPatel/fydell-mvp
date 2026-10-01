import MarketingShell from "@/components/layout/MarketingShell";
import { Hero, Section, Timeline } from "@/components/marketing/kit/Kit";
import { Chapters, ClosingPanel } from "@/components/marketing/kit/Calm";

export const metadata = {
  title: "Product",
  description:
    "How a Fydell engineering simulation runs, from the invitation to the team's decision: the desktop app, the disclosed work trail, hidden checks and the cited report.",
  alternates: { canonical: "/product" },
};

export default function ProductPage() {
  return (
    <MarketingShell>
      <Hero
        compact
        title={["How it works"]}
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

      <Section>
        <Chapters
          items={[
            {
              id: "brief",
              title: "The brief and the team",
              body: "Every simulation opens on an incident written by the team that owns the service: what happened, what they need, and what is out of scope.",
              points: [
                "Two simulated teammates answer from a fixed set of written answers, and say so if asked",
                "Every candidate gets the same information",
              ],
            },
            {
              id: "work",
              title: "The work, in the desktop app",
              body: "The Fydell app for macOS and Windows sets up the project, runs the setup check, and keeps the brief, the team thread and the timer beside the code.",
              points: ["Setup check first, before any work starts", "Edit in whichever editor you prefer", "A persistent indicator while the trail is recorded"],
              link: { href: "/download", label: "Download Fydell" },
            },
            {
              id: "update",
              title: "One requirement changes",
              body: "Partway through, the team posts one requirement update in the thread and under Updates. It is the same update, at the same point, for every candidate.",
              points: ["The work trail shows what they did next"],
            },
            {
              id: "submit",
              title: "Submit, hand off, keep a receipt",
              body: "On submit the project is packaged and hashed. The candidate answers short handoff questions and gets a receipt with the checksum.",
              points: ["What changed, how it was tested, what is still unsure, what comes next", "The receipt matches the copy the employer reviews"],
            },
            {
              id: "checks",
              title: "Hidden checks, then the report",
              body: "Fydell runs hidden checks against the sealed submission in an isolated sandbox. Reviewers then see the diff, the results and the trail together.",
              link: { href: "/security", label: "How the sandbox works" },
            },
            {
              id: "report",
              title: "Your team writes it and decides",
              body: "Reviewers write findings, each one citing its evidence, and label observations separately from gaps. Then the team records Advance, Hold or Decline.",
              points: ["The report cannot be released until every finding is cited", "There is no score"],
              link: { href: "/employers", label: "Fydell for hiring teams" },
            },
          ]}
        />
      </Section>

      <ClosingPanel title={["See it on", "a real role."]} secondary={{ href: "/demo", label: "Open the demo" }} />
    </MarketingShell>
  );
}
