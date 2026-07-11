import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const ROLES = [
  { title: "FP&A Analyst", meta: "Project Meridian · Available" },
  { title: "Senior FP&A Analyst", meta: "Configured pilot · Available" },
  { title: "Strategic Finance", meta: "Configured pilot · On request" },
  { title: "Treasury Analyst", meta: "On request" },
];

export default function HomeRoles() {
  return (
    <section className="section-compact border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal className="max-w-[500px]">
          <h2 className="section-heading flat-type">Start with one finance role.</h2>
        </Reveal>

        <div className="mt-10 max-w-[720px] border-t border-[var(--border-subtle)]">
          {ROLES.map((role, i) => (
            <Reveal key={role.title} delay={0.03 * i}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] py-4">
                <h3
                  className="text-[15px] text-[#F4F5F7] sm:text-[16px]"
                  style={{ fontWeight: 560, letterSpacing: "-0.015em" }}
                >
                  {role.title}
                </h3>
                <p className="text-[13px] text-[rgba(244,245,247,0.4)]">{role.meta}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
