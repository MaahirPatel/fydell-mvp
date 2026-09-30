import SiteShell from "@/components/site/SiteShell";
import TrustPage from "@/components/site/pages/TrustPage";

export const metadata = {
  title: "Trust",
  description:
    "What Fydell records, what it never records, how work is checked, what it does not claim, and the security controls in place today.",
};

export default function Page() {
  return (
    <SiteShell>
      <TrustPage />
    </SiteShell>
  );
}
