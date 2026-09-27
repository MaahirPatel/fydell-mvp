import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { getReview } from "@/lib/passport/store";
import PassportView from "@/components/passport/PassportView";
import PassportDecisionPanel from "@/components/employer/PassportDecisionPanel";

export const metadata = { title: "Passport review" };
export const dynamic = "force-dynamic";

export default async function EmployerPassportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/employer/passports/${id}`)}`);
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/account/setup-required?reason=no_org");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const review = await getReview(org.organizationId, id);
  if (!review) notFound();

  return (
    <div>
      <p className="text-app-meta text-[var(--text-tertiary)]">
        <Link href="/app/employer/passports" className="hover:underline">Shared passports</Link> / {review.roleTitle || "No role set"}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {review.passport ? (
            <PassportView passport={review.passport} mode="employer" />
          ) : (
            <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6">
              <h1 className="text-app-section font-medium">The candidate revoked this link</h1>
              <p className="mt-2 text-app-body text-[var(--text-secondary)]">
                Their passport is no longer visible to your workspace. Your decision and notes are kept here.
              </p>
            </div>
          )}
        </div>
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <PassportDecisionPanel reviewId={review.id} initialDecision={review.decision} initialNote={review.privateNote} decidedAt={review.decidedAt} />
        </aside>
      </div>
    </div>
  );
}
