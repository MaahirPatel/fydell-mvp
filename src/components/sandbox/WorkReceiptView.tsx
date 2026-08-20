export function WorkReceiptView({ receipt }: { receipt: Record<string, unknown> }) {
  const items = Array.isArray(receipt.completedWork) ? receipt.completedWork.map(String) : [];
  const conditions = Array.isArray(receipt.conditions) ? receipt.conditions.map(String) : [];
  return (
    <article className="mx-auto max-w-2xl text-[var(--text-primary)]">
      <p className="text-app-meta uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Work receipt</p>
      <h1 className="mt-3 text-app-page">What this candidate completed</h1>
      <p className="mt-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-app-body text-[var(--text-secondary)]">
        {String(receipt.label ?? "Fictional sandbox work receipt. Not valid for employment verification.")}
      </p>
      <p className="mt-4 text-app-meta text-[var(--text-tertiary)]">
        {String(receipt.integrityNotice ?? "")}
      </p>
      <h2 className="mt-8 text-app-section">Completed work</h2>
      <ul className="mt-3 space-y-2 text-app-body text-[var(--text-secondary)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <h2 className="mt-8 text-app-section">Conditions</h2>
      <ul className="mt-3 space-y-2 text-app-body text-[var(--text-secondary)]">
        {conditions.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-8 font-mono text-app-meta text-[var(--text-tertiary)]">
        Integrity hash {String(receipt.integrityHash ?? "")}
      </p>
    </article>
  );
}
