import { Suspense } from "react";
import WorkroomRunner from "@/components/workroom/WorkroomRunner";
import { legacyMeridianEnabled } from "@/lib/fde/flags";

// Validate token server-side. Only explicit demo-* tokens run without persistence.
async function resolveToken(token: string): Promise<{
  valid: boolean;
  demo: boolean;
  candidateName?: string | null;
  simulationTitle?: string;
}> {
  if (token.startsWith("demo")) {
    // #region agent log
    fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "dc0a6c",
      },
      body: JSON.stringify({
        sessionId: "dc0a6c",
        runId: "loop-fix",
        hypothesisId: "H2",
        location: "workroom/page.tsx:resolveToken",
        message: "Explicit demo token",
        data: { demo: true, tokenPrefix: token.slice(0, 8) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return {
      valid: true,
      demo: true,
      candidateName: null,
      simulationTitle: "Project Meridian — FP&A Forecast Review",
    };
  }

  try {
    const { validateCandidateInvite } = await import("@/lib/mvp/db");
    const result = await validateCandidateInvite(token);
    // #region agent log
    fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "dc0a6c",
      },
      body: JSON.stringify({
        sessionId: "dc0a6c",
        runId: "loop-fix",
        hypothesisId: "H2",
        location: "workroom/page.tsx:resolveToken",
        message: "Invite validation result",
        data: {
          ok: Boolean(result),
          demo: false,
          tokenPrefix: token.slice(0, 8),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!result) return { valid: false, demo: false };
    return {
      valid: true,
      demo: false,
      candidateName: result.invite.candidate_name,
      simulationTitle: result.simulation.title,
    };
  } catch (err) {
    // #region agent log
    fetch("http://127.0.0.1:7392/ingest/681204a9-761a-4288-901b-c44a46a40f3b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "dc0a6c",
      },
      body: JSON.stringify({
        sessionId: "dc0a6c",
        runId: "loop-fix",
        hypothesisId: "H2",
        location: "workroom/page.tsx:resolveToken",
        message: "Validation threw",
        data: {
          error: err instanceof Error ? err.message : "unknown",
          tokenPrefix: token.slice(0, 8),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return { valid: false, demo: false };
  }
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function WorkroomPage({ params }: PageProps) {
  const { token } = await params;

  // Legacy Project Meridian workroom is retired from customer traffic.
  // WorkroomRunner / the Meridian engine stay in the codebase for rollback.
  if (!legacyMeridianEnabled()) {
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
            maxWidth: 460,
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
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 10px",
              letterSpacing: "-0.03em",
            }}
          >
            This simulation has been replaced by Project Relay
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: "0 0 20px" }}>
            Project Meridian work trials are no longer active. Fydell now runs Project Relay, a
            live AI-operations deployment simulation.
          </p>
          <a
            href="/app/fde"
            style={{
              display: "inline-flex",
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              padding: "0 20px",
              borderRadius: 9,
              background: "#F1F2F4",
              color: "#08090C",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to Project Relay
          </a>
        </div>
      </div>
    );
  }

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
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 10px",
              letterSpacing: "-0.03em",
            }}
          >
            Invitation not found
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>
            This link is invalid, expired, or has already been cancelled. Ask your hiring contact
            for a new invite.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <WorkroomRunner
        token={token}
        candidateName={ctx.candidateName}
        simulationTitle={ctx.simulationTitle}
        demo={ctx.demo}
      />
    </Suspense>
  );
}
