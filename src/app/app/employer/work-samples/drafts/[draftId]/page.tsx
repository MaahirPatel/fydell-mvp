import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DraftWorkspace from "@/components/work-samples/workspace/DraftWorkspace";
import { listWorkSampleOptions } from "@/lib/hiring/work-samples";
import { getDraft } from "@/lib/eng/authoring/drafts";
import { authoringProvider } from "@/lib/eng/authoring/generate";
import { AuthoringError } from "@/lib/eng/authoring/jobs";
import { engAdmin } from "@/lib/eng/context";
import { pageMember } from "@/lib/eng/employer-view";
import { isUuid } from "@/lib/eng/http";
import { roleCan } from "@/lib/eng/permissions";

export const metadata = { title: "Work sample draft" };
export const dynamic = "force-dynamic";

export default async function DraftPage({ params, searchParams }: { params: Promise<{ draftId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const member = await pageMember();
  if (!member) redirect("/app/employer");
  if (!roleCan(member.role, "view_roles")) redirect("/app/employer");
  const { draftId } = await params;
  const { tab } = await searchParams;
  if (!isUuid(draftId)) notFound();

  const permissions = {
    author: roleCan(member.role, "author_work_samples"),
    approve: roleCan(member.role, "approve_work_samples"),
    publish: roleCan(member.role, "publish_work_samples"),
  };
  let state;
  try {
    state = await getDraft(engAdmin(), member, draftId, permissions.author || permissions.approve);
  } catch (err) {
    if (err instanceof AuthoringError && err.status === 404) notFound();
    throw err;
  }
  const attachable = state.draft.publishedVersionId ? (await listWorkSampleOptions(member.organizationId)).map((o) => o.scenarioVersionId) : [];

  return (
    <div>
      <p className="mb-2 text-[14px] text-[var(--text-secondary)]">
        <Link href="/app/employer/work-samples?tab=drafts" className="hover:text-[var(--text-primary)] hover:underline">
          Work samples
        </Link>
      </p>
      <DraftWorkspace
        key={state.draft.id}
        initial={state}
        permissions={permissions}
        generationAvailable={authoringProvider() !== null}
        attachableVersionIds={attachable}
        initialTab={tab}
      />
    </div>
  );
}
