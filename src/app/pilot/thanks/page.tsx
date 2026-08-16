import Link from "next/link";
import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

export const metadata = {
  title: "Thank You · Fydell Pilot",
};

export default function PilotThanksPage() {
  return (
    <section className="pb-24 lg:pb-32">
      <Container className="pt-[168px] sm:pt-[180px] lg:pt-[200px]">
        <Reveal className="mx-auto max-w-[640px]">
          <h1 className="flat-type page-display">Thank you</h1>
          <p className="page-lead">
            Your feedback is saved. It goes straight to the people building
            Fydell.
          </p>

          <div className="mt-10 rounded-[16px] border border-white/[0.09] bg-white/[0.025] p-6 sm:p-7">
            <p className="text-[13px] font-medium text-[var(--text-tertiary)]">
              What happens next
            </p>
            <ul className="mt-4 space-y-3 text-[15px] leading-[1.6] text-[rgba(244,245,247,0.82)]">
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[rgba(140,150,255,0.85)]" />
                Fydell reviews every submission and uses it to decide what to
                fix or improve next.
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true" className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[rgba(140,150,255,0.85)]" />
                If you allowed contact, we may follow up with a short question
                or an invitation to a structured pilot.
              </li>
            </ul>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/pilot/roles"
              className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[#F2F3F5] px-7 text-[15px] text-[#090A0D] transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[0.97]"
              style={{ fontWeight: 580 }}
            >
              Run another role
            </Link>
            <Link
              href="/"
              className="text-[15px] text-[rgba(244,245,247,0.62)] transition-colors hover:text-[#F4F5F7]"
            >
              Back to fydell.com
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
