import "server-only";
import { GithubClient, GithubError, type PublicRepo } from "@/lib/passport/github/client";
import { getOwnerPassport } from "@/lib/passport/store";
import { RateLimitedError, measureRepository, selectRepositories } from "./activity";
import { writeNarrative } from "./narrative";
import { completeAnalysis, failAnalysis, latestCompleteReport } from "./store";
import { synthesize } from "./synthesize";
import type { BuilderAnalysisReport, RepoActivity } from "./types";

type Scope = BuilderAnalysisReport["scope"];

/**
 * A repository measured in an earlier run is reused when GitHub reports the
 * same last push, so re-running costs requests only for what changed.
 */
function reusable(previous: RepoActivity[] | undefined, repo: PublicRepo): RepoActivity | null {
  const hit = previous?.find((a) => a.repo.toLowerCase() === repo.fullName.toLowerCase());
  if (!hit || !hit.pushedAt || hit.pushedAt !== repo.pushedAt || hit.errors.length) return null;
  return { ...hit, reused: true, archived: repo.archived, stars: repo.stars ?? hit.stars };
}

export async function collectActivity(
  login: string,
  previous: RepoActivity[] | undefined,
  client = new GithubClient(),
): Promise<{ activity: RepoActivity[]; scope: Omit<Scope, "deepProjects"> }> {
  const skipped: Scope["skipped"] = [];
  let listing: { repositories: PublicRepo[]; truncated: boolean };
  try {
    listing = await client.listPublicRepositories(login, { perPage: 100, maxPages: 1 });
  } catch (err) {
    const reason = err instanceof GithubError && err.code === "not_found" ? "GitHub username not found" : err instanceof GithubError && err.code === "rate_limited" ? "GitHub rate limit reached" : "GitHub was unavailable";
    return { activity: [], scope: { scannedRepos: 0, forksExcluded: 0, archivedIncluded: 0, listingTruncated: false, skipped: [{ repo: login, reason }], commitsSampled: 0 } };
  }
  const { selected, forksExcluded, overCap } = selectRepositories(listing.repositories);
  for (const r of overCap) skipped.push({ repo: r.fullName, reason: "Over the per-run scan limit" });

  const activity: RepoActivity[] = [];
  let limited = false;
  for (const repo of selected) {
    if (limited) {
      skipped.push({ repo: repo.fullName, reason: "GitHub rate limit reached" });
      continue;
    }
    const reused = reusable(previous, repo);
    if (reused) {
      activity.push(reused);
      continue;
    }
    try {
      activity.push(await measureRepository(client, repo, login));
    } catch (err) {
      if (err instanceof RateLimitedError) {
        limited = true;
        skipped.push({ repo: repo.fullName, reason: "GitHub rate limit reached" });
        continue;
      }
      skipped.push({ repo: repo.fullName, reason: "Could not be read" });
    }
  }
  return {
    activity,
    scope: {
      scannedRepos: activity.length,
      forksExcluded,
      archivedIncluded: activity.filter((a) => a.archived).length,
      listingTruncated: listing.truncated,
      skipped,
      commitsSampled: activity.reduce((n, a) => n + (a.commits?.byYou ?? 0), 0),
    },
  };
}

/** Runs one analysis to completion and records the outcome. Never throws. */
export async function runAnalysis(id: string, ownerId: string): Promise<void> {
  try {
    const passport = await getOwnerPassport(ownerId);
    const projects = passport?.projects ?? [];
    const login = passport?.githubLogin ?? null;
    const previous = await latestCompleteReport(ownerId);
    const collected = login
      ? await collectActivity(login, previous?.activity)
      : { activity: [], scope: { scannedRepos: 0, forksExcluded: 0, archivedIncluded: 0, listingTruncated: false, skipped: [], commitsSampled: 0 } };
    if (projects.length === 0 && collected.activity.length === 0) {
      await failAnalysis(id, login ? "No public repositories or imported projects could be read. Import a project or check your GitHub username." : "Link your GitHub username or import a project first.");
      return;
    }
    const synthesis = synthesize({
      displayName: passport?.displayName ?? "You",
      githubLogin: login,
      projects,
      activity: collected.activity,
      scope: { deepProjects: projects.length, ...collected.scope },
      now: new Date(),
    });
    const narrative = await writeNarrative(synthesis);
    await completeAnalysis(id, { ...synthesis, narrative });
  } catch {
    await failAnalysis(id, "The analysis could not be completed. Try again in a few minutes.");
  }
}
