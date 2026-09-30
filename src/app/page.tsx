import SiteShell from "@/components/site/SiteShell";
import HomePage from "@/components/site/pages/HomePage";

export const metadata = {
  title: { absolute: "Fydell: Hire engineers on the work itself" },
  description:
    "Candidates work a real incident in a real codebase. Your team reviews what they changed, ran and asked, and decides on evidence it can cite.",
};

export default function Page() {
  return (
    <SiteShell>
      <HomePage />
    </SiteShell>
  );
}
