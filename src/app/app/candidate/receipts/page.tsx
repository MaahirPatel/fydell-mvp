import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { listReceipts } from "@/lib/receipts/store";
import { ARTIFACT_LABEL, TIME_STATEMENT } from "@/lib/receipts/contract";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";

export const metadata = { title: "Work receipts" };
export const dynamic = "force-dynamic";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export default async function ReceiptsPage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/receipts")}`);
  const receipts = await listReceipts(user.id);

  return (
    <CandidateShell width="wide" current="work" crumbs={[{ label: "Work receipts" }]}>
      <CandidatePageHead
        title="Work receipts"
        lead="A record of each project snapshot, published evidence version and analysis report Fydell accepted from you, with what was and was not checked. Private to you."
      />
      <p className="mt-4 max-w-[72ch] text-[13px] leading-[1.55] text-[var(--text-tertiary)]">{TIME_STATEMENT}</p>
      {receipts.length === 0 ? (
        <p className="mt-8 text-[15px] text-[var(--text-secondary)]">
          No receipts yet. <Link href="/app/candidate/work-record" className="font-medium underline underline-offset-4">Import or upload a project</Link> and a receipt is recorded when it is saved.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {receipts.map((r) => (
            <li key={r.id} className="py-3.5">
              <Link href={`/app/candidate/receipts/${r.id}`} className="group flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[15px] font-medium text-[var(--text-primary)] group-hover:underline">{r.projectKey ?? ARTIFACT_LABEL[r.artifactType]}</span>
                <span className="text-[13px] text-[var(--text-secondary)]">{ARTIFACT_LABEL[r.artifactType]}</span>
                {r.sourceRevision ? <span className="font-mono text-[12px] text-[var(--text-tertiary)]">{r.sourceRevision.slice(0, 7)}</span> : null}
                <span className="ml-auto text-[13px] text-[var(--text-tertiary)]">Accepted {formatDateTime(r.acceptedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CandidateShell>
  );
}
