import MarketingShell from "@/components/layout/MarketingShell";
import { HeroCinematic } from "@/components/marketing/v3/HeroCinematic";
import { MarqueeTypography } from "@/components/marketing/v3/MarqueeTypography";
import { BentoEvidence } from "@/components/marketing/v3/BentoEvidence";
import { StickyStackChapters } from "@/components/marketing/v3/StickyStackChapters";
import { FooterCTA } from "@/components/marketing/v3/FooterCTA";

export const metadata = {
  title: "Fydell | A work-evidence system for hiring",
  description: "Fydell gives one candidate a real problem, then gives your team a conclusion you can open claim by claim. Create a workspace and invite your first candidate.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      {/* 
        AIDA Framework Applied (gpt-taste skill):
        1. Attention (HeroCinematic) - Wide container, cinematic spacing, max 2-3 lines.
        2. Infinite Marquee - Typographic trust signals.
        3. Interest (BentoEvidence) - Gapless grid-flow-dense.
        4. Desire (StickyStackChapters) - GSAP scroll pinning chapters.
        5. Action (FooterCTA) - Massive high-contrast action.
      */}
      
      <HeroCinematic />
      <MarqueeTypography />
      <BentoEvidence />
      <StickyStackChapters />
      <FooterCTA />
      
    </MarketingShell>
  );
}
