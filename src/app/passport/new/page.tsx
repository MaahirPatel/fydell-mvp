import { redirect } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
import { Hero } from "@/components/marketing/kit/Kit";
import PassportBuilder from "@/components/passport/PassportBuilder";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = {
  title: "Build your Engineering Passport",
  description: "Paste your GitHub profile and see what your public code demonstrates, with every finding linked to the exact lines.",
  alternates: { canonical: "/passport/new" },
};
export const dynamic = "force-dynamic";

export default async function NewPassportPage() {
  if (await requireUser()) redirect("/app/candidate/work-record");
  return (
    <MarketingShell>
      <Hero
        compact
        title={["Engineering Passport"]}
        lead="Paste your GitHub profile. Fydell cites what your public code demonstrates, line by line."
      >
        <div className="l-container" style={{ marginTop: 56, paddingBottom: 120 }}>
          <PassportBuilder signedIn={false} />
        </div>
      </Hero>
    </MarketingShell>
  );
}
