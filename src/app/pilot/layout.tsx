import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = {
  title: "Pilot Testing · Fydell",
  description:
    "A guided path for pilot testers: run one five-minute work simulation, review the evidence Fydell produces, and tell us what to improve.",
};

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
