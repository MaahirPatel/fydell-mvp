import SiteShell from "@/components/site/SiteShell";
import SecurityPage from "@/components/site/pages/SecurityPage";

export const metadata = {
  title: "Security",
  description:
    "The security controls Fydell has implemented today.",
};

export default function Page() {
  return (
    <SiteShell>
      <SecurityPage />
    </SiteShell>
  );
}
