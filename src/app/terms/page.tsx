import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Terms",
  description: "The terms for using Fydell as an engineer or as a hiring team.",
  alternates: { canonical: "/terms" },
};

/** Every statement here describes what the product actually does today. */
const TERMS: Array<[string, string | string[]]> = [
  [
    "What Fydell is",
    "Fydell turns real projects and work samples into evidence reports that engineers can share and hiring teams can review. It does not make hiring decisions and does not claim that a report predicts job performance.",
  ],
  [
    "Who can use it",
    "You must be at least 16 and able to agree to these terms. If you use Fydell for a company, you confirm you may accept these terms for it.",
  ],
  [
    "Your account",
    "Give accurate details, keep your password to yourself, and tell us at once if you think someone else has used your account. You are responsible for what happens under it.",
  ],
  [
    "Your work stays yours",
    [
      "You keep ownership of the code, profile details and other content you add. You let Fydell store, analyse and display it only to run the service and to show it to the people you choose, such as through a share link or an application. This permission ends when you delete the content or your account, except for copies an employer you applied to is entitled to keep.",
      "Only add code you have the right to share. Do not upload an employer's or client's confidential code, credentials, or other people's personal data. What you say about your role in a project must be honest.",
    ],
  ],
  [
    "Reports and AI drafts",
    "Reports describe what Fydell observed in the code or submission it was given, and cite the lines behind each finding. They can be incomplete or wrong. Fydell cannot confirm who wrote code, and drafts written by an AI model are labelled as drafts. You can add context and propose corrections to your own reports.",
  ],
  [
    "Hiring teams",
    [
      "You make every hiring decision and remain responsible for it. Use what you see on Fydell only to evaluate candidates for roles you are hiring for.",
      "You are responsible for following the employment, anti-discrimination, privacy and automated-decision laws where you hire. That includes giving candidates any required notices, offering reasonable accommodations such as extra time when asked, and running any audits the law requires.",
      "Do not put real candidate data into a workspace until your organization has agreed terms with Fydell. The demo workspace uses fictional data only.",
    ],
  ],
  [
    "Work samples",
    "Candidates should complete work samples themselves within the rules shown before they start, including any limits on AI assistance. Task materials and hidden checks are confidential; do not publish or share them.",
  ],
  [
    "Acceptable use",
    [
      "Do not upload malware, try to break out of the isolated environments code runs in, probe or overload the service, scrape it, or get around rate limits or access controls.",
      "Do not impersonate anyone, harass anyone, or use Fydell to collect people's data for any purpose other than the hiring it is for.",
    ],
  ],
  [
    "Fees",
    "Fydell is free for engineers. Hiring teams pay only under a written agreement or a plan they choose; nothing is charged without one.",
  ],
  [
    "Ending use",
    "You can delete your account at any time from Settings. We may suspend or close an account that breaks these terms or puts others at risk, and will tell you why unless the law or safety prevents it.",
  ],
  [
    "Disclaimers",
    "Fydell is provided as it is and as available. To the extent the law allows, we do not promise that it will be uninterrupted, error-free, or suited to a particular hiring decision.",
  ],
  [
    "Limit of liability",
    "To the extent the law allows, Fydell is not liable for indirect or consequential losses, lost profits, or hiring outcomes, and its total liability to you is limited to the greater of the amount you paid Fydell in the twelve months before the claim or 100 US dollars. Nothing here limits liability that cannot be limited by law.",
  ],
  [
    "Signed agreements",
    "If your organization has signed a pilot or order agreement with Fydell, that agreement applies where it differs from these terms.",
  ],
  [
    "Changes",
    "The effective date above changes whenever these terms do. If a change materially affects you, we email account holders before it takes effect.",
  ],
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <PageIntro title="Terms" lead="Effective 9 October 2026. The rules for using Fydell, in plain language." />

      <section className="pb-24">
        <div className="mkt-content max-w-[760px]">
          <dl className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {TERMS.map(([title, detail]) => (
              <div key={title} className="grid gap-2 py-5 sm:grid-cols-[220px_1fr] sm:gap-8">
                <dt className="text-app-body font-medium text-[var(--text-primary)]">{title}</dt>
                <dd className="space-y-3 text-app-body leading-[1.7] text-[var(--text-secondary)]">
                  {Array.isArray(detail) ? detail.map((line) => <p key={line}>{line}</p>) : detail}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-app-body leading-[1.7] text-[var(--text-secondary)]">
            How data is handled is set out in the{" "}
            <Link href="/privacy" className="text-[var(--text-primary)] underline underline-offset-2">
              privacy notice
            </Link>
            . Questions go to <ContactLink />.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
