import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const ROLES = [
  { title: "Forward Deployed Engineer", meta: "Project Relay · Available" },
  { title: "Senior Forward Deployed Engineer", meta: "Configured pilot · Available" },
  { title: "Solutions Engineer", meta: "Configured pilot · On request" },
  { title: "Implementation Engineer", meta: "On request" },
];

export default function HomeRoles() {
  return (
    <section className="section-compact border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal className="max-w-[560px]">
          <h2 className="section-heading flat-type">Start with one real mission.</h2>
          <p className="section-desc mt-5">
            One FDE, one mission, one decision — before a senior engineer spends an afternoon on a
            candidate who doesn't clear the bar.
          </p>
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
