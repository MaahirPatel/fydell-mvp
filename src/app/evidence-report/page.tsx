import { redirect } from "next/navigation";

export const metadata = {
  title: "Fictional Applied AI evidence demo",
  description:
    "Inspect the fictional Applied AI Engineer sandbox evidence trail, reviewed claims, and explicit limitations.",
};

export default function EvidenceReportPage() {
  redirect("/sandbox/evidence");
}
