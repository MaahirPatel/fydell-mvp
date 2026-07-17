import { requirePlatformRole } from "@/lib/ops/require-platform-role";
import OpsVariantsList from "./OpsVariantsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ops — Relay variants · Fydell" };

export default async function OpsVariantsPage() {
  const admin = await requirePlatformRole(["super_admin", "admin", "operator", "reviewer"]);

  return (
    <main className="min-h-[100dvh] bg-[#050609] px-6 py-10 text-[#F4F5F7]">
      <div className="mx-auto max-w-[920px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
          Ops · signed in as {admin.email}
        </p>
        <h1 className="mt-1 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
          Relay variant pipeline
        </h1>
        <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-white/55">
          Three deterministic, seed-derived variants of Project Relay plus the known-good
          canonical baseline. Nothing here is served to a real candidate session unless it is
          approved and passes validation — review, re-validate, and sign a release below.
        </p>
        <p className="mt-3 max-w-[64ch] rounded-[10px] border border-white/10 bg-white/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-white/50">
          Sessions default to the known-good baseline (<code>project-relay@known-good</code>)
          regardless of what is approved here. Serving a variant instead requires explicitly
          setting <code>RELAY_ACTIVE_VARIANT_ID</code> — this page exists to prove the
          materialize → validate → approve → sign-release pipeline works, not to auto-switch
          production sessions.
        </p>

        <div className="mt-8">
          <OpsVariantsList />
        </div>
      </div>
    </main>
  );
}
