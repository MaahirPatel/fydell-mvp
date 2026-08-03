import MarketingShell from "@/components/layout/MarketingShell";
import { Container } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";

export const metadata = {
  title: "Privacy · Fydell",
  description: "Fydell privacy policy.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <PageHero title="Privacy." narrow />
      <section className="pb-20 lg:pb-28">
        <Container className="max-w-[640px]">
          <p className="text-[15px] leading-[1.65] text-[#586273]">
            Fydell processes employer and candidate information solely to operate work trials and
            deliver evidence reports. We do not sell personal data. Contact{" "}
            <a
              href="mailto:hello@fydell.com"
              className="text-[#0B1020] underline-offset-2 hover:underline"
            >
              hello@fydell.com
            </a>{" "}
            for privacy requests. A full policy will be published as the product expands.
          </p>
        </Container>
      </section>
    </MarketingShell>
  );
}
