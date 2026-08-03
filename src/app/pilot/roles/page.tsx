import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import PilotRoleCards from "@/components/pilot/PilotRoleCards";

export const metadata = {
  title: "Choose a Role · Fydell Pilot",
};

export default function PilotRolesPage() {
  return (
    <section className="pb-24 lg:pb-32">
      <Container className="pt-[168px] sm:pt-[180px] lg:pt-[200px]">
        <Reveal className="max-w-[680px]">
          <h1 className="flat-type page-display">Choose a role to test</h1>
          <p className="mt-5 text-[16px] leading-[1.7] text-[rgba(244,245,247,0.72)]">
            Pick the role you know best, or the one you hire for. Each role has
            one recommended five-minute simulation.
          </p>
          <p className="mt-4 rounded-[12px] border border-[rgba(140,150,255,0.3)] bg-[rgba(86,98,255,0.09)] px-4 py-3.5 text-[15px] leading-[1.6] text-[rgba(244,245,247,0.82)]">
            After you finish the simulation and review your result, return to{" "}
            <span className="text-[#F4F5F7]" style={{ fontWeight: 560 }}>
              fydell.com/pilot/feedback
            </span>
          </p>
        </Reveal>
        <div className="mt-12">
          <PilotRoleCards />
        </div>
      </Container>
    </section>
  );
}
