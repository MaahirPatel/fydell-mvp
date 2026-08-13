import { getAuthenticatedUser } from "@/lib/auth/resolve-post-login";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import SignOutButton from "@/components/employer/SignOutButton";
import WorkspaceNameForm from "@/components/employer/WorkspaceNameForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface, SurfaceHeader } from "@/components/ui/Surface";
import { ContactLink } from "@/components/ui/ContactLink";
import { isPreviewMode, PREVIEW_ORG, PREVIEW_USER } from "@/lib/dev/preview";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const MANAGER_ROLES = new Set(["owner", "admin"]);

/** One label-and-control row inside a settings section. */
function Row({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-6">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-[var(--text-primary)]">{label}</p>
        {help ? (
          <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
            {help}
          </p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default async function EmployerSettingsPage() {
  const preview = isPreviewMode();
  const user = preview ? PREVIEW_USER : await getAuthenticatedUser();

  let workspaceName = preview ? PREVIEW_ORG.organizationName : "Your workspace";
  let memberRole = preview ? "owner" : "member";
  if (!preview && user && isSupabaseConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("organization_members")
      .select("role, organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    workspaceName =
      (membership?.organizations as { name?: string } | null)?.name || workspaceName;
    memberRole = membership?.role || memberRole;
  }

  const canEdit = MANAGER_ROLES.has(memberRole);

  return (
    <div className="max-w-[720px]">
      <PageHeader
        title="Settings"
        description="Your workspace, your account, and what happens to the data this workspace holds."
      />

      <div className="mt-7 space-y-5">
        <Surface tone="panel">
          <SurfaceHeader
            title="Workspace"
            description="Candidates see this name on the invitation they receive."
          />
          <Row label="Name">
            <WorkspaceNameForm initialName={workspaceName} canEdit={canEdit} />
          </Row>
          <Row label="Your role" help="Roles are managed by the workspace owner.">
            <p className="text-[13.5px] capitalize text-[var(--text-primary)]">
              {memberRole}
            </p>
          </Row>
        </Surface>

        <Surface tone="panel">
          <SurfaceHeader title="Account" />
          <Row label="Email">
            <p className="truncate text-[13.5px] text-[var(--text-primary)]">
              {user?.email || "Not signed in"}
            </p>
          </Row>
          <Row
            label="Session"
            help="Signing out ends this session on this device only."
          >
            <SignOutButton className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-strong)] px-3.5 text-[13.5px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50" />
          </Row>
        </Surface>

        <Surface tone="panel">
          <SurfaceHeader
            title="Data"
            description="What this workspace holds and how long it holds it."
          />
          <Row
            label="Who can read it"
            help="Membership of this workspace is the boundary."
          >
            <p className="text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
              Submissions, scores and reports are visible to members of this
              workspace and to the candidate who produced them. No other company
              can see them, and there is no public directory.
            </p>
          </Row>
          <Row
            label="How long it is kept"
            help="There is no automatic deletion window yet."
          >
            <p className="text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
              Evaluation data stays until it is deleted on request. If your
              organization needs a fixed retention period, agree it with us
              before running a cohort.
            </p>
          </Row>
          <Row label="Export or delete" help="Handled by hand, not self-serve.">
            <p className="text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
              Email <ContactLink /> from an address on this workspace and we will
              confirm what we hold before acting.
            </p>
          </Row>
          <Row
            label="Responsibility"
            help="Fydell produces evidence, not decisions."
          >
            <p className="text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
              Candidates hold their own Work Receipt and control who else sees
              it. Your organization remains responsible for the employment
              decisions it makes using these reports.
            </p>
          </Row>
        </Surface>
      </div>
    </div>
  );
}
