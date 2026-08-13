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
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { ButtonLink } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = { title: "You're invited | Fydell" };
export const dynamic = "force-dynamic";

function Dead({ title, detail, hint }: { title: string; detail: string; hint?: string }) {
  return (
    <CandidateShell width="narrow">
      <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">
        {title}
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">
        {detail}
      </p>
      {hint ? (
        <p className="mt-3 text-[13.5px] leading-[1.65] text-[var(--text-tertiary)]">
          {hint}
        </p>
      ) : null}
    </CandidateShell>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <Dead
        title="This invitation link is not valid"
        detail="The link may have been copied incompletely. Check the one in your email, or ask the company that invited you to send a fresh invitation."
      />
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
        ? "This invitation has expired"
        : gate.code === "revoked"
          ? "This invitation was withdrawn"
          : gate.code === "completed"
            ? "This invitation has already been used"
            : "This invitation is not active";
    return (
      <Dead
        title={title}
        detail={gate.reason}
        hint={`Ask ${orgName} to send a new invitation if you still need access. They can do that themselves.`}
      />
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
  const skills = role?.skillsEvaluated.slice(0, 4).join(", ").toLowerCase();

  const facts: [string, string][] = [
    ["Evaluation", content.title],
    ["Working time", `${content.durationMinutes} minutes, one sitting`],
    ["Invitation expires", new Date(invitation.expires_at).toLocaleDateString()],
  ];

  const recorded: [string, string][] = [
    [
      "What you do in the workspace",
      "The materials you open, the questions you ask, the revisions you make, and what you submit.",
    ],
    [
      "Use of the assistant inside the workspace",
      "Observed, not banned. Fydell cannot see tools outside the workspace and does not claim to.",
    ],
    [
      "What is never recorded",
      "No camera, no microphone, no screen recording, no control of your device.",
    ],
  ];

  return (
    <CandidateShell>
      <p className="text-[13px] font-medium text-[var(--text-tertiary)]">
        Invitation from {orgName}
      </p>
      <h1 className="mt-2 text-[clamp(1.5rem,3vw,1.9rem)] font-medium leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)]">
        {orgName} would like to see how you work.
      </h1>
      <p className="mt-3.5 max-w-[58ch] text-[15.5px] leading-[1.65] text-[var(--text-secondary)]">
        This is a piece of real {role?.title || content.roleKey} work rather than a
        quiz. You get the materials someone in the job would have, you can ask a
        colleague questions, and you produce one piece of work at the end. There
        are no trick questions and no single right answer.
      </p>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--border-subtle)] sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-[var(--surface-raised)] px-4 py-3">
            <dt className="text-[12px] text-[var(--text-tertiary)]">{label}</dt>
            <dd className="mt-1 text-[13.5px] font-medium text-[var(--text-primary)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6">
        {existingSessionId ? (
          <ButtonLink href={`/sim/${existingSessionId}`} variant="primary" size="lg">
            Continue where you left off
          </ButtonLink>
        ) : user ? (
          <AcceptInviteButton
            token={token}
            signedInEmail={user.email}
            inviteEmail={invitation.candidate_email}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink
              href={`/signup?type=candidate&next=${next}`}
              variant="primary"
              size="lg"
            >
              Create an account to accept
            </ButtonLink>
            <ButtonLink href={`/login?next=${next}`} variant="secondary" size="lg">
              I already have an account
            </ButtonLink>
          </div>
        )}
        <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">
          Sent to {invitation.candidate_email}. Sign in with that address to accept.
          The timer does not start on this page, or when you sign in.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Surface tone="panel">
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-[13.5px] font-medium text-[var(--text-primary)]">
              Before you start
            </h2>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]">
            <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              Set aside {content.durationMinutes} uninterrupted minutes. Once you
              start, the clock runs.
            </li>
            <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              Use a laptop or desktop at least 1024px wide. There is a lot to read
              side by side.
            </li>
            <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              You will be asked to agree to what is recorded, and to run a quick
              system check, before the timer begins.
            </li>
            {skills ? (
              <li className="px-4 py-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                What this looks at: {skills}.
              </li>
            ) : null}
          </ul>
        </Surface>

        <Surface tone="panel">
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <h2 className="text-[13.5px] font-medium text-[var(--text-primary)]">
              What is recorded
            </h2>
          </div>
          <dl className="divide-y divide-[var(--border-subtle)]">
            {recorded.map(([label, detail]) => (
              <div key={label} className="px-4 py-3">
                <dt className="text-[13px] font-medium text-[var(--text-primary)]">
                  {label}
                </dt>
                <dd className="mt-1 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>
      </div>

      <div className="mt-8 border-t border-[var(--border-subtle)] pt-5">
        <p className="max-w-[70ch] text-[13.5px] leading-[1.7] text-[var(--text-secondary)]">
          {orgName} receives a report of what you did and the evidence behind it.
          You keep your own copy, called a Work Receipt, and you decide whether
          anyone else ever sees it. Your result is not published, not listed, and
          not visible to any other company.
        </p>
        <p className="mt-3 text-[13.5px] leading-[1.7] text-[var(--text-tertiary)]">
          If you need an adjustment to take part, or something goes wrong during
          the evaluation, write to <ContactLink /> or reply to the invitation from{" "}
          {orgName}.{" "}
          <Link
            href="/privacy"
            className="text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
          >
            How your data is handled
          </Link>
          .
        </p>
      </div>
    </CandidateShell>
  );
}
