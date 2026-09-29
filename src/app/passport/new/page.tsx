import { redirect } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
import { Hero } from "@/components/marketing/kit/Kit";
import PassportBuilder from "@/components/passport/PassportBuilder";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = {
  title: "Build your Engineering Passport",
  description: "Paste your GitHub profile and see what your public code demonstrates, with every finding linked to the exact lines.",
};
export const dynamic = "force-dynamic";

export default async function NewPassportPage() {
  if (await requireUser()) redirect("/app/candidate/profile");
  return (
    <MarketingShell>
      <Hero
        compact
        title={["Build your", "Engineering Passport"]}
        lead="Paste your GitHub profile. Fydell reads the public repositories you choose at a pinned commit and shows what the code demonstrates, citing the exact lines. Try it without an account; sign up to save and share it."
      >
        <div className="l-container" style={{ marginTop: 56, paddingBottom: 120 }}>
          <PassportBuilder signedIn={false} />
        </div>
      </Hero>
    </MarketingShell>
  );
}
