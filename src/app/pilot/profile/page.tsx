import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import PilotProfileForm from "@/components/pilot/PilotProfileForm";

export const metadata = {
  title: "About You · Fydell Pilot",
};

export default function PilotProfilePage() {
  return (
    <section className="pb-24 lg:pb-32">
      <Container className="pt-[168px] sm:pt-[180px] lg:pt-[200px]">
        <Reveal className="mx-auto max-w-[680px]">
          <h1 className="flat-type page-display">A little about you</h1>
          <p className="mt-5 text-[16px] leading-[1.7] text-[rgba(244,245,247,0.72)]">
            Two quick questions so we can read your feedback in context. Name,
            email and organization are optional.
          </p>
          <div className="mt-10">
            <PilotProfileForm />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
