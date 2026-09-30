import SiteShell from "@/components/site/SiteShell";
import PricingPage from "@/components/site/pages/PricingPage";

export const metadata = {
  title: "Pricing",
  description:
    "Free for engineers. Hiring teams pay per completed simulation; invitations, expired links and failures on our side are never billed.",
};

export default function Page() {
  return (
    <SiteShell>
      <PricingPage />
    </SiteShell>
  );
}
