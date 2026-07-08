import { CREDIT_AGREEMENT_SECTIONS as sections } from "@/lib/scenario";

export default function CreditTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Credit Agreement - Summary of Terms</h2>
      <p className="mt-1 text-sm text-white/48">
        Target business senior secured term loan facility. Selected provisions.
      </p>

      <ol className="mt-5 grid gap-3">
        {sections.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-white/[0.08] bg-[#07101f] px-5 py-4"
          >
            <div className="flex items-baseline gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#7c5cff]/22 text-sm font-bold text-white tabular-nums">
                {s.n}
              </span>
              <h3 className="text-base font-semibold text-white">{s.title}</h3>
            </div>
            <p className="mt-2 pl-10 text-sm leading-7 text-white/58">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
