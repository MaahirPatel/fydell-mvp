import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";
import HeroShortlistScene from "@/components/marketing/home/HeroShortlistScene";
import HomeProductStory from "@/components/marketing/home/HomeProductStory";
import HomeMotionController from "@/components/marketing/home/HomeMotionController";
import styles from "@/components/marketing/home/homepage.module.css";

export const metadata = {
  title: "Find people who can actually do the work",
  description:
    "Fydell finds technical customer-facing talent, puts candidates through realistic changing work, and returns the people worth interviewing.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <HomeMotionController />
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroCopy} data-hero-copy>
              <h1 className={styles.heroTitle}>
                <span>The hiring system for</span>
                <span>finding people who can</span>
                <span>actually do the work.</span>
              </h1>
              <div className={styles.actions}>
                <ButtonLink href="/signup" variant="primary">
                  Get started
                </ButtonLink>
                <ButtonLink href="/how-it-works" variant="soft">
                  See how it works
                </ButtonLink>
              </div>
            </div>
            <div data-hero-stage>
              <HeroShortlistScene />
            </div>
          </div>
        </section>
        <HomeProductStory />
      </div>
    </MarketingShell>
  );
}
