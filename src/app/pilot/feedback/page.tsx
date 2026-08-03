import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import PilotFeedbackForm from "@/components/pilot/PilotFeedbackForm";

export const metadata = {
  title: "Your Feedback · Fydell Pilot",
};

export default function PilotFeedbackPage() {
  return (
    <section className="pb-24 lg:pb-32">
      <Container className="pt-[168px] sm:pt-[180px] lg:pt-[200px]">
        <Reveal className="mx-auto max-w-[720px]">
          <h1 className="flat-type page-display">Tell us what you saw</h1>
          <p className="mt-5 text-[16px] leading-[1.7] text-[rgba(244,245,247,0.72)]">
            Every question is optional. Skip anything that does not apply.
            Blunt answers are the most useful ones.
          </p>
          <div className="mt-12">
            <PilotFeedbackForm />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
