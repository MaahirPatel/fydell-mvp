import { Suspense } from "react";
import WorkroomRunner from "@/components/workroom/WorkroomRunner";

// Validate token server-side if Supabase is available; fall back to demo mode.
async function resolveToken(token: string): Promise<{
  valid: boolean;
  demo: boolean;
  candidateName?: string | null;
  simulationTitle?: string;
}> {
  // Demo tokens (no DB needed)
  if (token.startsWith("demo") || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      valid: true,
      demo: true,
      candidateName: null,
      simulationTitle: "Project Meridian — FP&A Forecast Review",
    };
  }

  try {
    // Dynamic import keeps this out of edge bundles and avoids issues when
    // SUPABASE_URL isn't configured.
    const { validateCandidateInvite } = await import("@/lib/mvp/db");
    const result = await validateCandidateInvite(token);
    if (!result) return { valid: false, demo: false };
    return {
      valid: true,
      demo: false,
      candidateName: result.invite.candidate_name,
      simulationTitle: result.simulation.title,
    };
  } catch {
    // Supabase not configured — run in demo mode
    return {
      valid: true,
      demo: true,
      candidateName: null,
      simulationTitle: "Project Meridian — FP&A Forecast Review",
    };
  }
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function WorkroomPage({ params }: PageProps) {
  const { token } = await params;
  const ctx = await resolveToken(token);

  if (!ctx.valid) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#05070d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.012)), rgba(12,16,30,0.7)",
            padding: "36px",
            textAlign: "center",
            backdropFilter: "blur(22px)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔒</div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#f7f8fb",
              margin: "0 0 10px",
              letterSpacing: "-0.03em",
            }}
          >
            Invalid or expired link
          </h1>
          <p style={{ fontSize: 14, color: "#a7b0c0", margin: 0, lineHeight: 1.6 }}>
            This simulation link is no longer valid. Please contact the hiring team
            for a new invite link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<WorkroomLoadingShell />}>
      <WorkroomRunner
        token={token}
        candidateName={ctx.candidateName}
        simulationTitle={ctx.simulationTitle}
        demo={ctx.demo}
      />
    </Suspense>
  );
}

function WorkroomLoadingShell() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#05070d",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#a7b0c0",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            border: "2px solid rgba(124,61,255,0.4)",
            borderTopColor: "#7c3dff",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading workroom…
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
