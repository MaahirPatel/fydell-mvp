import SiteShell from "@/components/site/SiteShell";
import DesignSystemPage from "@/components/site/design/DesignSystemPage";

export const metadata = {
  title: "Visual system",
  description: "Fydell tokens, components, motion and rationale.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <SiteShell>
      <DesignSystemPage />
    </SiteShell>
  );
}
