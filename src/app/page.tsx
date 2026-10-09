import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import ProductFrame from "@/components/marketing/site/ProductFrame";
import ProfileWorkspace from "@/components/marketing/site/ProfileWorkspace";
import ApplicantReview from "@/components/marketing/site/ApplicantReview";
import SimulationHero from "@/components/marketing/site/SimulationHero";
import HeroReview from "@/components/marketing/site/HeroReview";
import PaintedStage from "@/components/marketing/site/PaintedStage";
import TintStage from "@/components/marketing/site/TintStage";
import DownloadButton from "@/components/marketing/site/DownloadButton";
import DesktopBand from "@/components/marketing/site/DesktopBand";
import EvidenceGrid from "@/components/marketing/site/EvidenceGrid";
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
        lead="Engineers share real projects and work samples. Hiring teams read the evidence behind every claim, then make the call."
        actions={
          <>
            <DownloadButton />
            <Link href="/sandbox" className="l-btn l-btn-quiet">
              Product tour
            </Link>
          </>
        }
      >
        <PaintedStage painting="hills" priority wash inset="hero">
          <ProductFrame
            size="hero"
            title="Hiring Workspace · Applicants"
            label="A hiring team's workspace: the applicant queue for a backend role, one finding opened to the lines of retry.ts it cites, and the decision brief listing evidence for each requirement."
          >
            <HeroReview />
          </ProductFrame>
        </PaintedStage>
      </CenteredHero>

      <ShowcaseSection
        id="projects"
        title="Your projects, read line by line."
        aside="Every finding links to the code it came from."
        more={{ href: "/products/builder-profiles", label: "Builder Profiles" }}
      >
        <TintStage tint="teal">
          <ProductFrame interactive title="Fydell · Passport" label="One project in an engineer's Passport: its purpose, their part, and a finding opened to the source lines it cites. Select a highlight to open it.">
            <ProfileWorkspace />
          </ProductFrame>
        </TintStage>
      </ShowcaseSection>

      <ShowcaseSection
        id="simulations"
        title="Simulations that feel like the job."
        aside="A real codebase, a brief, and a team to ask."
        more={{ href: "/products/simulations", label: "Simulations" }}
      >
        <TintStage tint="blue">
          <ProductFrame
            chrome="none"
            title="Fydell · Simulation"
            label="A candidate's simulation: the requirement being worked on, the candidate's change to the webhook dispatcher, the public tests now passing, and a short team thread."
          >
            <SimulationHero />
          </ProductFrame>
        </TintStage>
      </ShowcaseSection>

      <ShowcaseSection
        id="evidence"
        title="Every claim has a source."
        aside="Findings, tests and questions stay attached to the work."
        more={{ href: "/products/builder-reports", label: "Builder Reports" }}
      >
        <EvidenceGrid />
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
        <TintStage tint="violet" inset="wide">
          <ProductFrame interactive title="Hiring Workspace · Requirements" label="A hiring team's review of one applicant against the role's requirements. Select a requirement to see the evidence.">
            <ApplicantReview />
          </ProductFrame>
        </TintStage>
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
