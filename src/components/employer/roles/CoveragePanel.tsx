import {
  COVERAGE_LABEL,
  coverageFor,
  FAMILY_LABEL,
  SPECIALIZATION_LABEL,
  taskFamiliesFor,
  type CoverageStatus,
  type RoleFamily,
  type Specialization,
} from "@/lib/eng/taxonomy";

const BADGE: Record<CoverageStatus, string> = {
  ready: "badge-teal",
  in_development: "badge-attention",
  not_available: "badge-neutral",
};

/**
 * What Fydell can offer as a reviewed work sample for this kind of role.
 * Coverage never limits the role itself: reviews start from existing evidence.
 */
export default function CoveragePanel({ family, specialization }: { family: RoleFamily; specialization: Specialization }) {
  const tasks = taskFamiliesFor(family, specialization);
  const overall = coverageFor(family, specialization);
  const name = specialization === "general" ? FAMILY_LABEL[family] : `${FAMILY_LABEL[family]}, ${SPECIALIZATION_LABEL[specialization]}`;
  return (
    <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-app-meta font-medium text-[var(--text-primary)]">Work sample coverage for {name}</p>
        <span className={`badge ${BADGE[overall]}`}>{COVERAGE_LABEL[overall]}</span>
      </div>
      <p className="mt-1 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
        You can create and publish this role whatever the coverage. Reviews start from each applicant&apos;s existing work; a work sample is only offered when a requirement has no evidence.
      </p>
      {tasks.length === 0 ? (
        <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">No task families are defined for this combination yet.</p>
      ) : (
        <ul className="mt-3 grid gap-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 text-app-meta">
              <span className="text-[var(--text-body)]">{t.label}</span>
              <span className={`badge shrink-0 ${BADGE[t.status]}`}>{COVERAGE_LABEL[t.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
