import { AdminPageHeader } from "@/components/admin/AdminUi";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import PilotFeedbackExplorer, { type PilotFeedbackRow } from "./PilotFeedbackExplorer";

// Auth: the (ops) layout wraps every page in requirePlatformRole, so this
// page is only reachable by signed-in platform admins.
export const dynamic = "force-dynamic";

async function loadRows(): Promise<{ rows: PilotFeedbackRow[]; loadError: string | null }> {
  if (!isSupabaseConfigured()) {
    return { rows: [], loadError: "Supabase is not configured, so no feedback can be loaded." };
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("pilot_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    return { rows: [], loadError: `Could not load feedback: ${error.message}` };
  }
  return { rows: (data || []) as PilotFeedbackRow[], loadError: null };
}

export default async function AdminPilotFeedbackPage() {
  const { rows, loadError } = await loadRows();

  return (
    <div>
      <AdminPageHeader
        title="Pilot feedback"
        description="Structured feedback from pilot testers who completed a simulation through /pilot. Averages always show their sample size."
      />

      {loadError ? (
        <p className="mt-8 rounded-[12px] border border-[#F43F5E]/25 bg-[#F43F5E]/10 px-4 py-3 text-[13px] text-[#FDA4AF]">
          {loadError}
        </p>
      ) : (
        <div className="mt-8">
          <PilotFeedbackExplorer rows={rows} />
        </div>
      )}
    </div>
  );
}
