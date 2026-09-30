import SiteShell from "@/components/site/SiteShell";
import ProductPage from "@/components/site/pages/ProductPage";

export const metadata = {
  title: "How it works",
  description:
    "One incident, from brief to decision: the desktop app, the disclosed work trail, hidden checks on the submitted snapshot, and the report your team writes.",
};

export default function Page() {
  return (
    <SiteShell>
      <ProductPage />
    </SiteShell>
  );
}
