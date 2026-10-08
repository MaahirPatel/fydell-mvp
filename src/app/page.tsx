import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import ProfileWorkspace from "@/components/marketing/site/ProfileWorkspace";
import ApplicantReview from "@/components/marketing/site/ApplicantReview";
import SimulationWorkspace from "@/components/marketing/site/SimulationWorkspace";
import SimulationHero from "@/components/marketing/site/SimulationHero";
import PaintedStage from "@/components/marketing/site/PaintedStage";
import DownloadButton from "@/components/marketing/site/DownloadButton";
import DesktopBand from "@/components/marketing/site/DesktopBand";
import { Announcement, CenteredClosing, CenteredHero, ShowcaseSection, Tiles } from "@/components/marketing/site/Home";
import { LATEST } from "@/components/marketing/site/releases";

export const metadata = {
  title: { absolute: "Fydell: Engineering work, ready to be seen" },
  description:
    "Fydell turns real projects and realistic simulations into evidence hiring teams can read. Free for engineers.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <MarketingShell>
      <CenteredHero
        announcement={<Announcement href="/changelog" label={`Fydell Desktop ${LATEST.version}`} action="See what's new" />}
        title="Engineering work, ready to be seen."
        lead="Fydell turns real projects and realistic simulations into evidence hiring teams can read."
        actions={
          <>
            <DownloadButton />
            <Link href="/signup" className="l-btn l-btn-quiet">
              Sign up
            </Link>
          </>
        }
      >
        <PaintedStage painting="hills" priority wash>
          <ProductFrame
            size="hero"
            chrome="none"
            title="Fydell · Simulation"
            label="A candidate's simulation in the Fydell desktop app: the INC-2291 incident with its activity and public test run, and the team thread docked on the right with a teammate's answer and the candidate's changed files."
          >
            <SimulationHero />
          </ProductFrame>
        </PaintedStage>
      </CenteredHero>

      <ShowcaseSection
        id="projects"
        title="Your projects, read line by line."
        aside="Every finding links to the code it came from."
        more={{ href: "/products/builder-profiles", label: "Builder Profiles" }}
      >
        <PaintedStage painting="coast">
          <ProductFrame interactive title="Fydell · Passport" label="An engineer's Passport: selected projects, the open project's contribution, and one finding with the source lines it cites. Select a project or a finding.">
            <ProfileWorkspace />
          </ProductFrame>
        </PaintedStage>
      </ShowcaseSection>

      <ShowcaseSection
        id="simulations"
        title="Simulations that feel like the job."
        aside="A real codebase, a brief, and a team to ask."
        more={{ href: "/products/simulations", label: "Simulations" }}
      >
        <PaintedStage painting="field">
          <ProductFrame tag="Preview" title="Simulation · Webhook retry incident" label="A candidate's simulation: the brief and requirements, the project files, a public test run, and the team thread docked beside the brief.">
            <SimulationWorkspace />
          </ProductFrame>
        </PaintedStage>
      </ShowcaseSection>

      <ShowcaseSection
        id="employers"
        title="One workspace for hiring teams."
        aside="Read each applicant requirement by requirement."
        more={{ href: "/products/hiring-workspace", label: "Hiring Workspace" }}
        after={
          <Tiles
            items={[
              { title: "Questions by requirement", body: "Ask about anything the shared work doesn't cover." },
              { title: "Chosen sharing", body: "Engineers pick the projects and versions you see." },
              { title: "Your decision", body: "No scores or rankings. Your team decides." },
            ]}
          />
        }
      >
        <PaintedStage painting="hills" inset="wide">
          <ProductFrame interactive title="Hiring Workspace · Applicants" label="A hiring team's review of one applicant against the role's requirements. Select a requirement to see the evidence.">
            <ApplicantReview />
          </ProductFrame>
        </PaintedStage>
      </ShowcaseSection>

      <DesktopBand />

      <CenteredClosing
        title="Show your work."
        actions={
          <>
            <Link href="/signup" className="l-btn l-btn-solid">
              Sign up free
            </Link>
            <Link href="/contact" className="l-btn l-btn-quiet">
              Contact sales
            </Link>
          </>
        }
      />
    </MarketingShell>
  );
}
