"use client";

import { Briefcase, Wrench, Handshake, ArrowRight } from "lucide-react";

export type SignupPath = "employer" | "fde" | "partner";

const PATHS: Array<{
  id: SignupPath;
  icon: typeof Briefcase;
  title: string;
  description: string;
}> = [
  {
    id: "employer",
    icon: Briefcase,
    title: "I'm hiring",
    description: "Post a mission, invite an FDE, and review evidence from real deployment work.",
  },
  {
    id: "fde",
    icon: Wrench,
    title: "I'm an FDE",
    description: "Get invited to missions, run Project Relay, and build a portable work receipt.",
  },
  {
    id: "partner",
    icon: Handshake,
    title: "I'm a partner",
    description: "Refer FDEs or employers into the network. Subject to approval.",
  },
];

export default function SignupPathPicker({
  onSelect,
}: {
  onSelect: (path: SignupPath) => void;
}) {
  return (
    <div className="grid gap-3">
      {PATHS.map((path) => {
        const Icon = path.icon;
        return (
          <button
            key={path.id}
            type="button"
            onClick={() => onSelect(path.id)}
            className="group flex items-start gap-4 rounded-[14px] border border-white/[0.10] bg-[#0A0C11] px-5 py-4 text-left transition hover:border-white/20 hover:bg-[#0E1118]"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#3B5BFF]/15">
              <Icon className="h-4.5 w-4.5 text-[#a8b8ff]" strokeWidth={1.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-white">{path.title}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-white/55">
                {path.description}
              </span>
            </span>
            <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white/60" />
          </button>
        );
      })}
    </div>
  );
}
