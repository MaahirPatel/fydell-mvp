import MarketingShell from "@/components/layout/MarketingShell";
import FydellHome from "@/components/marketing/home/FydellHome";

export const metadata = {
  title: { absolute: "Fydell: Hire engineers for the work they've done" },
  description:
    "Fydell runs real engineering simulations. You review the code, not the résumé.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <FydellHome />
    </MarketingShell>
  );
}
