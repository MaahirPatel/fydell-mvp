import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const PRINCIPLES = [
  {
    title: "Observe the work",
    body: "Capture decisions, assumptions, revisions, and tradeoffs.",
    diagram: (
      <svg viewBox="0 0 120 72" className="h-[72px] w-[120px]" aria-hidden>
        <rect x="8" y="14" width="48" height="44" rx="4" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <rect x="16" y="22" width="32" height="3" rx="1" fill="rgba(255,255,255,0.18)" />
        <rect x="16" y="30" width="24" height="3" rx="1" fill="rgba(255,255,255,0.1)" />
        <rect x="16" y="38" width="28" height="3" rx="1" fill="rgba(255,255,255,0.1)" />
        <circle cx="86" cy="36" r="18" fill="none" stroke="rgba(86,98,255,0.45)" strokeWidth="1.2" />
        <circle cx="86" cy="36" r="6" fill="rgba(86,98,255,0.35)" />
        <path d="M56 36h12" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    ),
  },
  {
    title: "Introduce change",
    body: "Test how candidates respond when the information moves.",
    diagram: (
      <svg viewBox="0 0 120 72" className="h-[72px] w-[120px]" aria-hidden>
        <path
          d="M12 48 L36 28 L60 40 L84 18 L108 32"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="1.2"
        />
        <path
          d="M12 48 L36 28 L60 40 L84 18 L108 32"
          fill="none"
          stroke="rgba(134,87,244,0.55)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
          transform="translate(0,8)"
        />
        <circle cx="84" cy="18" r="3.5" fill="#5662FF" />
        <circle cx="84" cy="26" r="3.5" fill="rgba(134,87,244,0.7)" />
      </svg>
    ),
  },
  {
    title: "Trace the evidence",
    body: "Connect every conclusion to something the candidate actually did.",
    diagram: (
      <svg viewBox="0 0 120 72" className="h-[72px] w-[120px]" aria-hidden>
        <circle cx="24" cy="36" r="5" fill="rgba(86,98,255,0.5)" />
        <circle cx="60" cy="22" r="4" fill="rgba(255,255,255,0.2)" />
        <circle cx="60" cy="50" r="4" fill="rgba(255,255,255,0.2)" />
        <circle cx="96" cy="36" r="5" fill="rgba(134,87,244,0.55)" />
        <path d="M29 36 L55 24 M29 36 L55 48 M65 24 L91 36 M65 48 L91 36" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      </svg>
    ),
  },
];

export default function HomeProductStages() {
  return (
    <section className="section-editorial border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <p
            className="max-w-[900px] text-balance"
            style={{
              fontSize: "clamp(2rem, 3.6vw, 2.875rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.038em",
              fontWeight: 520,
            }}
          >
            <span className="text-[rgba(244,245,247,0.62)]">
              Hiring systems record what candidates claim.
            </span>
            <br />
            <span className="text-[#F4F5F7]">Fydell records how they work.</span>
          </p>
        </Reveal>

        <div className="mt-14 grid gap-10 sm:mt-16 sm:grid-cols-3 sm:gap-8 lg:gap-12">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={0.04 * i}>
              <div>
                <div className="mb-5 opacity-90">{p.diagram}</div>
                <h3
                  className="text-[15px] text-[#F4F5F7]"
                  style={{ fontWeight: 560, letterSpacing: "-0.015em" }}
                >
                  {p.title}
                </h3>
                <p
                  className="mt-2 max-w-[280px] text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]"
                  style={{ fontWeight: 430 }}
                >
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
