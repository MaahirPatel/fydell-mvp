import FydellHome from "@/components/marketing/home/FydellHome";

export const metadata = {
  title: { absolute: "Fydell: Hire engineers for the work they've done" },
  description:
    "Fydell runs real engineering simulations. You review the code, not the résumé.",
};

export default function HomePage() {
  // FydellHome renders its own unified nav/footer (UnifiedChrome), so the
  // shared MarketingShell is intentionally not used here: it would render a
  // second nav and footer.
  return <FydellHome />;
}
