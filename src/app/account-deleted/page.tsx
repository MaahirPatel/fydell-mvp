import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = {
  title: "Account deleted",
  robots: { index: false },
};

export default function AccountDeletedPage() {
  return (
    <MarketingShell>
      <PageIntro
        title="Your account is deleted"
        lead="Your Passport, projects, reports, notes and profile have been erased, and you've been signed out."
      />
      <section className="mkt-section border-t border-[var(--border-subtle)] pb-24">
        <div className="mkt-content max-w-[760px] space-y-4 text-app-body leading-[1.7] text-[var(--text-secondary)]">
          <p>
            Your share links no longer work and your open applications were
            withdrawn. Employers keep decisions and notes they had already
            recorded, and copies they had already downloaded.
          </p>
          <p>
            You can sign up again with the same email at any time; you&apos;ll
            start with an empty Passport. Questions:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <p>
            <Link
              href="/"
              className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4"
            >
              Back to Fydell
            </Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
