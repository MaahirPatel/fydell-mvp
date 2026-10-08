"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { api } from "../api";
import { Banner, StatusText } from "../ui";
import { jobIsLive, type DraftState, type PublicJob, type SectionKey } from "../types";
import { BriefEditor } from "./BriefEditor";
import { CoworkersEditor } from "./CoworkersEditor";
import { CriteriaEditor } from "./CriteriaEditor";
import { FilesEditor } from "./FilesEditor";
import { JobStages } from "./JobStages";
import { changesFor, type Draft } from "./model";
import { PreviewPanel } from "./PreviewPanel";
import { PublishedPanel, ReviewPanel } from "./ReviewPanel";
import { TestsEditor } from "./TestsEditor";
import { ValidationPanel } from "./ValidationPanel";

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string } | { kind: "conflict"; message: string };
type TabKey = "brief" | "files" | "tests" | "criteria" | "coworkers" | "preview" | "validation";

const TABS: Array<{ value: TabKey; label: string }> = [
  { value: "brief", label: "Brief" },
  { value: "files", label: "Files" },
  { value: "tests", label: "Tests" },
  { value: "criteria", label: "Criteria" },
  { value: "coworkers", label: "Coworkers" },
  { value: "preview", label: "Preview" },
  { value: "validation", label: "Validation" },
];

const STATUS_LABEL: Record<DraftState["draft"]["status"], string> = {
  draft: "Draft",
  in_review: "Approved, not published",
  published: "Published",
  archived: "Archived",
};

export type WorkspacePermissions = { author: boolean; approve: boolean; publish: boolean };

/** Viewers without evaluator access get the package with no protected material. */
function toDraft(s: DraftState): Draft | null {
  if (!s.package) return null;
  return {
    pkg: s.package,
    prot: s.protected ?? { protectedTests: [], protectedTestRefs: [], reference: { files: [], approaches: [] }, incorrectSolutions: [], coworkerFacts: {}, rubricNotes: {} },
  };
}

