import { requirePlatformRole } from "@/lib/ops/require-platform-role";
import OpsMissionsList from "./OpsMissionsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ops — Missions · Fydell" };

export default async function OpsMissionsPage() {
  const admin = await requirePlatformRole(["super_admin", "admin", "operator", "reviewer"]);

  return (
    <main className="min-h-[100dvh] bg-[#050609] px-6 py-10 text-[#F4F5F7]">
      <div className="mx-auto max-w-[820px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
          Ops · signed in as {admin.email}
        </p>
        <h1 className="mt-1 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
          Missions under review
        </h1>
        <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/55">
          Missions submitted by employers wait here until they're activated and ready to accept
          invitations.
        </p>

        <div className="mt-8">
          <OpsMissionsList />
        </div>
      </div>
    </main>
  );
}
