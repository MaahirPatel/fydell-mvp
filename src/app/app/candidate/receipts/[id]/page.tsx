import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getReceiptView } from "@/lib/receipts/store";
import { ARTIFACT_LABEL, INTEGRITY_LABEL, PROCESSING_LABEL, SCOPE_STATEMENT, TIME_STATEMENT } from "@/lib/receipts/contract";
import { FACET_LABEL, type FacetState } from "@/lib/builder-analysis/ledger";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { DetailList, Status, type StatusKind } from "@/components/ui/report";

export const metadata = { title: "Work receipt" };
export const dynamic = "force-dynamic";

const STATE: Record<FacetState, { label: string; kind: StatusKind }> = {
  observed: { label: "Found in the snapshot", kind: "pending" },
  not_observed: { label: "Not observed", kind: "neutral" },
  claimed: { label: "Claimed by you", kind: "pending" },
  not_assessed: { label: "Not assessed", kind: "neutral" },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" });
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/candidate/receipts/${id}`)}`);
  const r = await getReceiptView(user.id, id);
  if (!r) notFound();

  const m = r.manifestRef;
  const manifest = [
    m.filesIncluded !== undefined ? `${m.filesIncluded} files read` : null,
    m.filesExcluded !== undefined ? `${m.filesExcluded} excluded` : null,
    m.findings !== undefined ? `${m.findings} cited finding${m.findings === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(", ");

  return (
    <CandidateShell width="wide" current="work" crumbs={[{ label: "Work receipts", href: "/app/candidate/receipts" }, { label: r.id.slice(0, 8) }]}>
      <CandidatePageHead title={r.projectKey ?? ARTIFACT_LABEL[r.artifactType]} lead={ARTIFACT_LABEL[r.artifactType]} />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Status kind={r.processing.state === "current" ? "success" : "neutral"} icon={false}>{PROCESSING_LABEL[r.processing.state]}</Status>
        <Status kind={r.integrity.state === "matches" ? "success" : "attention"} icon={false}>{INTEGRITY_LABEL[r.integrity.state]}</Status>
      </div>
      <p className="mt-2 max-w-[72ch] text-[14px] leading-[1.55] text-[var(--text-secondary)]">
        {r.processing.detail} {r.integrity.detail}
      </p>

      <section aria-labelledby="receipt-record" className="mt-8">
        <h2 id="receipt-record" className="mb-3 text-[17px] font-semibold text-[var(--text-primary)]">Record</h2>
        <DetailList
          rows={[
            { label: "Receipt", value: <span className="font-mono text-[13px]">{r.id}</span> },
            { label: "Accepted at", value: formatDateTime(r.acceptedAt) },
            { label: "Artifact", value: ARTIFACT_LABEL[r.artifactType] },
            ...(r.projectKey ? [{ label: "Project", value: <span className="font-mono text-[13px]">{r.projectKey}</span> }] : []),
            ...(r.sourceRevision ? [{ label: "Source revision", value: <span className="break-all font-mono text-[13px]">{r.sourceRevision}</span> }] : []),
            ...(r.subjectVersion ? [{ label: "Version", value: r.subjectVersion }] : []),
            ...(r.analysisVersion ? [{ label: "Analysis version", value: <span className="font-mono text-[13px]">{r.analysisVersion}</span> }] : []),
            ...(manifest ? [{ label: "Manifest", value: manifest }] : []),
            ...(m.manifestHash ? [{ label: "Manifest hash", value: <span className="break-all font-mono text-app-meta">{m.manifestHash}</span> }] : []),
            ...(m.inputHash ? [{ label: "Input hash", value: <span className="break-all font-mono text-app-meta">{m.inputHash}</span> }] : []),
            { label: "Content hash (SHA-256)", value: <span className="break-all font-mono text-app-meta">{r.contentHash}</span> },
            ...(r.linkedReport ? [{ label: "Report", value: <Link href={r.linkedReport.href} className="font-medium underline underline-offset-4">{r.linkedReport.label}</Link> }] : []),
          ]}
        />
        <p className="mt-3 max-w-[72ch] text-[13px] leading-[1.55] text-[var(--text-tertiary)]">{TIME_STATEMENT}</p>
      </section>

      <section aria-labelledby="receipt-scope" className="mt-10">
        <h2 id="receipt-scope" className="mb-1 text-[17px] font-semibold text-[var(--text-primary)]">What was checked</h2>
        <p className="mb-3 max-w-[72ch] text-[13px] leading-[1.55] text-[var(--text-secondary)]">{SCOPE_STATEMENT}</p>
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {r.verificationScope.map((s) => (
            <li key={s.facet} className="grid gap-1 py-2.5 sm:grid-cols-[240px_minmax(0,1fr)]">
              <span className="flex items-center gap-2 text-[14px] text-[var(--text-primary)]">
                {FACET_LABEL[s.facet]}
                <Status kind={STATE[s.state].kind} icon={false}>{STATE[s.state].label}</Status>
              </span>
              <span className="text-[14px] text-[var(--text-secondary)]">{s.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      {r.corrections.length ? (
        <section aria-labelledby="receipt-corrections" className="mt-10">
          <h2 id="receipt-corrections" className="mb-1 text-[17px] font-semibold text-[var(--text-primary)]">Your notes on this artifact</h2>
          <p className="mb-3 text-[13px] text-[var(--text-secondary)]">Notes are kept alongside the artifact. They never change it or this receipt.</p>
          <ul className="space-y-1 text-[14px] text-[var(--text-secondary)]">
            {r.corrections.map((c) => (
              <li key={`${c.findingId}:${c.createdAt}`}>
                <span className="font-mono text-app-meta">{c.findingId}</span> · {c.kind} · {formatDateTime(c.createdAt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="receipt-access" className="mt-10">
        <h2 id="receipt-access" className="mb-1 text-[17px] font-semibold text-[var(--text-primary)]">Access</h2>
        <p className="max-w-[72ch] text-[14px] leading-[1.55] text-[var(--text-secondary)]">
          Only you can open this receipt. Share links and applications show the work itself, never the receipt, so revoking a link does not change it. The hash cannot be used to look up anyone&apos;s receipt.
        </p>
        <a
          href={`/api/passport/receipts/${r.id}?download=1`}
          className="mt-4 inline-flex h-9 items-center rounded-full border border-[var(--border-default)] px-4 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-panel)]"
        >
          Export receipt (JSON)
        </a>
      </section>
    </CandidateShell>
  );
}
