import MarketingShell from "@/components/layout/MarketingShell";
import { Container } from "@/components/marketing/ui";

export const metadata = {
  title: "Terms · Fydell",
  description: "Fydell terms of use.",
};

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="pt-[100px] pb-20">
        <Container className="max-w-[720px]">
          <h1
            className="text-[var(--text-primary)]"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 650, letterSpacing: "-0.03em" }}
          >
            Terms
          </h1>
          <p className="mt-4 text-[15px] leading-[1.65] text-[var(--text-secondary)]">
            Fydell provides work-trial software for finance hiring. Pilot access is provided as-is
            during early access. Formal terms will be published before paid plans. Questions:{" "}
            <a href="mailto:hello@fydell.com" className="text-[var(--text-primary)] underline-offset-2 hover:underline">
              hello@fydell.com
            </a>
            .
          </p>
        </Container>
      </section>
    </MarketingShell>
  );
}
