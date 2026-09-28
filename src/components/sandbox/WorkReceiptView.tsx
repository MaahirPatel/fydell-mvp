function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Public projection of a sandbox work receipt.
 *
 * Everything shown here comes from the stored payload. A receipt that recorded
 * no reviewed claims renders an empty section rather than a plausible one.
 */
export function WorkReceiptView({ receipt }: { receipt: Record<string, unknown> }) {
  const items = strings(receipt.completedWork);
  const conditions = strings(receipt.conditions);
  const limitations = strings(receipt.limitations);
  const role = record(receipt.role);
  const review = record(receipt.review);
  const defense = record(receipt.defense);
  const changedFact = record(receipt.changedFact);
  const reviewedClaims = Array.isArray(receipt.reviewedClaims)
    ? receipt.reviewedClaims.map(record)
    : [];
  const targets = strings(receipt.targetRequirementIds);
  const roleTitle = String(role.title ?? "Sandbox work receipt");

  return (
    <article className="mx-auto max-w-[920px] text-[var(--text-primary)]">
      <p className="text-app-meta font-medium text-[var(--fydell-changed)]">Demo Work Receipt</p>
      <h1 className="mt-2 text-app-page">Candidate 01 · {roleTitle}</h1>
      <p className="mt-2 text-app-body text-[var(--text-secondary)]">
        {targets.length
          ? `Targeted verification of ${targets.join(", ")} in an isolated fictional sandbox session.`
          : "Isolated fictional sandbox session."}
      </p>
      <p className="mt-5 border-y border-[var(--border-subtle)] py-3 text-app-body text-[var(--text-secondary)]">
        {String(
          receipt.label ?? "Fictional sandbox work receipt. Not valid for employment verification.",
        )}
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Format", String(receipt.formatVersion ?? "—")],
          ["Proof spec", String(role.proofSpecVersion ?? "—")],
          ["Fixture", String(role.fixtureVersion ?? "—")],
          ["Review kind", String(review.kind ?? "—").replaceAll("_", " ")],
          ["Review decision", String(review.decision ?? "—").replaceAll("_", " ")],
          [
            "Changed fact",
            `${String(changedFact.id ?? "none")} · ${changedFact.released ? "released" : "not released"}`,
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-app-meta text-[var(--text-tertiary)]">{label}</dt>
            <dd className="mt-1 text-app-body">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-3">
            <h2 className="text-app-section">Work performed</h2>
          </div>
          {items.length ? (
            <ul>
              {items.map((item) => (
                <li
                  key={item}
                  className="border-b border-[var(--border-subtle)] px-5 py-3 text-app-body text-[var(--text-secondary)] last:border-b-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-3 text-app-body text-[var(--text-tertiary)]">
              No completed work was recorded on this receipt.
            </p>
          )}
        </div>
        <div className="space-y-5">
          <section className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-app-section">Reviewed claims</h2>
            {reviewedClaims.length ? (
              <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                {reviewedClaims.map((claim) => (
                  <li key={String(claim.id)} className="py-2">
                    <p className="text-app-meta text-[var(--text-tertiary)]">
                      {String(claim.requirementId)} ·{" "}
                      {String(claim.direction).replaceAll("_", " ")} ·{" "}
                      {String(claim.reviewStatus).replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-app-body text-[var(--text-secondary)]">
                      {String(claim.summary)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-app-body text-[var(--text-tertiary)]">
                No claims reached review on this receipt.
              </p>
            )}
          </section>
          <section className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-app-section">Not established</h2>
            {limitations.length ? (
              <ul className="mt-2 space-y-1.5">
                {limitations.map((item) => (
                  <li key={item} className="text-app-body text-[var(--text-secondary)]">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-app-body text-[var(--text-tertiary)]">
                No limitations were recorded.
              </p>
            )}
            <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">
              Defense question {defense.questionExists ? "recorded" : "missing"} · response{" "}
              {defense.responseExists ? "recorded" : "missing"}
            </p>
          </section>
        </div>
      </div>

      <section className="mt-6 border-t border-[var(--border-subtle)] pt-5">
        <h2 className="text-app-section">Verification and provenance</h2>
        <p className="mt-2 text-app-body text-[var(--text-secondary)]">
          {String(review.label ?? "Review state not recorded")} · Candidate-controlled sharing
        </p>
        <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">
          {String(review.disclaimer ?? "")}
        </p>
        <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">{conditions.join(" · ")}</p>
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
