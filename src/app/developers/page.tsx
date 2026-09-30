import SiteShell from "@/components/site/SiteShell";
import DevelopersPage from "@/components/site/pages/DevelopersPage";

export const metadata = {
  title: "For developers",
  description:
    "Build an Engineering Passport from your public GitHub repositories, with findings linked to exact lines and share links you can revoke. Free for engineers.",
};

export default function Page() {
  return (
    <SiteShell>
      <DevelopersPage />
    </SiteShell>
  );
}
