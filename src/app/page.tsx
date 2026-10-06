import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import ReportHero from "@/components/marketing/kit/ReportHero";
import {
  Details,
  Hero,
  Section,
  SectionHead,
} from "@/components/marketing/kit/Kit";

export const metadata = {
  title: "The Proof of Work Network for engineers",
  description:
    "Turn selected projects into a source-linked work record. Review the findings, choose what to share, and give hiring teams a closer look at your work.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <MarketingShell>
      <Hero
        title={["The Proof of Work Network", "for engineers."]}
        lead="Turn selected projects into a source-linked work record. Review the findings, choose what to share, and give hiring teams a closer look at your work."
        actions={
          <>
            <Link href="/passport/new" className="l-btn l-btn-lg l-btn-solid">Build your profile</Link>
            <Link href="/demo" className="l-btn l-btn-lg l-btn-ghost">Explore the demo</Link>
          </>
        }
      >
        <div className="l-container" style={{ marginTop: 48 }}>
          <ReportHero />
          <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#526175" }}>
            A Builder Report connects findings about your project to the code behind them.
          </p>
        </div>
      </Hero>

      <Section id="start" labelledBy="start-title">
        <SectionHead
          id="start-title"
          title={["Start with work", "you've already done."]}
          lead="Choose a project and the version you want to share. Keep the review focused on the work that matters."
        />
        <Details
          items={[
            { title: "Import selected GitHub projects", body: "Choose the repositories you want to include." },
            { title: "Explain your contribution", body: "Add context about your role, the problem, and the work you completed." },
            { title: "Review the findings", body: "Inspect the sources and correct the context before sharing." },
          ]}
        />
      </Section>

      <Section id="supports" labelledBy="supports-title">
        <SectionHead
          id="supports-title"
          title={["See what the", "work supports."]}
          lead="Inspect each finding alongside its source. See what was reviewed, what remains uncertain, and where more context is needed."
        />
        <p style={{ fontSize: 15, color: "#526175", maxWidth: "60ch" }}>
          Read the finding. Open the source. Understand the limits.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link href="/demo" className="l-btn l-btn-lg l-btn-ghost">Explore a sample report</Link>
        </p>
      </Section>

      <Section id="record" labelledBy="record-title">
        <SectionHead
          id="record-title"
          title={["Build a record", "you can keep using."]}
          lead="Bring selected projects and work samples together in one profile."
        />
        <Details
          items={[
            { title: "Choose what you share", body: "Include the projects and findings relevant to the opportunity." },
            { title: "Keep the source attached", body: "Let a reviewer move from a finding to its supporting evidence." },
            { title: "Control access", body: "Preview your shared profile and revoke the link when you need to." },
          ]}
        />
      </Section>

      <Section id="share" labelledBy="share-title">
        <SectionHead
          id="share-title"
          title={["Choose", "what to share."]}
          lead="Review the shared view before sending your profile to a hiring team."
        />
      </Section>

      <Section id="simulations" labelledBy="simulations-title">
        <SectionHead
          id="simulations-title"
          title={["Show more through", "a realistic task."]}
          lead="Work through an engineering problem and add the resulting code, tests and handoff to your record."
          link={{ href: "/product", label: "Explore a simulation" }}
        />
      </Section>

      <Section id="hiring-teams" labelledBy="hiring-teams-title">
        <SectionHead
          id="hiring-teams-title"
          eyebrow="For hiring teams"
          title={["Follow", "the evidence."]}
          lead="Review relevant work, open its sources, and identify what to ask next."
        />
        <p style={{ marginTop: 16 }}>
          <Link href="/employers" className="l-btn l-btn-lg l-btn-ghost">Explore Fydell for hiring teams</Link>
        </p>
      </Section>

      <Section id="trust" labelledBy="trust-title">
        <SectionHead
          id="trust-title"
          title={["Clear about what", "it will not do."]}
          lead="Hiring is a decision about a person. Fydell gives your team evidence and stays out of the judgement."
          link={{ href: "/trust", label: "Read the trust page" }}
        />
      </Section>

      <div className="l-container" style={{ textAlign: "center", paddingBottom: 96, paddingTop: 48 }}>
        <h2 style={{ fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", color: "#142033", marginBottom: 16 }}>
          Put your work on the record.
        </h2>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
          <Link href="/passport/new" className="l-btn l-btn-lg l-btn-solid">Build your profile</Link>
        </div>
        <p style={{ marginTop: 16 }}>
          <Link href="/employers" className="l-link" style={{ fontSize: 14 }}>
            Explore Fydell for hiring teams
          </Link>
        </p>
      </div>
    </MarketingShell>
  );
}
