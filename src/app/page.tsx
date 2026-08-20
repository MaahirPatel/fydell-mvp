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
            <div className={styles.heroCopy}>
              <h1 className={styles.heroTitle}>
                The hiring system for finding people who can actually do the work.
              </h1>
              <div className={styles.actions}>
                <ButtonLink href="/signup" variant="primary">
                  Get started
                </ButtonLink>
                <ButtonLink href="/contact" variant="soft">
                  Contact sales
                </ButtonLink>
              </div>
            </div>
            <HeroShortlistScene />
            <p className={styles.illustrativeNote}>Illustrative product view</p>
          </div>
        </section>
        <HomeProductStory />
      </div>
    </MarketingShell>
  );
}
