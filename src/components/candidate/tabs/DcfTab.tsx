import { DCF_MODEL as m } from "@/lib/scenario";

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-t border-white/[0.06]">
      <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-white/62">
        {label}
      </th>
      {values.map((v, i) => (
        <td key={i} className="px-4 py-3 text-right font-mono text-sm text-white/76 tabular-nums">
          {v}
        </td>
      ))}
    </tr>
  );
}

export default function DcfTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">Discounted Cash Flow - Base Case</h2>
      <p className="mt-1 text-sm text-white/48">
        Five-year projection. All figures as provided by management.
      </p>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#07101f]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-white/[0.045] text-white">
              <th className="px-4 py-3 text-left text-sm font-semibold">Metric</th>
              {m.years.map((y) => (
                <th key={y} className="px-4 py-3 text-right text-sm font-semibold">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Revenue" values={m.revenue} />
            <Row label="EBITDA margin" values={m.ebitdaMargin} />
            <Row label="Capex (% of revenue)" values={m.capexPctRevenue} />
            <Row label="Change in working capital" values={m.workingCapitalChange} />
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Terminal growth", v: m.terminalGrowthRate },
          { k: "WACC", v: m.wacc },
          { k: "Implied EV", v: m.impliedEnterpriseValue },
          { k: "Offer on table", v: "$2.4B" }
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/36">
              {s.k}
            </div>
            <div className="mt-1 text-lg font-semibold text-white tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm leading-6 text-white/58">
        {m.note}
      </p>
    </div>
  );
}
