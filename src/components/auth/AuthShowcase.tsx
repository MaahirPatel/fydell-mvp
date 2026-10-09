import FydellMark from "@/components/brand/FydellMark";
import { CodeBlock } from "@/components/marketing/home/CodeBlock";
import { SourceRef, Status, type StatusKind } from "@/components/ui/report";
import {
  DEMO_CANDIDATE,
  DEMO_LABEL,
  DEMO_PASSPORT_PROJECTS,
  DEMO_PIPELINE,
  DEMO_PROJECT_FINDINGS,
  DEMO_PROJECT_LIMITS,
  DEMO_REPORT,
  DEMO_REPOSITORY,
  DEMO_SOURCE_FILE,
  DEMO_TASK,
} from "@/lib/marketing/demo-fixture";

export type ShowcaseVariant = "engineer" | "employer";

/**
 * The right half of every auth screen: the product the person is signing in
 * to, drawn with the shared report primitives and the public example fixture.
 * It has no controls, and the window is labelled as example data.
 */

function Window({ crumb, children }: { crumb: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_24px_48px_-12px_rgba(16,24,40,0.14)]">
      <div className="flex h-11 items-center gap-3 border-b border-[var(--border-subtle)] px-4">
        <Status kind="attention" icon={false}>
          {DEMO_LABEL}
        </Status>
        <p className="flex min-w-0 items-center gap-2 text-[13px] text-[var(--text-secondary)]">
          <FydellMark width={16} />
          <span className="truncate">{crumb}</span>
        </p>
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[12.5px] font-medium text-[var(--text-secondary)]">{children}</p>;
}

function BuilderProfile() {
  const finding = DEMO_PROJECT_FINDINGS[0];
  const lines = DEMO_SOURCE_FILE.lines.filter((l) => l.n >= 42 && l.n <= 47);
  return (
    <Window crumb={`Builder Profile · ${DEMO_CANDIDATE.name}`}>
      <div className="px-6 pb-6 pt-5">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-selected)] text-[15px] font-semibold text-[var(--text-primary)]"
          >
            C1
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-semibold leading-tight tracking-[-0.014em] text-[var(--text-primary)]">{DEMO_CANDIDATE.name}</p>
            <p className="mt-0.5 text-[14px] text-[var(--text-secondary)]">{DEMO_CANDIDATE.headline}</p>
            <p className="mt-1.5 text-[13px] tabular-nums text-[var(--text-tertiary)]">
              @candidate-01 · {DEMO_PASSPORT_PROJECTS.length} projects · {DEMO_PROJECT_FINDINGS.length} findings cited
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Label>Featured projects</Label>
          <ul className="mt-2 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
            {DEMO_PASSPORT_PROJECTS.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] font-medium text-[var(--text-primary)]">{p.name}</p>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--text-secondary)]">{p.detail}</p>
                </div>
                <Status kind="neutral">{p.attribution}</Status>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Cited finding</Label>
            <Status kind="pending" icon={false}>
              {finding.basis}
            </Status>
          </div>
          <p className="mt-2 text-[15px] leading-[1.5] text-[var(--text-primary)]">{finding.finding}</p>
          <p className="mt-1">
            <SourceRef path={DEMO_SOURCE_FILE.path} line={44} /> <span className="text-[13px] text-[var(--text-tertiary)]">· {DEMO_REPOSITORY.fullName} @ {DEMO_REPOSITORY.commit}</span>
          </p>
          <div className="mt-3">
            <CodeBlock path={DEMO_SOURCE_FILE.path} meta={`L44–46 · ${DEMO_REPOSITORY.commit}`} lines={lines} compact />
          </div>
          <p className="mt-3 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">Not checked:</span> {DEMO_PROJECT_LIMITS[0]}
          </p>
        </div>
      </div>
    </Window>
  );
}

const PIPELINE_KIND: Record<(typeof DEMO_PIPELINE)[number]["tone"], StatusKind> = {
  positive: "success",
  attention: "attention",
  neutral: "neutral",
  system: "pending",
};

