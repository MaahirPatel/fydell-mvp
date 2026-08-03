import { Container, ButtonLink, TextLink } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import { CREATE_SIMULATION_HREF, TRY_CANDIDATE_HREF } from "@/lib/marketing/ctas";

export default function FinalCTA() {
  return (
    <section className="border-t border-[#D9DEE7] pt-[120px] pb-[96px] lg:pt-[160px] lg:pb-[120px]">
      <Container>
        <Reveal className="max-w-[520px]">
          <h2 className="section-heading flat-type">Create the first simulation for your role.</h2>
          <p className="section-desc mt-5">
            Define the work, invite candidates, and review a complete evidence report in one
            workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <ButtonLink href={CREATE_SIMULATION_HREF} variant="primary">
              Create a simulation
            </ButtonLink>
            <TextLink href={TRY_CANDIDATE_HREF}>Try the candidate experience</TextLink>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
