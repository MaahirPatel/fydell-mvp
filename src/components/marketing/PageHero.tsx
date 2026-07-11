import { type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";

/**
 * Shared marketing page opening — matches homepage calm spacing and type scale.
 */
export default function PageHero({
  title,
  description,
  children,
  narrow = false,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  narrow?: boolean;
}) {
  return (
    <section className="relative overflow-hidden pb-12 sm:pb-14 lg:pb-16">
      <Container className="relative z-10 pt-[168px] sm:pt-[180px] lg:pt-[200px]">
        <Reveal className={narrow ? "max-w-[640px]" : "max-w-[790px]"}>
          <h1 className="flat-type page-display">{title}</h1>
          {description ? <p className="page-lead">{description}</p> : null}
          {children}
        </Reveal>
      </Container>
    </section>
  );
}