function ApplicantReview() {
  const strength = DEMO_REPORT.strengths[0];
  const concern = DEMO_REPORT.concerns[0];
  const diff = DEMO_TASK.diff.filter((l) => l.n >= 13 && l.n <= 18);
  return (
    <Window crumb={`${DEMO_REPORT.role} · Applicants`}>
      <div className="grid grid-cols-[200px_minmax(0,1fr)]">
        <ul className="border-r border-[var(--border-subtle)] py-2">
          {DEMO_PIPELINE.slice(0, 4).map((row, i) => (
            <li
              key={row.candidate}
              className={`mx-2 rounded-[7px] px-3 py-2.5 ${i === 0 ? "bg-[var(--surface-selected)]" : ""}`}
              aria-current={i === 0 ? "true" : undefined}
            >
              <p className="text-[14px] font-medium text-[var(--text-primary)]">{row.candidate}</p>
              <Status kind={PIPELINE_KIND[row.tone]} icon={false} className="mt-1.5 h-[20px] px-1.5 text-[12px]">
                {row.state.split(" · ")[0]}
              </Status>
            </li>
          ))}
        </ul>

        <div className="min-w-0 px-5 pb-6 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-tight tracking-[-0.012em] text-[var(--text-primary)]">{DEMO_CANDIDATE.name}</p>
              <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">
                {DEMO_TASK.title} · {DEMO_REPORT.assessment}
              </p>
            </div>
            <Status kind="success">{DEMO_REPORT.review}</Status>
          </div>

          <div className="mt-5">
            <Label>Strength</Label>
            <p className="mt-2 text-[14px] leading-[1.5] text-[var(--text-primary)]">{strength.text}</p>
            <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
              {strength.basis} · <SourceRef path={DEMO_TASK.filePath} line={14} />
            </p>
            <div className="mt-2.5">
              <CodeBlock path={DEMO_TASK.filePath} meta="submitted" lines={diff} compact />
            </div>
          </div>

          <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Concern</Label>
              <Status kind="attention">1 test failed</Status>
            </div>
            <p className="mt-2 text-[14px] leading-[1.5] text-[var(--text-primary)]">{concern.text}</p>
            <p className="mt-1 font-mono text-[12px] text-[var(--text-tertiary)]">{concern.source}</p>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4 text-[13px]">
            <span className="text-[var(--text-secondary)]">Not assessed: {DEMO_REPORT.notAssessed[1]}</span>
            <span className="shrink-0 text-[var(--text-tertiary)]">Decision not recorded</span>
          </div>
        </div>
      </div>
    </Window>
  );
}

const COPY: Record<ShowcaseVariant, { title: string; body: string; aria: string }> = {
  engineer: {
    title: "Your real projects, cited line by line.",
    body: "Fydell reads the code you choose and links every finding to the lines behind it. Your profile stays private until you share a link.",
    aria: "Example Builder Profile",
  },
  employer: {
    title: "Every finding opens to its evidence.",
    body: "Candidates do one practical task. Your team reads what they did, with the code, tests and messages behind each claim, then decides.",
    aria: "Example applicant review",
  },
};

export default function AuthShowcase({ variant }: { variant: ShowcaseVariant }) {
  const copy = COPY[variant];
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-12 pt-16 xl:px-16 xl:pt-20">
        <h2 className="max-w-[22ch] text-balance text-[30px] font-semibold leading-[1.12] tracking-[-0.024em] text-[var(--text-primary)] xl:text-[34px]">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-[52ch] text-pretty text-[15px] leading-[1.6] text-[var(--text-secondary)]">{copy.body}</p>
      </div>
      <figure
        aria-label={copy.aria}
        className="relative mt-10 min-h-0 flex-1 overflow-hidden px-12 xl:px-16 [mask-image:linear-gradient(to_bottom,black_78%,transparent)]"
      >
        <div className="w-full max-w-[640px]">{variant === "engineer" ? <BuilderProfile /> : <ApplicantReview />}</div>
      </figure>
    </div>
  );
}
