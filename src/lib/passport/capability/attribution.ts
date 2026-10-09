import type { ContributionSignals } from "../github/types";
import type { ProjectRelationship } from "../context-contract";
import type { Attribution } from "./types";

const COMMIT_LIMIT =
  "Commit authorship is a signal, not proof: commits can be squashed, rebased, co-authored or made on someone's behalf, and the account connection proves control of the account, not who typed each line.";

/**
 * Derives contribution status from what was recorded at import and what the
 * engineer stated. The engineer's relationship is shown as theirs; it never
 * raises the level. Forks, an owner other than the connected login, and
 * missing history lower it automatically.
 */
export function assessAttribution(input: {
  sourceKind: "github" | "upload";
  isFork: boolean;
  repoFullName: string;
  signals: ContributionSignals | null | undefined;
  relationship: ProjectRelationship;
  statement: string;
}): Attribution {
  const { signals, relationship } = input;
  const stated = input.statement.trim().length > 0;
  const base: Attribution = {
    level: "not_assessable",
    personClaimsAllowed: false,
    relationship,
    relationshipSource: relationship === "unspecified" ? "not_stated" : "engineer",
    automatic: [],
    summary: "",
    limits: [],
    paths: signals?.paths ?? [],
    login: signals?.login ?? null,
    repositoryOwner: signals?.repositoryOwner || (input.sourceKind === "github" ? input.repoFullName.split("/")[0] : null),
  };
  const statementNote = stated ? " The engineer's statement is shown separately." : "";

  if (relationship === "reference") {
    return {
      ...base,
      level: "none",
      automatic: [{ reason: "reference_declared", detail: "The engineer marked this as a reference project." }],
      summary: "Marked by the engineer as a reference project. Findings describe the project only and make no claim about the engineer.",
      limits: ["Reference projects never contribute personal capability claims."],
    };
  }
  if (input.sourceKind === "upload" || signals?.checked === "upload_no_history") {
    return {
      ...base,
      level: stated ? "statement_only" : "not_assessable",
      automatic: [{ reason: "no_history", detail: "Uploaded code carries no commit history." }],
      summary: `Uploaded code has no commit history, so nothing links the engineer to specific lines.${statementNote}`,
      limits: ["Where uploaded code came from, and who wrote it, was not assessed."],
    };
  }
  if (!signals) {
    return {
      ...base,
      level: stated ? "statement_only" : "not_assessable",
      automatic: [{ reason: "not_recorded", detail: "This snapshot was imported before commit history was checked." }],
      summary: `Imported before Fydell checked commit history, so nothing links the engineer to specific lines.${statementNote}`,
      limits: ["Re-analyze the project to check commit history for the cited files."],
    };
  }
  if (signals.checked === "no_login") {
    return {
      ...base,
      level: stated ? "statement_only" : "not_assessable",
      automatic: [{ reason: "no_login", detail: "No GitHub account was connected when this was imported." }],
      summary: `No GitHub account was connected, so commit history was not checked.${statementNote}`,
      limits: ["Connect a GitHub account and re-analyze to check commits on the cited files."],
    };
  }
  if (signals.checked === "unavailable") {
    return {
      ...base,
      level: stated ? "statement_only" : "not_assessable",
      automatic: [{ reason: "history_unavailable", detail: "GitHub history could not be read during the import." }],
      summary: `GitHub history could not be read, so contribution was not assessed.${statementNote}`,
      limits: ["Re-analyze later to check commit history."],
    };
  }

  const automatic: Attribution["automatic"] = [];
  const login = signals.login ?? "";
  if (signals.fork || input.isFork) automatic.push({ reason: "fork", detail: "This repository is a fork, so most of its history belongs to the upstream project." });
  if (!signals.ownerMatchesLogin) automatic.push({ reason: "owner_mismatch", detail: `The repository belongs to ${signals.repositoryOwner}, not the connected account ${login}.` });
  const linked = signals.paths.filter((p) => p.commitsByLogin > 0);
  const checked = signals.paths.length;
  const limits = [COMMIT_LIMIT];
  if (signals.fork || input.isFork) limits.push("Only commits by the connected account count; upstream authors wrote the rest of the fork.");
  if (relationship === "team_project") limits.push("Team project: other people may have changed the same files.");
  if (relationship === "learning_exercise") limits.push("Described by the engineer as a learning exercise.");

  if (checked === 0) {
    return {
      ...base,
      level: stated ? "statement_only" : "not_assessable",
      automatic,
      summary: `There were no findings to check against ${login}'s commits.${statementNote}`,
      limits,
    };
  }
  if (linked.length === 0) {
    automatic.push({ reason: "no_commits_on_cited_paths", detail: `No commits by ${login} touch the cited files.` });
    const thirdParty = !signals.ownerMatchesLogin || signals.fork || input.isFork;
    const claimsOwnership = relationship === "maintained" || relationship === "contributor" || relationship === "team_project";
    return {
      ...base,
      level: thirdParty ? "none" : stated ? "statement_only" : "none",
      automatic,
      summary: thirdParty
        ? `Owned by ${signals.repositoryOwner}${signals.fork || input.isFork ? " (a fork)" : ""}, and no commits by ${login} touch the ${checked} cited files. Treated as a third-party project: findings describe the project only.${claimsOwnership ? " The engineer's stated relationship is shown separately and does not change this." : ""}`
        : `The connected account owns this repository, but none of the ${checked} cited files have commits by ${login}. Owning a repository does not show who wrote it.${statementNote}`,
      limits,
    };
  }
  const all = linked.length === checked;
  return {
    ...base,
    level: all ? "commit_signal" : "partial_commit_signal",
    personClaimsAllowed: true,
    automatic,
    summary: all
      ? `${login} has commits on all ${checked} cited files. Capabilities are limited to those files.`
      : `${login} has commits on ${linked.length} of ${checked} cited files (${linked.slice(0, 3).map((p) => p.path).join(", ")}${linked.length > 3 ? ", and others" : ""}). Findings in the other files describe the project only.`,
    limits,
  };
}

export function pathSignal(a: Attribution, path: string) {
  return a.paths.find((p) => p.path === path) ?? null;
}
