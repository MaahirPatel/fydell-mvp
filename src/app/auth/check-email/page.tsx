import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ResendConfirmation from "@/components/auth/ResendConfirmation";
import { safeNext, withNext } from "@/lib/auth/safe-next";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export default async function CheckEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNext(single(params.next));
  const email = (single(params.email) ?? "").slice(0, 254);

  return (
    <AuthShell
      title="Confirm your email"
      description={
        email
          ? `We sent a confirmation link to ${email}. Open it to finish setting up your account. The link works once and expires after one hour.`
          : "Your account needs a confirmed email address before you can sign in. Enter it below and we will send a new link."
      }
      footer={
        <p className="text-app-meta text-[var(--text-secondary)]">
          Already confirmed?{" "}
          <Link href={withNext("/login", next)} className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <p className="mb-4 text-app-meta text-[var(--text-secondary)]">
        Nothing arrived? Check spam, then ask for a new link. If this email already has a Fydell account, no new link is sent:{" "}
        <Link href={withNext("/login", next)} className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
          sign in
        </Link>{" "}
        or{" "}
        <Link href="/forgot-password" className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
          reset your password
        </Link>
        .
      </p>
      <ResendConfirmation initialEmail={email} next={next} />
    </AuthShell>
  );
}
