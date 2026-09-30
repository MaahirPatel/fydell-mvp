import SiteShell from "@/components/site/SiteShell";
import DownloadPage from "@/components/site/pages/DownloadPage";

export const metadata = {
  title: "Download",
  description:
    "The Fydell desktop app for macOS and Windows, where invited simulations run.",
};

export default function Page() {
  return (
    <SiteShell>
      <DownloadPage />
    </SiteShell>
  );
}
