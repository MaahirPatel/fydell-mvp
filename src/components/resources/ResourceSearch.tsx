"use client";

import { useState } from "react";
import { Search } from "lucide-react";

const FILTERS = [
  "All resources",
  "Hiring Science",
  "Simulation Design",
  "Skills Assessment",
  "Customer Stories"
] as const;

export default function ResourceSearch() {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");

  return (
    <div className="max-w-[540px]">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aa4b8]"
          strokeWidth={1.7}
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search resources..."
          className="platform-input !pl-11 !py-3.5 text-[15px]"
          aria-label="Search resources"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((filter, index) => {
          const isActive = index === active;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActive(index)}
              className={
                isActive
                  ? "btn-lift inline-flex h-9 items-center rounded-full bg-gradient-to-r from-[#7c5cff] to-[#5b8cff] px-4 text-[13px] font-bold text-white shadow-[0_10px_30px_rgba(124,92,255,0.35)]"
                  : "btn-lift inline-flex h-9 items-center rounded-full border border-white/[0.12] bg-white/[0.035] px-4 text-[13px] font-semibold text-white/72 hover:border-white/25 hover:bg-white/[0.07]"
              }
            >
              {filter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
