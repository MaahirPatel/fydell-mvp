import MarketingShell from "@/components/layout/MarketingShell";
import { EvidenceChain, ExhibitClosing, ExhibitHero, Reveal, ReviewStage, Steps } from "@/components/marketing/exhibit/Exhibit";
import { SAMPLE_PASSPORT, SAMPLE_REQUIREMENT_FIT, SAMPLE_ROLE } from "@/lib/marketing/sample-passport";

export const metadata = {
  title: { absolute: "Fydell: Engineering careers, backed by real work" },
  description:
    "Engineers turn selected projects into a shareable Passport, with findings linked to the source. Hiring teams review that evidence against the role.",
  alternates: { canonical: "/" },
};

/*
 * Six chapters: the Passport, one finding opened up, the chain of evidence
 * behind it, the three steps, the hiring team's review, and the close.
 * Detail lives on /candidates, /employers and /product.
 */
export default function HomePage() {
  return (
    <MarketingShell>
      <ExhibitHero
        passport={SAMPLE_PASSPORT}
        title={["Show what you've built.", "See what someone can do."]}
        lead="A Passport of real projects. Every finding opens the code it came from."
        primary={{ href: "/passport/new", label: "Build your Passport" }}
        secondary={{ href: "/demo", label: "Explore the demo" }}
        label="Example: an Engineering Passport for a fictional engineer, with the code, commit, finding and limit it is built from."
        caption="Example Passport. Fictional engineer and project."
      />

      <Reveal
        id="reveal"
        passport={SAMPLE_PASSPORT}
        title="Evidence you can open."
        lead="Each finding in a Builder Report is four things at once."
        label="Example: a Builder Report finding for a fictional project, with the lines it cites, the commit and its limits."
      />

      <EvidenceChain
        passport={SAMPLE_PASSPORT}
        title="Every claim points to a line."
        lead="No score stands in for the work. The work stands for itself."
        label="Example: the source line a finding rests on, magnified."
      />

      <Steps id="how" passport={SAMPLE_PASSPORT} title={["Three steps.", "No scores."]} />

      <ReviewStage
        id="review"
        passport={SAMPLE_PASSPORT}
        role={SAMPLE_ROLE}
        fit={SAMPLE_REQUIREMENT_FIT}
        kicker="For hiring teams"
        title="One role. One link. A clearer review."
        lead="Read each application requirement by requirement. Your team decides."
        link={{ href: "/employers", label: "Fydell for hiring teams" }}
        label="Example: a hiring team's requirement-by-requirement review of a fictional application."
      />

      <ExhibitClosing
        title="Bring your work into the conversation."
        primary={{ href: "/passport/new", label: "Build your Passport" }}
        secondary={{ href: "/signup?as=employer", label: "Hiring? Create a role" }}
        fineprint="Figures and code on this page come from a fictional example project, example/webhook-relay. Findings are read from code; they don't prove who wrote each line or predict how someone will perform. Revoking a link stops it, but copies someone already saved can't be recalled."
      />
    </MarketingShell>
  );
}
