import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = {
  title: "Trust | Fydell",
  description:
    "What Fydell captures, how evaluation works, AI-use transparency, candidate control, and real limitations.",
};

const SECTIONS = [
  {
    title: "What is captured",
    body: "Invitation and session identity, timestamps, responses, resources opened, built-in AI interactions when used, revisions, and completion state. We do not invent candidates or seed demo people into reports.",
  },
  {
    title: "How evaluation works",
    body: "Job-related competencies, anchored rubrics, and cited evidence from the attempt. Confidence and limitations are stated on the report. This is not a certified psychometric assessment, and we do not issue hire or reject recommendations.",
  },
  {
    title: "AI use",
    body: "When a simulation permits in-product AI, prompts, inserted output, and whether the candidate verified results afterward can be summarized for reviewers. We do not claim to detect AI use outside the product.",
  },
  {
    title: "Candidate control",
    body: "Candidates decide whether a verified result is added to a portable record and who can see it. Employers only see evidence from simulations they ran. For access or deletion requests, contact hello@fydell.com and see our Privacy policy.",
  },
  {
    title: "Security and privacy",
    body: "Candidate workrooms use private invite links. Employer data is stored in Supabase with access controls. We do not publish a public test bank. Details: Privacy, Terms, and Security pages.",
  },
  {
    title: "Limitations",
    body: "Simulations run against authored scenario materials, not live customer systems. Scores are prototype evidence. Technical failures outside the candidate's control are not counted against them when confirmed. We do not claim sessions are cheat-proof; integrity signals are for human review.",
  },
];

export default function TrustPage() {
  return (
    <MarketingShell>
      <section className="pb-12 lg:pb-16">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <h1 className="flat-type max-w-3xl text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0B1020] sm:text-[48px]">
            Trust the evidence because you can inspect it.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-[#586273] sm:text-[17px]">
            Stated plainly: what we capture, how we evaluate, where AI fits, and what we do not
            claim.
          </p>
        </div>
      </section>

      <section className="border-t border-[#D9DEE7] pb-20 lg:pb-28">
        <div className="mkt-content">
          <div>
            {SECTIONS.map((s) => (
              <div
                key={s.title}
                className="grid gap-3 border-b border-[#D9DEE7] py-7 sm:grid-cols-[0.9fr_1.4fr] sm:gap-8"
              >
                <h2 className="text-[16px] font-semibold text-[#0B1020]">{s.title}</h2>
                <p className="text-[14.5px] leading-[1.6] text-[#586273]">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[14px] font-semibold">
            <Link href="/privacy" className="text-[#3157D5] hover:text-[#2342A2]">
              Privacy
            </Link>
            <Link href="/security" className="text-[#3157D5] hover:text-[#2342A2]">
              Security
            </Link>
            <Link href="/terms" className="text-[#3157D5] hover:text-[#2342A2]">
              Terms
            </Link>
            <a href="mailto:hello@fydell.com" className="text-[#3157D5] hover:text-[#2342A2]">
              hello@fydell.com
            </a>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
