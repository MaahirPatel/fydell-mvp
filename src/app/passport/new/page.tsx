import { redirect } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
import { Hero } from "@/components/marketing/kit/Kit";
import PassportWizard from "@/components/candidate/PassportWizard";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = {
  title: "Build your Engineering Passport",
  description: "Paste your GitHub profile and see what your public code demonstrates, with every finding linked to the exact lines.",
  alternates: { canonical: "/passport/new" },
};
export const dynamic = "force-dynamic";

export default async function NewPassportPage() {
  if (await requireUser()) redirect("/app/candidate/passport/build");
  return (
    <MarketingShell>
      <Hero
        compact
        title={["Engineering Passport"]}
        lead="Type your GitHub username and pick up to three projects. We point to the exact lines that show what you can do."
      >
        <div className="l-container" style={{ marginTop: 56, paddingBottom: 120, textAlign: "left" }}>
          <PassportWizard signedIn={false} />
        </div>
      </Hero>
    </MarketingShell>
  );
}
