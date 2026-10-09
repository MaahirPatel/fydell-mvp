import MarketingShell from "@/components/layout/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ContactLink } from "@/components/ui/ContactLink";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = {
  title: "Privacy",
  description:
    "What data Fydell collects, why, who can see it, and how a candidate controls their own record.",
  alternates: { canonical: "/privacy" },
};

const FACTS: Array<[string, string | string[]]> = [
  [
    "What is collected",
    [
      "For an employer: name, work email, company name, the roles and work samples the team creates, and the notes and decisions it records.",
      "For an engineer: account email, the profile details and photo they add, projects they import from GitHub or upload, their applications and submissions, and activity recorded during a work sample, such as files opened, tests run and prompts sent to the built-in assistant.",
      "For everyone: sign-in records, and the IP address and request details our hosting keeps for security.",
    ],
  ],
  [
    "Why it is collected",
    "To run the work samples and reviews people sign up for, to show engineers' own work back to them, and to keep accounts secure. It is not sold, not used to target advertising, and Fydell does not train models on your work.",
  ],
  [
    "AI processing",
    "Some summaries and drafts are written by an AI model from the project or submission they describe. They are labelled as drafts and cite the evidence they come from. Fydell does not score candidates, and a person on the hiring team makes every decision.",
  ],
  [
    "Who can see it",
    "An engineer's work is visible to them, and to an employer only when they apply or share a link. Candidate work in a workspace is visible to that workspace's members. The server checks membership before returning any report, and every table holding candidate work has a row-level policy scoped to its organization. There is no public directory of candidates or results.",
  ],
  [
    "Service providers",
    "Supabase (database, sign-in and file storage), Vercel (hosting and isolated code runs), Resend (email), an AI model provider (OpenAI or Groq) for drafts and summaries, GitHub (only when an engineer connects it) and Stripe (billing, for employers who pay online). They process data on Fydell's behalf to provide these services.",
  ],
  [
    "Cookies and tracking",
    "Fydell uses only the cookies needed to keep you signed in and protect your session. There are no advertising or analytics trackers, and no third party tracks you across other websites through Fydell.",
  ],
  [
    "Do Not Track",
    "Because Fydell does not track visitors across sites, it treats every visitor the same way whether or not their browser sends a Do Not Track or Global Privacy Control signal.",
  ],
  [
    "How long it is kept",
    "Account data stays while the account exists. Deleting an account erases it from live systems straight away; backups expire on their normal schedule. Employers may be required by employment law to keep hiring records, so decisions and notes a workspace recorded stay with that workspace until the workspace itself is deleted.",
  ],
  [
    "Your choices",
    `Engineers can download their Passport and delete their account from Settings. Deletion erases their projects, reports, notes and profile, revokes share links and withdraws open applications. Employer members can delete their own account from Settings, and a workspace owner can request deletion of the whole workspace there. To see, correct or export anything else, email ${CONTACT_EMAIL} from the address on the account. We confirm who is asking, then answer within 45 days.`,
  ],
  [
    "Security",
    "Data is encrypted in transit and at rest. Access inside Fydell is limited to people who need it to run the service, and every administrative action is logged. If a breach affects your data, we tell you without unreasonable delay.",
  ],
  [
    "Children",
    "Fydell is a hiring tool for adults. It is not directed at children, and we do not knowingly collect data from anyone under 16.",
  ],
  [
    "Changes to this policy",
    "The effective date above changes whenever this page does. If a change affects how your data is used, we email account holders before it takes effect.",
  ],
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <PageIntro
        title="Privacy"
        lead="Effective 9 October 2026. What Fydell holds, why, and what you can do about it."
      />

      <section className="pb-24">
        <div className="mkt-content max-w-[760px]">
          <dl className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {FACTS.map(([title, detail]) => (
              <div
                key={title}
                className="grid gap-2 py-5 sm:grid-cols-[220px_1fr] sm:gap-8"
              >
                <dt className="text-app-body font-medium text-[var(--text-primary)]">
                  {title}
                </dt>
                <dd className="space-y-3 text-app-body leading-[1.7] text-[var(--text-secondary)]">
                  {Array.isArray(detail)
                    ? detail.map((line) => <p key={line}>{line}</p>)
                    : detail}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-app-body leading-[1.7] text-[var(--text-secondary)]">
            Questions go to{" "}
            <ContactLink />.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
