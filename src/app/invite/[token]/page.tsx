import Link from "next/link";
import {
  getInvitationByToken,
  getVersionContent,
  invitationGate,
  markInvitationOpened,
} from "@/lib/simulations/db";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import { AcceptInviteButton } from "@/components/sim/AcceptInviteButton";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata = { title: "You're invited | Fydell" };
export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-slate-900">Invitation not found</h1>
        <p className="mt-2 text-[14px] text-slate-600">
          This link isn&apos;t valid. Check the link in your email, or ask the employer to send a
          fresh invitation.
        </p>
      </Shell>
    );
  }

  const gate = invitationGate(invitation);
  const admin = createAdminSupabaseClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .maybeSingle();
  const orgName = org?.name || "An employer";

  if (!gate.ok) {
    const title =
      gate.code === "expired"
        ? "Invitation expired"
        : gate.code === "revoked"
          ? "Invitation revoked"
          : gate.code === "completed"
            ? "Invitation already used"
            : "This invitation is not active";
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-[14px] text-slate-600">{gate.reason}</p>
        <p className="mt-3 text-[13px] text-slate-500">
          Ask the employer to resend or grant an authorized retake if you still need access.
        </p>
      </Shell>
    );
  }

  await markInvitationOpened(invitation.id);
  const content = await getVersionContent(invitation.template_version_id);
  const role = ROLE_BY_KEY[content.roleKey];
  const user = await requireUser();

  // If this invitation was already accepted by this user, surface the session.
  let existingSessionId: string | null = null;
  if (user) {
    const { data: session } = await admin
      .from("sim_sessions")
      .select("id, candidate_user_id")
      .eq("invitation_id", invitation.id)
      .maybeSingle();
    if (session?.candidate_user_id === user.id) existingSessionId = session.id;
  }

  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <Shell wide>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
        Work simulation invitation
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        {orgName} invited you to show your work
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
        Instead of another résumé screen, {orgName} wants to see how you actually work. You&apos;ll
        step into a realistic {role?.title || content.roleKey} scenario: real materials, real
        stakeholders to talk to, one deliverable.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Fact label="Scenario" value={content.title} />
        <Fact label="Time" value={`${content.durationMinutes} minutes, one sitting`} />
        <Fact label="Expires" value={new Date(invitation.expires_at).toLocaleDateString()} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-[13px] font-semibold text-slate-800">What to know before you start</p>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-slate-600">
          <li>· Desktop required (laptop/desktop, min 1024px wide). The timer does not start on this page.</li>
          <li>· You will accept a versioned consent and run real system checks before Start evaluation.</li>
          <li>
            · What is evaluated: {role?.skillsEvaluated.slice(0, 4).join(", ").toLowerCase()}.
          </li>
          <li>
            · Fydell records disclosed work evidence inside the workspace (resources, questions,
            artifact revisions, submission). No facial, emotion, or device-control claims.
          </li>
          <li>· In-product AI use is observed when present, not banned.</li>
          <li>· The employer receives a citation-backed report. You can later claim a private Work Receipt.</li>
          <li>· Support: {CONTACT_EMAIL}. Withdrawal and accommodation requests go through the inviting employer and Fydell support.</li>
        </ul>
      </div>

      <div className="mt-6">
        {existingSessionId ? (
          <Link
            href={`/sim/${existingSessionId}`}
            className="inline-block rounded-xl bg-slate-900 px-6 py-3 text-[14px] font-semibold text-white hover:bg-slate-800"
          >
            Continue to your session
          </Link>
        ) : user ? (
          <AcceptInviteButton token={token} signedInEmail={user.email} inviteEmail={invitation.candidate_email} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/signup?type=candidate&next=${next}`}
              className="rounded-xl bg-slate-900 px-6 py-3 text-[14px] font-semibold text-white hover:bg-slate-800"
            >
              Create a free account to accept
            </Link>
            <Link
              href={`/login?next=${next}`}
              className="rounded-xl border border-slate-300 px-6 py-3 text-[14px] font-medium text-slate-700 hover:bg-slate-50"
            >
              I already have an account
            </Link>
          </div>
        )}
        <p className="mt-3 text-[12px] text-slate-400">
          Sent to {invitation.candidate_email}. Sign in with that email to accept.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl border border-slate-200 bg-white p-8 shadow-sm`}
      >
        {children}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-[13.5px] font-medium text-slate-800">{value}</p>
    </div>
  );
}
