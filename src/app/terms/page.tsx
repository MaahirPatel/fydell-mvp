import MarketingShell from "@/components/layout/MarketingShell";
import { Container } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";

export const metadata = {
  title: "Terms · Fydell",
  description: "Fydell terms of use.",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <PageHero title="Terms." narrow />
      <section className="pb-20 lg:pb-28">
        <Container className="max-w-[640px]">
          <p className="text-[15px] leading-[1.65] text-[rgba(244,245,247,0.62)]">
            Fydell provides work-trial and evidence-report services for finance hiring. Use of the
            product is subject to the agreement established for your pilot or subscription. For
            questions, contact{" "}
            <a
              href="mailto:hello@fydell.com"
              className="text-[#F4F5F7] underline-offset-2 hover:underline"
            >
              hello@fydell.com
            </a>
            .
          </p>
        </Container>
      </section>
    </MarketingShell>
  );
}
