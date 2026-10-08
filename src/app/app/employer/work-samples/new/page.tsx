import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import CreatorForm from "@/components/work-samples/CreatorFormLoader";
import { getDraft } from "@/lib/eng/authoring/drafts";
import { authoringProvider } from "@/lib/eng/authoring/generate";
import { registryPayload, type AuthoringInput } from "@/lib/eng/authoring/registry";
import { selectRunner } from "@/lib/eng/authoring/runner";
import { trackAvailability } from "@/lib/eng/exemplars/registry";
import { engAdmin } from "@/lib/eng/context";
import { pageMember } from "@/lib/eng/employer-view";
import { isUuid } from "@/lib/eng/http";
import { roleCan } from "@/lib/eng/permissions";

export const metadata = { title: "Create work sample" };
export const dynamic = "force-dynamic";

export default async function NewWorkSamplePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const member = await pageMember();
  if (!member) redirect("/app/employer");
  if (!roleCan(member.role, "author_work_samples")) redirect("/app/employer/work-samples");
  const { from } = await searchParams;

  let prefill: AuthoringInput | null = null;
  if (from && isUuid(from)) {
    try {
      prefill = (await getDraft(engAdmin(), member, from, false)).input;
    } catch {
      prefill = null;
    }
  }

  const runner = selectRunner();
  const capabilities = {
    execution: runner.runner
      ? { available: true, label: runner.runner.info.label, isolated: runner.runner.info.isolated }
      : { available: false, label: runner.detail ?? "Execution unavailable.", isolated: false },
    generation: { available: authoringProvider() !== null },
  };

  return (
    <div className="max-w-[1180px]">
      <p className="text-[14px] text-[var(--text-secondary)]">
        <Link href="/app/employer/work-samples?tab=drafts" className="hover:text-[var(--text-primary)] hover:underline">
          Work samples
        </Link>
      </p>
      <PageHeader
        className="mt-2"
        title="Create work sample"
        description="Start from a validated role-model simulation for the track you are hiring for. Run it as reviewed, or have Fydell adapt it to your business context. Every draft is run and checked, and your team reviews it before anything reaches a candidate."
      />
      <div className="mt-7">
        <CreatorForm registry={registryPayload()} tracks={trackAvailability()} capabilities={capabilities} prefill={prefill} fromDraft={prefill ? (from ?? null) : null} />
      </div>
    </div>
  );
}
