import MarketingShell from "@/components/layout/MarketingShell";
import FydellHome from "@/components/marketing/home/FydellHome";

export const metadata = {
  title: { absolute: "Fydell: Hiring infrastructure built on real engineering work" },
  description:
    "Engineering Passports from real repositories, simulations in working codebases, and evidence every reviewer can open, check, and decide on.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <FydellHome />
    </MarketingShell>
  );
}
