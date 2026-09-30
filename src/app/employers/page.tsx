import SiteShell from "@/components/site/SiteShell";
import EmployersPage from "@/components/site/pages/EmployersPage";

export const metadata = {
  title: "For employers",
  description:
    "Invite candidates to a real engineering incident, review what they changed, ran and asked, and decide on a report where every finding cites evidence.",
};

export default function Page() {
  return (
    <SiteShell>
      <EmployersPage />
    </SiteShell>
  );
}
