import { type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/marketing/ui";

/**
 * Shared marketing page opening - matches homepage calm spacing and type scale.
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
      <Container className="relative z-10 pt-[130px] sm:pt-[150px] lg:pt-[160px]">
        <Reveal className={narrow ? "max-w-[640px]" : "max-w-[790px]"}>
          <h1 className="flat-type text-[36px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0B1020] sm:text-[44px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-5 max-w-[540px] text-[16px] leading-relaxed text-[#586273] sm:text-[17px]">
              {description}
            </p>
          ) : null}
          {children}
        </Reveal>
      </Container>
    </section>
  );
}
