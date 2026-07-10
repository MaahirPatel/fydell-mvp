"use client";

import { SimulationCard } from "@/components/dashboard/SimulationCard";
import { DEMO_CANDIDATES, DEMO_SIMULATION } from "@/lib/dashboard-demo";

export default function SimulationsPage() {
  const completed = DEMO_CANDIDATES.filter(
    (c) => c.status === "submitted" || c.status === "reviewed"
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <p className="eyebrow" style={{ marginBottom: 10 }}>
          Simulations
        </p>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            margin: "0 0 6px",
          }}
        >
          Active simulations
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
          One simulation is active for your workspace. Additional simulations available on request.
        </p>
      </div>

      {/* Card */}
      <div>
        <SimulationCard
          id={DEMO_SIMULATION.id}
          title={DEMO_SIMULATION.title}
          role={DEMO_SIMULATION.role}
          industry={DEMO_SIMULATION.industry ?? "Finance"}
          durationMinutes={DEMO_SIMULATION.duration_minutes ?? 25}
          difficulty={DEMO_SIMULATION.difficulty ?? "Intermediate"}
          status="active"
          totalInvites={DEMO_CANDIDATES.length}
          completedAttempts={completed}
        />
      </div>

      {/* Coming soon */}
      <div className="glass-card" style={{ padding: "24px 28px" }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--faint)",
            marginBottom: 12,
          }}
        >
          More simulations
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {["Strategic Planning Review", "Budget Variance Analysis", "M&A Scenario Modeling"].map(
            (title) => (
              <div
                key={title}
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: 12,
                  padding: "16px 18px",
                  opacity: 0.5,
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--muted)",
                    margin: "0 0 4px",
                  }}
                >
                  {title}
                </p>
                <p style={{ fontSize: 12, color: "var(--faint)", margin: 0 }}>
                  Coming soon
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
