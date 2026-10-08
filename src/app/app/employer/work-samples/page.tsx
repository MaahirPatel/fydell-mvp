import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkSamplesHome, type DraftItem, type VersionItem } from "@/components/work-samples/WorkSamplesHome";
import { listWorkSamples } from "@/lib/eng/authoring/drafts";
import { engAdmin } from "@/lib/eng/context";
import { pageMember } from "@/lib/eng/employer-view";
import { roleCan } from "@/lib/eng/permissions";
import { listActiveInvitations, listSubmissions } from "./_lib/data";

export const metadata = { title: "Work samples" };
export const dynamic = "force-dynamic";

type DraftRow = {
  id: string;
  title: string;
  path: DraftItem["path"];
  status: DraftItem["status"];
  level: string;
  revision: number;
  published_version_id: string | null;
  updated_at: string;
};

type VersionRow = {
  id: string;
  title: string;
  version: number;
  origin: string;
  status: string;
  level: string | null;
  published_at: string | null;
  draft_id: string | null;
};

export default async function WorkSamplesPage({ searchParams }: { searchParams: Promise<{ tab?: string; version?: string }> }) {
  const member = await pageMember();
  if (!member) redirect("/app/employer");
  if (!roleCan(member.role, "view_roles")) redirect("/app/employer");
  const { tab, version } = await searchParams;
  const db = engAdmin();
  const [samples, invitations, submissions] = await Promise.all([
    listWorkSamples(db, member),
    listActiveInvitations(db, member.organizationId),
    listSubmissions(db, member.organizationId),
  ]);
  const drafts: DraftItem[] = (samples.drafts as DraftRow[]).map((d) => ({
    id: d.id,
    title: d.title,
    path: d.path,
    status: d.status,
    level: d.level,
    revision: d.revision,
    publishedVersionId: d.published_version_id,
    updatedAt: d.updated_at,
  }));
  const versions: VersionItem[] = (samples.versions as VersionRow[]).map((v) => ({
    id: v.id,
    title: v.title,
    version: v.version,
    origin: v.origin,
    status: v.status,
    level: v.level,
    publishedAt: v.published_at,
    draftId: v.draft_id,
  }));
  const canAuthor = roleCan(member.role, "author_work_samples");

  return (
    <div className="max-w-[1120px]">
      <PageHeader
        title="Work samples"
        description="Practical tasks candidates complete in their own editor. Each published version is fixed, so every candidate for a role gets the same work."
        action={
          canAuthor ? (
            <ButtonLink href="/app/employer/work-samples/new" variant="primary">
              Create work sample
            </ButtonLink>
          ) : null
        }
      />
      <div className="mt-7">
        <WorkSamplesHome
          drafts={drafts}
          versions={versions}
          invitations={invitations}
          submissions={submissions}
          initialTab={tab ?? null}
          highlightVersion={version ?? null}
        />
      </div>
    </div>
  );
}
