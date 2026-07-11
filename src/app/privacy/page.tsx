import MarketingShell from "@/components/layout/MarketingShell";
import { Container } from "@/components/marketing/ui";

export const metadata = {
  title: "Privacy · Fydell",
  description: "Fydell privacy policy.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="pt-[100px] pb-20">
        <Container className="max-w-[720px]">
          <h1
            className="text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 650, letterSpacing: "-0.03em" }}
          >
            Privacy
          </h1>
          <p className="mt-4 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
            Fydell processes employer and candidate information solely to operate work trials and
            deliver evidence reports. We do not sell personal data. Contact{" "}
            <a href="mailto:hello@fydell.com" className="text-[var(--text-primary)] underline-offset-2 hover:underline">
              hello@fydell.com
            </a>{" "}
            for privacy requests. A full policy will be published as the product expands.
          </p>
        </Container>
      </section>
    </MarketingShell>
  );
}
