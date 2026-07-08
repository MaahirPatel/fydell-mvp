import { MANAGEMENT_PRESENTATION as p } from "@/lib/scenario";

export default function PresentationTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Management Presentation - Synergy Case</h2>
      <p className="mt-1 text-sm leading-6 text-white/48">{p.intro}</p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07101f]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/[0.045] text-white">
              <th className="px-5 py-3 text-left text-sm font-semibold">Synergy</th>
              <th className="px-5 py-3 text-right text-sm font-semibold">Annual</th>
              <th className="px-5 py-3 text-left text-sm font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {p.synergies.map((s) => {
              const isTotal = s.label === "Total synergies";
              return (
                <tr
                  key={s.label}
                  className={`border-t border-white/[0.06] ${isTotal ? "bg-[#3dd68c]/5" : ""}`}
                >
                  <td className={`px-5 py-3 text-sm ${isTotal ? "font-semibold text-white" : "font-medium text-white/66"}`}>
                    {s.label}
                  </td>
                  <td className={`px-5 py-3 text-right font-mono text-sm tabular-nums ${isTotal ? "font-semibold text-[#3dd68c]" : "text-white/72"}`}>
                    {s.amount}
                  </td>
                  <td className="px-5 py-3 text-sm text-white/50">{s.detail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-xs leading-6 text-white/50">
        <span className="font-semibold text-white/70">Footnote:</span> {p.footnote}
      </p>
    </div>
  );
}
