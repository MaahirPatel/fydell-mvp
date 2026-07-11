import Link from "next/link";

export default function AdminForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#07080B] px-6 text-[#F4F5F7]">
      <div className="max-w-md text-center">
        <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.03em" }}>
          Access restricted
        </h1>
        <p className="mt-3 text-[14px] leading-[1.55] text-[rgba(244,245,247,0.62)]">
          This account is signed in but does not have an active platform administration role.
          Contact a Fydell super administrator.
        </p>
        <Link
          href="/login?next=admin"
          className="mt-6 inline-flex h-9 items-center rounded-[8px] bg-[#F1F2F4] px-4 text-[13px] text-[#08090C]"
          style={{ fontWeight: 560 }}
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
