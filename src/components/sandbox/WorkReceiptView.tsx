export function WorkReceiptView({ receipt }: { receipt: Record<string, unknown> }) {
  const items = Array.isArray(receipt.completedWork) ? receipt.completedWork.map(String) : [];
  const conditions = Array.isArray(receipt.conditions) ? receipt.conditions.map(String) : [];
  return (
    <article className="mx-auto max-w-[920px] text-[var(--text-primary)]">
      <p className="text-app-meta font-medium text-[var(--color-changed)]">Demo Work Receipt</p>
      <h1 className="mt-2 text-app-page">Candidate 01 · Solutions Engineering</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">
        Enterprise API deployment planning under changing customer and security constraints.
      </p>
      <p className="mt-5 border-y border-[var(--border-subtle)] py-3 text-app-body text-[var(--text-secondary)]">
        {String(receipt.label ?? "Fictional sandbox work receipt. Not valid for employment verification.")}
      </p>
      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h2 className="text-app-section">Work performed</h2>
          </div>
          <ul>
            {items.map((item) => (
              <li key={item} className="border-b border-[var(--border-subtle)] px-5 py-3 text-app-body text-[var(--text-secondary)] last:border-b-0">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-5">
          <section className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-app-section">Demonstrated</h2>
            <dl className="mt-3 divide-y divide-[var(--border-subtle)]">
              {[
                ["Technical discovery", "Strong evidence"],
                ["Adaptation", "Strong evidence"],
                ["Customer communication", "Moderate evidence"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2 text-app-meta">
                  <dt className="text-[var(--text-secondary)]">{label}</dt>
                  <dd className="text-right text-[var(--text-primary)]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-app-section">Not established</h2>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">
              Production coding, long-term project execution, and people management were not observed.
            </p>
          </section>
        </div>
      </div>
      <section className="mt-6 border-t border-[var(--border-subtle)] pt-5">
        <h2 className="text-app-section">Verification and provenance</h2>
        <p className="mt-2 text-app-body text-[var(--text-secondary)]">
          Fydell controlled work environment · Demo receipt · Candidate-controlled sharing
        </p>
        <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">
          {conditions.join(" · ")}
        </p>
        <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">
          {String(receipt.integrityNotice ?? "")}
        </p>
        <p className="mt-2 break-all font-mono text-app-meta text-[var(--text-tertiary)]">
          Integrity hash {String(receipt.integrityHash ?? "")}
        </p>
      </section>
    </article>
  );
}
