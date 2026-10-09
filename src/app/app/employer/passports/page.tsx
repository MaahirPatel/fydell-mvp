import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { listReviews } from "@/lib/passport/store";
import { questionsAwaitingReview } from "@/lib/employer/review";
import { PageHeader } from "@/components/ui/PageHeader";
import AddPassportForm from "@/components/employer/AddPassportForm";
import { LocalDate } from "@/components/eng/LocalTime";

export const metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

const DECISION_LABEL = { none: "Needs review", advance: "Advance to interview", hold: "Hold", decline: "Decline" } as const;
const DECISION_BADGE = { none: "badge-attention", advance: "badge-teal", hold: "badge-neutral", decline: "badge-neutral" } as const;

export default async function EmployerPassportsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fpassports");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  const [reviews, awaiting] = await Promise.all([listReviews(org.organizationId), questionsAwaitingReview(org.organizationId)]);
  const answersByShare = new Map<string, number>();
  for (const a of awaiting) answersByShare.set(a.shareId, (answersByShare.get(a.shareId) ?? 0) + a.count);
  const needingAction = [...answersByShare.values()].reduce((n, c) => n + c, 0);

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Every Passport shared with your team, from role applications or a link a candidate sent you. Review the evidence behind each finding, then record your team's decision."
      />
      <div className="mt-6">
        <AddPassportForm />
      </div>

      {needingAction ? (
        <p className="mt-6 text-app-body text-[var(--text-primary)]">
          <span className="font-medium">
            {needingAction} new answer{needingAction === 1 ? "" : "s"} to read.
          </span>{" "}
          <span className="text-[var(--text-secondary)]">Candidates replied to your follow-up questions; they are marked below.</span>
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        {reviews.length === 0 ? (
          <p className="px-5 py-8 text-app-body text-[var(--text-secondary)]">
            No shared passports yet. When a candidate sends you their passport link, paste it above to start a review.
          </p>
        ) : (
          <table className="w-full text-left text-app-body">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-app-meta text-[var(--text-tertiary)]">
                <th scope="col" className="px-4 py-2.5 font-medium">Candidate</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Evidence</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Decision</th>
                <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Added</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-hover)]">
                  <td className="px-4 py-3">
                    <Link href={`/app/employer/passports/${r.id}`} className="font-medium text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                      {r.candidateName}
                    </Link>
                    {r.shareRevoked ? <span className="ml-2 badge badge-neutral">Link revoked</span> : null}
                    {answersByShare.get(r.shareId) ? (
                      <span className="ml-2 badge badge-attention">
                        {answersByShare.get(r.shareId)} new answer{answersByShare.get(r.shareId) === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{r.roleTitle || "No role set"}</td>
                  <td className="hidden px-4 py-3 text-[var(--text-secondary)] md:table-cell">
                    {r.shareRevoked ? "Not available" : `${r.projects} project${r.projects === 1 ? "" : "s"} · ${r.findings} findings`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${DECISION_BADGE[r.decision]}`}>{DECISION_LABEL[r.decision]}</span>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-app-meta text-[var(--text-tertiary)] sm:table-cell">
                    <LocalDate iso={r.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
