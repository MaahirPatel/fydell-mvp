import MarketingShell from "@/components/layout/MarketingShell";
import DownloadClient from "@/components/marketing/DownloadClient";

export const metadata = {
  title: "Download",
  description:
    "Download the Fydell desktop simulation client for Windows, macOS, and Linux. Installers publish with v0.1.0.",
};

export default function DownloadPage() {
  return (
    <MarketingShell>
      <DownloadClient />
    </MarketingShell>
  );
}
