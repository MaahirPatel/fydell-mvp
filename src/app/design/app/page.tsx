import SiteShell from "@/components/site/SiteShell";
import AppCompsPage from "@/components/site/design/AppCompsPage";

export const metadata = {
  title: "Product app comps",
  description: "Employer workspace and candidate desktop app screens.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <SiteShell>
      <AppCompsPage />
    </SiteShell>
  );
}
