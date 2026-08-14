"use client";

import { ButtonLink } from "@/components/marketing/ui";

export function FooterCTA() {
  return (
    <section className="relative py-32 md:py-48 px-6 bg-[var(--color-band)] border-t border-[var(--color-line)] text-center overflow-hidden">
      
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-[var(--color-action)]/20 to-[var(--color-verified)]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[1.05] tracking-tight text-[var(--color-ink)]">
          Start evaluating candidates based on proof.
        </h2>
        <p className="mt-6 text-[17px] md:text-[19px] leading-relaxed text-[var(--color-ink-2)] max-w-2xl">
          Fydell begins as an evaluation product, compounds proprietary evidence, and creates a network where verified ability replaces repeated interviews.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/signup" variant="primary" className="h-14 px-8 text-[16px] font-medium bg-[var(--color-ink)] text-[var(--color-canvas)] hover:bg-[var(--color-ink-2)]">
            Create your workspace
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
