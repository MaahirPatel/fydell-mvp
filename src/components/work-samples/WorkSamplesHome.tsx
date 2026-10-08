"use client";

import { useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { Table, TBody, TD, TDPrimary, TH, THead, TR } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { LocalTime, StatusText, type Tone } from "./ui";

export type DraftItem = {
  id: string;
  title: string;
  path: "template" | "import" | "generated";
  status: "draft" | "in_review" | "published" | "archived";
  level: string;
  revision: number;
  publishedVersionId: string | null;
  updatedAt: string;
};

export type VersionItem = {
  id: string;
  title: string;
  version: number;
  origin: string;
  status: string;
  level: string | null;
  publishedAt: string | null;
  draftId: string | null;
};

export type InvitationItem = { id: string; roleId: string; roleTitle: string; candidate: string; status: "invited" | "accepted"; workSample: string; expiresAt: string };
export type SubmissionItem = { attemptId: string; roleTitle: string; candidate: string; workSample: string; submittedAt: string | null };

type TabKey = "library" | "drafts" | "invitations" | "submissions" | "archived";
const TAB_KEYS: TabKey[] = ["library", "drafts", "invitations", "submissions", "archived"];

const DRAFT_STATUS: Record<DraftItem["status"], { tone: Tone; text: string }> = {
  draft: { tone: "pending", text: "Draft" },
  in_review: { tone: "pending", text: "Approved, not published" },
  published: { tone: "good", text: "Published" },
  archived: { tone: "neutral", text: "Archived" },
};

const PATH_LABEL: Record<DraftItem["path"], string> = { generated: "Generated draft", import: "Uploaded draft", template: "Template" };

type LibraryRow = VersionItem & { versionIds: string[] };

/** One row per work sample: its newest published version, remembering the earlier ones. */
function latestPerSample(published: VersionItem[]): LibraryRow[] {
  const groups = new Map<string, LibraryRow>();
  for (const v of published) {
    const key = v.draftId ?? `${v.origin}:${v.title}`;
    const current = groups.get(key);
    if (!current) groups.set(key, { ...v, versionIds: [v.id] });
    else {
      const versionIds = [...current.versionIds, v.id];
      groups.set(key, v.version > current.version ? { ...v, versionIds } : { ...current, versionIds });
    }
  }
  return [...groups.values()].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export function WorkSamplesHome({
  drafts,
  versions,
  invitations,
  submissions,
  initialTab,
  highlightVersion,
}: {
  drafts: DraftItem[];
  versions: VersionItem[];
  invitations: InvitationItem[];
  submissions: SubmissionItem[];
  initialTab: string | null;
  highlightVersion: string | null;
}) {
  const [tab, setTab] = useState<TabKey>(TAB_KEYS.includes(initialTab as TabKey) ? (initialTab as TabKey) : "library");
  const library = latestPerSample(versions.filter((v) => v.status === "published"));
  const retired = versions.filter((v) => v.status !== "published" && v.origin !== "fydell_reviewed");
  const openDrafts = drafts.filter((d) => d.status !== "archived");
  const archivedDrafts = drafts.filter((d) => d.status === "archived");

  function change(next: string) {
    setTab(next as TabKey);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    url.searchParams.delete("version");
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      <div className="overflow-x-auto overflow-y-hidden">
        <Tabs
          idBase="wsh"
          label="Work samples"
          value={tab}
          onValueChange={change}
          items={[
            { value: "library", label: "Library", count: library.length },
            { value: "drafts", label: "Drafts", count: openDrafts.length },
            { value: "invitations", label: "Active invitations", count: invitations.length },
            { value: "submissions", label: "Submissions", count: submissions.length },
            { value: "archived", label: "Archived", count: archivedDrafts.length + retired.length },
          ]}
        />
      </div>

      <div className="mt-5">
        <TabPanel value="library" idBase="wsh" active={tab === "library"}>
          {library.length === 0 ? (
            <EmptyState title="No published work samples yet" description="Fydell-reviewed work samples and the versions your team publishes appear here." />
          ) : (
            <Panel>
              <Table>
                <THead>
                  <TH>Work sample</TH>
                  <TH>Source</TH>
                  <TH align="right">Latest version</TH>
                  <TH>Published</TH>
                </THead>
                <TBody>
                  {library.map((v) => {
                    const highlighted = highlightVersion !== null && v.versionIds.includes(highlightVersion);
                    return (
                    <TR key={v.id} className={cn(highlighted && "bg-[var(--surface-selected)]")} aria-current={highlighted ? "true" : undefined}>
                      <TDPrimary>
                        {v.draftId ? (
                          <Link href={`/app/employer/work-samples/drafts/${v.draftId}`} className="hover:underline">
                            {v.title}
                          </Link>
                        ) : v.origin === "fydell_reviewed" ? (
                          <Link href="/app/employer/engineering" className="hover:underline">
                            {v.title}
                          </Link>
                        ) : (
                          v.title
                        )}
                      </TDPrimary>
                      <TD>{v.origin === "fydell_reviewed" ? "Fydell-reviewed" : "Your workspace"}</TD>
                      <TD align="right" className="tabular-nums">
                        {v.version}
                        {v.versionIds.length > 1 ? (
                          <span className="block text-app-meta text-[var(--text-tertiary)]">{v.versionIds.length} published</span>
                        ) : null}
                      </TD>
                      <TD><LocalTime iso={v.publishedAt} /></TD>
                    </TR>
                    );
                  })}
                </TBody>
              </Table>
            </Panel>
          )}
        </TabPanel>

        <TabPanel value="drafts" idBase="wsh" active={tab === "drafts"}>
          {openDrafts.length === 0 ? (
            <EmptyState title="No drafts" description="Describe the work, and Fydell drafts a starter project, tests and criteria for your team to review." />
          ) : (
            <DraftTable drafts={openDrafts} />
          )}
        </TabPanel>

        <TabPanel value="invitations" idBase="wsh" active={tab === "invitations"}>
          {invitations.length === 0 ? (
            <EmptyState
              title="No active invitations"
              description="Invitations are sent to applicants from an opening, or to candidates from an engineering role. Open invitations from both appear here."
              action={
                <ButtonLink href="/app/employer/openings" variant="secondary">
                  Go to openings
                </ButtonLink>
              }
              secondary={
                <Link href="/app/employer/engineering" className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline">
                  Engineering roles
                </Link>
              }
            />
          ) : (
            <Panel>
              <Table>
                <THead>
                  <TH>Candidate</TH>
                  <TH>Role</TH>
                  <TH>Work sample</TH>
                  <TH>Status</TH>
                  <TH>Expires</TH>
                </THead>
                <TBody>
                  {invitations.map((i) => (
                    <TR key={i.id}>
                      <TDPrimary>{i.candidate}</TDPrimary>
                      <TD>
                        <Link href={`/app/employer/engineering/roles/${i.roleId}`} className="hover:underline">
                          {i.roleTitle}
                        </Link>
                      </TD>
                      <TD>{i.workSample}</TD>
                      <TD>
                        <StatusText tone={i.status === "accepted" ? "busy" : "pending"}>{i.status === "accepted" ? "Accepted" : "Invited"}</StatusText>
                      </TD>
                      <TD><LocalTime iso={i.expiresAt} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Panel>
          )}
        </TabPanel>

        <TabPanel value="submissions" idBase="wsh" active={tab === "submissions"}>
          {submissions.length === 0 ? (
            <EmptyState title="No submissions yet" description="Submitted work appears here once a candidate uploads their project. Reviews open from each submission." />
          ) : (
            <Panel>
              <Table>
                <THead>
                  <TH>Candidate</TH>
                  <TH>Role</TH>
                  <TH>Work sample</TH>
                  <TH>Submitted</TH>
                </THead>
                <TBody>
                  {submissions.map((s) => (
                    <TR key={s.attemptId}>
                      <TDPrimary>
                        <Link href={`/app/employer/engineering/attempts/${s.attemptId}`} className="hover:underline">
                          {s.candidate}
                        </Link>
                      </TDPrimary>
                      <TD>{s.roleTitle}</TD>
                      <TD>{s.workSample}</TD>
                      <TD><LocalTime iso={s.submittedAt} /></TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </Panel>
          )}
        </TabPanel>

        <TabPanel value="archived" idBase="wsh" active={tab === "archived"}>
          {archivedDrafts.length === 0 && retired.length === 0 ? (
            <EmptyState title="Nothing archived" description="Archived drafts and retired versions stay here for reference. Retired versions can no longer be attached to roles." />
          ) : (
            <div className="grid gap-6">
              {archivedDrafts.length ? <DraftTable drafts={archivedDrafts} /> : null}
              {retired.length ? (
                <Panel>
                  <Table>
                    <THead>
                      <TH>Retired version</TH>
                      <TH align="right">Version</TH>
                      <TH>Published</TH>
                    </THead>
                    <TBody>
                      {retired.map((v) => (
                        <TR key={v.id}>
                          <TDPrimary>{v.title}</TDPrimary>
                          <TD align="right" className="tabular-nums">
                            {v.version}
                          </TD>
                          <TD><LocalTime iso={v.publishedAt} /></TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </Panel>
              ) : null}
            </div>
          )}
        </TabPanel>
      </div>
    </div>
  );
}

function DraftTable({ drafts }: { drafts: DraftItem[] }) {
  return (
    <Panel>
      <Table>
        <THead>
          <TH>Draft</TH>
          <TH>Source</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
        </THead>
        <TBody>
          {drafts.map((d) => {
            const s = DRAFT_STATUS[d.status];
            return (
              <TR key={d.id}>
                <TDPrimary>
                  <Link href={`/app/employer/work-samples/drafts/${d.id}`} className="hover:underline">
                    {d.title}
                  </Link>
                </TDPrimary>
                <TD>{PATH_LABEL[d.path]}</TD>
                <TD>
                  <StatusText tone={s.tone}>{s.text}</StatusText>
                </TD>
                <TD><LocalTime iso={d.updatedAt} /></TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </Panel>
  );
}

export default WorkSamplesHome;
