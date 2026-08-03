import MarketingShell from "@/components/layout/MarketingShell";
import { Container } from "@/components/marketing/ui";
import PageHero from "@/components/marketing/PageHero";

export const metadata = {
  title: "Security · Fydell",
  description: "Fydell security overview.",
};

export default function SecurityPage() {
  return (
    <MarketingShell>
      <PageHero title="Security." narrow />
      <section className="pb-20 lg:pb-28">
        <Container className="max-w-[640px]">
          <p className="text-[15px] leading-[1.65] text-[rgba(244,245,247,0.62)]">
            Candidate workrooms use private invite links. Employer data is stored in Supabase with
            access controls. We do not publish a public test bank. For security inquiries, contact{" "}
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
