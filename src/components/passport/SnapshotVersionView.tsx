import Link from "next/link";
import type { SnapshotVersion } from "@/lib/passport/snapshot-versions";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * One stored analysis of a snapshot, exactly as it was recorded. Read only:
 * receipts and earlier reports link here, so nothing on this page can change
 * what they cited.
 */
export default function SnapshotVersionView({
  version,
  versions,
  focusFindingId,
}: {
  version: SnapshotVersion;
  versions: SnapshotVersion[];
  focusFindingId: string | null;
}) {
  const latest = versions[0];
  const base = `/app/candidate/projects/${version.snapshotId}`;
  return (
    <div>
      <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-primary)]">
        {version.repoFullName}, analysis version {version.version}
      </h1>
      <p className="mt-3 max-w-[72ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">
        This is how revision {version.commitSha.slice(0, 7)} was analyzed under {version.analysisVersion}, stored on {formatDateTime(version.createdAt)} and kept unchanged.
        {latest && latest.version !== version.version ? ` It was analyzed again later as version ${latest.version}; your project report shows that one. ` : " "}
        Receipts and earlier reports that cite this version still resolve here.{" "}
        <Link href={base} className="font-medium text-[var(--text-primary)] underline underline-offset-4">
          Open the current report
        </Link>
      </p>

      <dl className="mt-6 grid max-w-[720px] gap-x-6 gap-y-2 text-[14px] sm:grid-cols-[180px_minmax(0,1fr)]">
        <dt className="text-[var(--text-tertiary)]">Revision</dt>
        <dd className="font-mono text-[var(--text-primary)]">{version.commitSha}</dd>
        <dt className="text-[var(--text-tertiary)]">Analysis rules</dt>
        <dd className="font-mono text-[var(--text-primary)]">{version.analysisVersion}</dd>
        <dt className="text-[var(--text-tertiary)]">Outcome</dt>
        <dd className="text-[var(--text-primary)]">{version.status === "partial" ? "Partial: some files could not be read" : "Analysis complete"}</dd>
        <dt className="text-[var(--text-tertiary)]">Findings</dt>
        <dd className="text-[var(--text-primary)]">{version.findings.length}</dd>
        <dt className="text-[var(--text-tertiary)]">Content hash</dt>
        <dd className="break-all font-mono text-app-meta text-[var(--text-secondary)]">{version.contentHash}</dd>
      </dl>

      <section aria-labelledby="version-findings" className="mt-10">
        <h2 id="version-findings" className="text-[18px] font-semibold text-[var(--text-primary)]">
          Findings in this version
        </h2>
        {version.findings.length === 0 ? (
          <p className="mt-3 text-[14px] text-[var(--text-secondary)]">No rule found anything to cite in this analysis.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {version.findings.map((f) => (
              <li
                key={f.id}
                id={f.id}
                className={`py-3 ${focusFindingId === f.id ? "bg-[var(--surface-selected)]" : ""}`}
                aria-current={focusFindingId === f.id ? "true" : undefined}
              >
                <p className="text-[14px] text-[var(--text-primary)]">{f.finding}</p>
                <p className="mt-0.5 font-mono text-app-meta text-[var(--text-tertiary)]">
                  {f.path}:{f.startLine}-{f.endLine} · {f.detector} · {f.id}
                </p>
                {f.excerpt.length ? (
                  <pre className="mt-2 overflow-x-auto rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-code)] p-2 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
                    {f.excerpt.join("\n")}
                  </pre>
                ) : null}
                {f.limitations.length ? <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">Limits: {f.limitations.join(" ")}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {versions.length > 1 ? (
        <section aria-labelledby="version-list" className="mt-10">
          <h2 id="version-list" className="text-[18px] font-semibold text-[var(--text-primary)]">
            All analyses of this revision
          </h2>
          <ul className="mt-3 space-y-1 text-[14px]">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap gap-x-3">
                <Link href={v.version === latest?.version ? base : `${base}?version=${v.version}`} className="font-medium text-[var(--text-primary)] underline underline-offset-4">
                  Version {v.version}
                </Link>
                <span className="text-[var(--text-secondary)]">
                  {v.analysisVersion}, {v.status}, {v.findings.length} findings, {formatDateTime(v.createdAt)}
                  {v.version === latest?.version ? ", current" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
