import Link from "next/link";
import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

export const metadata = {
  title: "Welcome to Fydell · Pilot Testing",
};

const YOU_MAY = [
  "Inspect any provided resource",
  "Ask the stakeholder a question",
  "Change your answer",
  "Use a calculator or notes",
  "Stop if the product prevents you from continuing",
];

export default function PilotIntroPage() {
  return (
    <section className="pb-24 lg:pb-32">
      <Container className="pt-[168px] sm:pt-[180px] lg:pt-[200px]">
        <Reveal className="mx-auto max-w-[680px]">
          <h1 className="flat-type page-display">Welcome to Fydell</h1>
          <p className="mt-6 text-[16px] leading-[1.7] text-[rgba(244,245,247,0.72)]">
            Fydell uses short work simulations to show how candidates solve
            realistic technical problems. Today, you will complete one
            five-minute simulation and review the evidence Fydell produces
            afterward. We are testing the product, not you. Please behave as
            you normally would, and tell us whenever something feels unclear,
            unrealistic or unnecessary.
          </p>

          <div className="mt-10 rounded-[16px] border border-white/[0.09] bg-white/[0.025] p-6 sm:p-7">
            <p className="text-[13px] uppercase tracking-[0.06em] text-[rgba(244,245,247,0.5)]" style={{ fontWeight: 560 }}>
              You may
            </p>
            <ul className="mt-4 space-y-3">
              {YOU_MAY.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-[1.55] text-[rgba(244,245,247,0.82)]">
                  <span aria-hidden="true" className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[rgba(140,150,255,0.85)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-[16px] leading-[1.7] text-[rgba(244,245,247,0.72)]">
            Please do not worry about achieving a perfect score. Honest
            interaction gives us better feedback.
          </p>

          <div className="mt-10">
            <Link
              href="/pilot/profile"
              className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[#F2F3F5] px-7 text-[15px] text-[#090A0D] transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[0.97]"
              style={{ fontWeight: 580 }}
            >
              Choose a role
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