export default function DraftWorkspace({
  initial,
  permissions,
  generationAvailable,
  attachableVersionIds,
  initialTab,
}: {
  initial: DraftState;
  permissions: WorkspacePermissions;
  generationAvailable: boolean;
  attachableVersionIds: string[];
  initialTab?: string;
}) {
  const router = useRouter();
  const draftId = initial.draft.id;
  const [state, setState] = useState<DraftState>(initial);
  const [draft, setDraft] = useState<Draft | null>(() => toDraft(initial));
  const [job, setJob] = useState<PublicJob | null>(initial.job);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [dirtyCount, setDirtyCount] = useState(0);
  const [tab, setTab] = useState<TabKey>(TABS.some((t) => t.value === initialTab) ? (initialTab as TabKey) : "brief");
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState<"test" | "regenerate" | null>(null);
  const [scope, setScope] = useState<"starter" | "tests">("tests");
  const [confirmArchive, setConfirmArchive] = useState(false);

  const draftRef = useRef<Draft | null>(draft);
  const revisionRef = useRef(initial.draft.revision);
  const dirty = useRef(new Map<SectionKey, number>());
  const timers = useRef(new Map<SectionKey, number>());
  const chain = useRef<Promise<void>>(Promise.resolve());
  const conflict = useRef(false);
  const refreshTimer = useRef<number | null>(null);

  const generating = Boolean(job && job.kind === "generate" && jobIsLive(job));
  const readOnly = !permissions.author || generating || state.draft.status === "archived";

  // ---- server state ----------------------------------------------------------

  const applyState = useCallback((next: DraftState, replaceLocal: boolean) => {
    setState(next);
    if (next.job) setJob(next.job);
    const changedElsewhere = next.draft.revision !== revisionRef.current;
    const d = toDraft(next);
    if (d && (replaceLocal || (changedElsewhere && dirty.current.size === 0 && !conflict.current))) {
      draftRef.current = d;
      setDraft(d);
      revisionRef.current = next.draft.revision;
      if (replaceLocal) {
        dirty.current.clear();
        setDirtyCount(0);
        conflict.current = false;
        setSave({ kind: "idle" });
      }
    }
  }, []);

  const reload = useCallback(
    async (replaceLocal: boolean) => {
      const res = await api<DraftState>(`/api/eng/authoring/drafts/${draftId}`);
      if (res.ok) applyState(res.data, replaceLocal);
      return res.ok;
    },
    [applyState, draftId],
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => void reload(false), 1200);
  }, [reload]);

  // ---- autosave --------------------------------------------------------------

  const saveSection = useCallback(
    async (section: SectionKey) => {
      const count = dirty.current.get(section);
      const current = draftRef.current;
      if (!count || !current || conflict.current) return;
      const built = changesFor(section, current);
      if ("invalid" in built) {
        setSave({ kind: "error", message: built.invalid });
        return;
      }
      setSave({ kind: "saving" });
      const res = await api<{ revision: number }>(`/api/eng/authoring/drafts/${draftId}`, {
        method: "PATCH",
        body: { revision: revisionRef.current, section, changes: built.changes },
      });
      if (res.ok) {
        revisionRef.current = res.data.revision;
        if (dirty.current.get(section) === count) dirty.current.delete(section);
        setDirtyCount(dirty.current.size);
        setSave(dirty.current.size ? { kind: "saving" } : { kind: "saved" });
        scheduleRefresh();
      } else if (res.status === 409) {
        conflict.current = true;
        setSave({ kind: "conflict", message: res.error });
      } else {
        setSave({ kind: "error", message: res.error });
      }
    },
    [draftId, scheduleRefresh],
  );

  const enqueue = useCallback(
    (section: SectionKey) => {
      chain.current = chain.current.then(() => saveSection(section));
      return chain.current;
    },
    [saveSection],
  );

  const edit = useCallback(
    (section: SectionKey, update: (d: Draft) => Draft) => {
      const current = draftRef.current;
      if (!current) return;
      const next = update(current);
      draftRef.current = next;
      setDraft(next);
      dirty.current.set(section, (dirty.current.get(section) ?? 0) + 1);
      setDirtyCount(dirty.current.size);
      const existing = timers.current.get(section);
      if (existing) window.clearTimeout(existing);
      timers.current.set(
        section,
        window.setTimeout(() => {
          timers.current.delete(section);
          void enqueue(section);
        }, 1000),
      );
    },
    [enqueue],
  );

  const flush = useCallback(async () => {
    for (const [section, t] of timers.current) {
      window.clearTimeout(t);
      timers.current.delete(section);
      void enqueue(section);
    }
    await chain.current;
  }, [enqueue]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // ---- jobs ------------------------------------------------------------------

  const liveJobId = job && jobIsLive(job) ? job.id : null;
  const liveJobKind = job?.kind;
  useEffect(() => {
    if (!liveJobId) return;
    let stopped = false;
    const tick = async () => {
      const res = await api<{ job: PublicJob | null }>(`/api/eng/authoring/jobs/${liveJobId}`);
      if (stopped || !res.ok || !res.data.job) return;
      setJob(res.data.job);
      if (!jobIsLive(res.data.job)) await reload(liveJobKind === "generate");
    };
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 2500);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [liveJobId, liveJobKind, reload]);

  async function runChecks() {
    setStarting("test");
    setActionError(null);
    await flush();
    if (conflict.current) {
      setStarting(null);
      return;
    }
    const res = await api<{ job: PublicJob }>(`/api/eng/authoring/drafts/${draftId}/test`, { method: "POST", body: {} });
    setStarting(null);
    if (!res.ok) return setActionError(res.error);
    setJob(res.data.job);
  }

  async function regenerate(s: "all" | "starter" | "tests") {
    setStarting("regenerate");
    setActionError(null);
    await flush();
    const res = await api<{ job: PublicJob }>(`/api/eng/authoring/drafts/${draftId}/regenerate`, { body: { scope: s } });
    setStarting(null);
    if (!res.ok) return setActionError(res.error);
    setJob(res.data.job);
  }

  async function archive() {
    const res = await api<{ archived: boolean }>(`/api/eng/authoring/drafts/${draftId}`, { method: "DELETE" });
    if (!res.ok) return setActionError(res.error);
    router.push("/app/employer/work-samples?tab=archived");
  }

  async function reloadAfterConflict() {
    for (const t of timers.current.values()) window.clearTimeout(t);
    timers.current.clear();
    await reload(true);
  }

  // ---- render ----------------------------------------------------------------

  const title = draft?.pkg.brief.title || state.draft.title;
  const pathLabel = state.draft.path === "import" ? "Uploaded draft" : state.draft.path === "template" ? "Template draft" : "Generated draft";
  const testJob = job && job.kind === "test" ? job : null;
  const genJob = job && job.kind === "generate" ? job : null;
  const publishedVersion = state.draft.publishedVersionId ? state.draft.nextVersion - 1 : null;

  const header = (
    <PageHeader
      title={title}
      meta={
        <>
          <span className="text-[14px] text-[var(--text-secondary)]">{pathLabel}</span>
          <StatusText tone={state.draft.status === "published" ? "good" : state.draft.status === "archived" ? "neutral" : "pending"}>{STATUS_LABEL[state.draft.status]}</StatusText>
          {save.kind === "saving" ? <StatusText tone="busy">Saving</StatusText> : null}
          {save.kind === "saved" && dirtyCount === 0 ? <StatusText tone="good">Saved</StatusText> : null}
          {save.kind === "error" ? <StatusText tone="bad">Not saved</StatusText> : null}
        </>
      }
      action={
        permissions.publish && state.draft.status !== "archived" ? (
          confirmArchive ? (
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={archive}>
                Archive draft
              </Button>
              <Button variant="quiet" size="sm" onClick={() => setConfirmArchive(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="quiet" size="sm" onClick={() => setConfirmArchive(true)}>
              Archive
            </Button>
          )
        ) : null
      }
    />
  );

  // Generation in progress or failed before any content exists.
  if (!draft) {
    return (
      <div className="max-w-[760px]">
        {header}
        <Panel className="mt-6">
          <PanelSection
            title={genJob && jobIsLive(genJob) ? "Generating the draft" : genJob?.status === "failed" ? "Generation stopped" : "No content yet"}
            description={
              genJob && jobIsLive(genJob)
                ? "The model is rate limited, so this takes several minutes. You can leave this page; generation continues on the server."
                : undefined
            }
          >
            {genJob ? <JobStages job={genJob} /> : <p className="text-[14px] text-[var(--text-secondary)]">This draft has no content and no generation job.</p>}
            {genJob?.status === "failed" ? (
              <div className="mt-4 grid gap-3">
                {genJob.error ? (
                  <Banner tone="bad" role="alert">
                    {genJob.error}
                  </Banner>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {permissions.author && generationAvailable ? (
                    <Button variant="primary" onClick={() => regenerate("all")} loading={starting === "regenerate"}>
                      Try again
                    </Button>
                  ) : null}
                  <ButtonLink variant="secondary" href={`/app/employer/work-samples/new?from=${draftId}`}>
                    Edit configuration
                  </ButtonLink>
                </div>
              </div>
            ) : null}
            {actionError ? (
              <Banner className="mt-3" tone="bad" role="alert">
                {actionError}
              </Banner>
            ) : null}
          </PanelSection>
        </Panel>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px]">
      {header}

      <div className="mt-6 grid gap-4">
        {save.kind === "conflict" ? (
          <Banner
            tone="warn"
            role="alert"
            title="This draft changed somewhere else"
            action={
              <Button size="sm" variant="secondary" onClick={reloadAfterConflict}>
                Reload latest version
              </Button>
            }
          >
            {save.message} Autosave is paused. Reloading replaces the edits you have not saved in this tab, so copy anything you want to keep first.
          </Banner>
        ) : null}
        {save.kind === "error" ? (
          <Banner tone="bad" role="alert" title="Your last change was not saved">
            {save.message} Your text is kept here; fix the problem and saving resumes.
          </Banner>
        ) : null}
        {genJob && jobIsLive(genJob) ? (
          <Panel>
            <PanelSection title="Regenerating" description="Editing is paused until regeneration finishes. Regenerated sections replace the current ones.">
              <JobStages job={genJob} />
            </PanelSection>
          </Panel>
        ) : null}
        {genJob?.status === "failed" ? (
          <Banner tone="bad" title="The last regeneration stopped">
            {genJob.error ?? "No detail was recorded."} The draft below is unchanged.
          </Banner>
        ) : null}
        {actionError ? (
          <Banner tone="bad" role="alert">
            {actionError}
          </Banner>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="min-w-0">
          <div className="overflow-x-auto overflow-y-hidden">
            <Tabs idBase="ws" label="Draft sections" items={TABS} value={tab} onValueChange={(v) => setTab(v as TabKey)} />
          </div>
          <div className="mt-5">
            {(["brief", "files", "tests", "criteria", "coworkers"] as const).map((key) => (
              <TabPanel key={key} value={key} idBase="ws" active={tab === key}>
                <fieldset disabled={readOnly} className="min-w-0">
                  {key === "brief" ? <BriefEditor draft={draft} edit={edit} /> : null}
                  {key === "files" ? <FilesEditor draft={draft} edit={edit} readOnly={readOnly} /> : null}
                  {key === "tests" ? <TestsEditor draft={draft} edit={edit} readOnly={readOnly} /> : null}
                  {key === "criteria" ? <CriteriaEditor draft={draft} edit={edit} readOnly={readOnly} /> : null}
                  {key === "coworkers" ? <CoworkersEditor draft={draft} edit={edit} readOnly={readOnly} /> : null}
                </fieldset>
              </TabPanel>
            ))}
            <TabPanel value="preview" idBase="ws" active={tab === "preview"}>
              <PreviewPanel draftId={draftId} currentSha={state.packageSha256} beforeLoad={flush} onLoaded={() => void reload(false)} />
            </TabPanel>
            <TabPanel value="validation" idBase="ws" active={tab === "validation"}>
              <ValidationPanel
                state={state}
                testJob={testJob}
                canRun={permissions.author && !generating && state.draft.status !== "archived"}
                running={starting === "test"}
                onRun={runChecks}
                dirty={dirtyCount > 0}
              />
            </TabPanel>
          </div>
        </div>

        <div className="grid min-w-0 gap-6 xl:sticky xl:top-6">
          {state.draft.publishedVersionId && publishedVersion ? (
            <PublishedPanel
              versionId={state.draft.publishedVersionId}
              version={publishedVersion}
              attachable={attachableVersionIds.includes(state.draft.publishedVersionId)}
              onOpenPreview={() => setTab("preview")}
            />
          ) : null}
          <ReviewPanel
            state={state}
            canApprove={permissions.approve}
            canPublish={permissions.publish}
            dirty={dirtyCount > 0}
            onOpenPreview={() => setTab("preview")}
            onChanged={async () => {
              await reload(false);
              router.refresh();
            }}
          />
          {permissions.author && state.draft.status !== "archived" ? (
            <Panel>
              <PanelSection title="Regenerate" description="Regenerated sections replace your current edits in those sections.">
                {generationAvailable ? (
                  <div className="grid gap-3">
                    <fieldset className="grid gap-2" disabled={generating}>
                      <legend className="sr-only">What to regenerate</legend>
                      <label className="flex items-start gap-2 text-[14px] leading-[1.45] text-[var(--text-body)]">
                        <input type="radio" name="regen-scope" className="mt-[3px]" checked={scope === "tests"} onChange={() => setScope("tests")} />
                        <span>
                          Tests only
                          <span className="block text-[13px] text-[var(--text-secondary)]">Replaces public and evaluation tests and incorrect solutions.</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 text-[14px] leading-[1.45] text-[var(--text-body)]">
                        <input type="radio" name="regen-scope" className="mt-[3px]" checked={scope === "starter"} onChange={() => setScope("starter")} />
                        <span>
                          Starter project and tests
                          <span className="block text-[13px] text-[var(--text-secondary)]">Also replaces starter files and the reference solution. The brief is kept.</span>
                        </span>
                      </label>
                    </fieldset>
                    <Button variant="secondary" onClick={() => regenerate(scope)} loading={starting === "regenerate"} disabled={generating}>
                      Regenerate {scope === "tests" ? "tests" : "starter and tests"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-[14px] text-[var(--text-secondary)]">Generation is not configured on this server. Edit the files and tests directly.</p>
                )}
              </PanelSection>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
