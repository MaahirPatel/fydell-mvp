"use client";

import Link from "next/link";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import { PILOT_ROLE_ORDER, PILOT_SIMS } from "@/components/pilot/pilot-data";
import { savePilotProfile } from "@/components/pilot/profile-storage";
import type { RoleKey } from "@/lib/simulations/types";

function rememberChoice(roleKey: RoleKey) {
  const sim = PILOT_SIMS[roleKey];
  savePilotProfile({
    roleKey,
    templateSlug: sim.slug,
    simulationTitle: sim.title,
  });
}

export default function PilotRoleCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {PILOT_ROLE_ORDER.map((roleKey) => {
        const role = ROLE_BY_KEY[roleKey];
        const sim = PILOT_SIMS[roleKey];
        const skills = role.skillsEvaluated.slice(0, 3);
        return (
          <article
            key={roleKey}
            className="flex flex-col rounded-[16px] border border-white/[0.09] bg-white/[0.025] p-5 transition-colors duration-150 hover:border-white/[0.18] sm:p-6"
          >
            <h2 className="text-[18px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
              {role.title}
            </h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-[rgba(244,245,247,0.66)]">
              {role.shortDescription}
            </p>

            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                Recommended simulation
              </p>
              <p className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-[15px] text-[#F4F5F7]" style={{ fontWeight: 560 }}>
                  {sim.title}
                </span>
                <span className="text-[13px] tabular-nums text-[rgba(244,245,247,0.5)]">
                  5 minutes
                </span>
              </p>
            </div>

            <div className="mt-4">
              <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
                Skills observed
              </p>
              <ul className="mt-2 space-y-1.5">
                {skills.map((skill) => (
                  <li
                    key={skill}
                    className="flex gap-2.5 text-[14px] leading-[1.5] text-[rgba(244,245,247,0.72)]"
                  >
                    <span aria-hidden="true" className="mt-[8px] h-[4px] w-[4px] shrink-0 rounded-full bg-[rgba(140,150,255,0.85)]" />
                    {skill}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex-1" />
            <Link
              href={`/simulations/start/${sim.slug}?pilot=1`}
              onClick={() => rememberChoice(roleKey)}
              className="inline-flex h-11 items-center justify-center rounded-[9px] bg-[#F2F3F5] px-5 text-[14px] text-[#090A0D] transition-[filter,transform] duration-150 hover:-translate-y-px hover:brightness-[0.97]"
              style={{ fontWeight: 570 }}
            >
              Start {sim.title}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
