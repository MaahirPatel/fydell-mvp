/**
 * Builder Profile project presentation: input validation, drafts from the
 * analysis, ordering, share projection (private projects never leave the
 * server), and with --live the store against the dev database: idempotent
 * manual creation, duplicate warning, version conflicts, featured limit,
 * reanalysis not overwriting edits, and share links. Also project images
 * (byte sniffing, alt text, signed URLs only for shareable projects) and the
 * "How I build" statement (private unless included in shares).
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-project-presentations.ts [--live]
 */
import { randomUUID } from "node:crypto";
import { strToU8, zipSync, type Zippable } from "fflate";
import {
  draftFromProject,
  draftSourceOf,
  formatPeriod,
  imageTargets,
  mergePresentations,
  parseImageAlt,
  parsePresentationInput,
  titleKey,
  withSignedImages,
  type ProjectPresentation,
} from "@/lib/passport/presentation";
import { parseHowIBuild, shareHowIBuild } from "@/lib/profile/how-i-build";
import { sniffImage } from "@/lib/profile/image";
import { projectForShare, type PassportData, type PassportProject } from "@/lib/passport/view";
import { MAX_FEEDBACK_ITEMS, developmentFeedback } from "@/lib/passport/development-feedback";

const PNG = Uint8Array.from(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"),
);

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures++;
}

function project(repo: string, id: string, categories: string[]): PassportProject {
  return {
    id,
    repoFullName: repo,
    sourceKind: "github",
    htmlUrl: `https://github.com/${repo}`,
    commitSha: "a".repeat(40),
    primaryLanguage: "Python",
    isFork: false,
    contributionStatement: "",
    status: "complete",
    coverage: { totalFiles: 3, analyzedFiles: 3, skippedFiles: 0, languages: ["Python", "SQL"], skipReasons: {}, treeTruncated: false },
    analyzedAt: "2026-10-01T00:00:00.000Z",
    notices: [],
    evidence: categories.map((c, i) => ({
      id: `${id}-f${i}`,
      repo,
      detector: "d",
      category: c,
      finding: `finding ${i}`,
      basis: "repository_observation",
      path: "a.py",
      startLine: 1,
      endLine: 2,
      excerpt: [],
      sourceUrl: "",
      limitations: [],
    })),
  };
}

function manual(key: string, overrides: Partial<ProjectPresentation> = {}): ProjectPresentation {
  return {
    ...draftFromProject({ repoFullName: "x/manual", sourceKind: "github", htmlUrl: "", primaryLanguage: null, languages: [], categories: [] }, 1),
    id: randomUUID(),
    projectKey: key,
    sourceKind: "manual",
    title: "Hand-described tool",
    links: [],
    technologies: [],
    confirmedAt: "2026-10-07T00:00:00.000Z",
    version: 1,
    ...overrides,
  };
}

function unitTests() {
  console.log("Input validation");
  const good = parsePresentationInput({
    title: "  Ledger sync ",
    summary: "Keeps two ledgers in step.",
    technologies: ["Go", "go", " Postgres ", 4],
    links: [{ label: "Demo", url: "https://example.com/demo" }, { label: "", url: "" }],
    startedOn: "2025-02",
    endedOn: "2025-09",
    projectState: "shipped",
    teamContext: "team",
    visibility: "private",
    featured: true,
  });
  check("a full presentation is accepted", good.ok);
  if (good.ok) {
    check("the title is trimmed", good.value.title === "Ledger sync");
    check("technologies are de-duplicated case-insensitively and non-text dropped", good.value.technologies.join(",") === "Go,Postgres", good.value.technologies.join(","));
    check("empty link rows are ignored", good.value.links.length === 1);
    check("visibility and featured are kept", good.value.visibility === "private" && good.value.featured);
  }
  check("a missing title is refused", !parsePresentationInput({ title: "  " }).ok);
  check("an http link is refused", !parsePresentationInput({ title: "x", links: [{ url: "http://example.com" }] }).ok);
  check("a javascript: link is refused", !parsePresentationInput({ title: "x", links: [{ url: "javascript:alert(1)" }] }).ok);
  check("a link with credentials is refused", !parsePresentationInput({ title: "x", links: [{ url: "https://user:pw@example.com" }] }).ok);
  check("an end date before the start is refused", !parsePresentationInput({ title: "x", startedOn: "2025-05", endedOn: "2025-01" }).ok);
  check("a malformed month is refused", !parsePresentationInput({ title: "x", startedOn: "2025-13" }).ok);
  check("an over-long summary is refused", !parsePresentationInput({ title: "x", summary: "a".repeat(601) }).ok);
  check("unknown state and team fall back to not stated", (() => {
    const r = parsePresentationInput({ title: "x", projectState: "legendary", teamContext: "army" });
    return r.ok && r.value.projectState === "unspecified" && r.value.teamContext === "unspecified";
  })());
  check("visibility defaults to shareable", (() => {
    const r = parsePresentationInput({ title: "x" });
    return r.ok && r.value.visibility === "shareable";
  })());

  console.log("Drafts from the analysis");
  const p = project("acme/webhook-retry_service", "11111111-1111-4111-8111-111111111111", ["testing", "testing", "data_access", "api_design"]);
  const draft = draftFromProject(draftSourceOf(p), 3);
  check("the title comes from the repository name", draft.title === "Webhook Retry Service", draft.title);
  check("the summary names only observed areas", draft.summary.startsWith("Cited findings in the analyzed code cover"), draft.summary);
  check("purpose, users and contribution are left empty, never guessed", !draft.purpose && !draft.intendedUsers && !draft.contribution);
  check("technologies come from detected languages", draft.technologies.join(",") === "Python,SQL");
  check("generated fields are marked as generated", draft.fieldSources.title === "generated" && draft.fieldSources.summary === "generated");
  check("a draft is unconfirmed and unsaved", draft.confirmedAt === null && draft.id === null && draft.version === 0);
  const noFindings = draftFromProject(draftSourceOf(project("acme/empty", "22222222-2222-4222-8222-222222222222", [])), 1);
  check("no findings means no generated summary", noFindings.summary === "" && noFindings.fieldSources.summary === undefined);

  console.log("Merging and ordering");
  const p2 = project("acme/billing", "33333333-3333-4333-8333-333333333333", ["testing"]);
  const savedBilling: ProjectPresentation = { ...draftFromProject(draftSourceOf(p2), 5), id: randomUUID(), title: "Billing engine", confirmedAt: "2026-10-07T00:00:00Z", version: 2, featured: true };
  const removedRepo: ProjectPresentation = { ...savedBilling, projectKey: "acme/gone", title: "Gone" , featured: false };
  const m1 = manual("manual:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { sortOrder: 2 });
  const merged = mergePresentations([p, p2], [savedBilling, removedRepo, m1]);
  check("saved text wins over a fresh draft", merged.find((x) => x.projectKey === "acme/billing")?.title === "Billing engine");
  check("a repository without a presentation gets a draft", merged.some((x) => x.projectKey === p.repoFullName && x.confirmedAt === null));
  check("presentations for removed repositories are left out", !merged.some((x) => x.projectKey === "acme/gone"));
  check("manual projects are included", merged.some((x) => x.sourceKind === "manual"));
  check("featured projects come first", merged[0].featured);
  check("repository keys match case-insensitively", mergePresentations([project("Acme/Billing", p2.id ?? "", [])], [savedBilling]).length === 1);
  check("titles compare without case or punctuation", titleKey("Ledger-Sync!") === titleKey("ledger sync"));
  check("a period reads naturally", formatPeriod("2025-02", "2025-09", "shipped") === "Feb 2025 – Sep 2025", formatPeriod("2025-02", "2025-09", "shipped"));

  console.log("Share projection");
  const secret = project("acme/secret", "44444444-4444-4444-8444-444444444444", ["security"]);
  const privatePresentation: ProjectPresentation = { ...draftFromProject(draftSourceOf(secret), 9), id: randomUUID(), visibility: "private", confirmedAt: "2026-10-07T00:00:00Z", version: 1 };
  const privateManual = manual("manual:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", { visibility: "private", title: "Private side project" });
  const passport: PassportData = {
    displayName: "Engineer",
    headline: "",
    githubLogin: null,
    projects: [p, p2, secret],
    roleSuggestions: [],
    capabilities: {
      source: "rules",
      capabilities: [
        { statement: "Secure handling", evidenceIds: [secret.evidence[0].id] },
        { statement: "Tests", evidenceIds: [p.evidence[0].id] },
      ],
      notShown: [],
    },
    updatedAt: null,
    contributions: [
      { repoFullName: "acme/secret", workedOn: "secret work", inherited: "", collaboration: "solo", collaborationNote: "", constraintsFaced: "", results: "", improvements: "", evidenceRefs: [], version: 1, updatedAt: "" },
    ],
    decisions: [],
    presentations: [...mergePresentations([p, p2, secret], [savedBilling, privatePresentation, m1, privateManual])],
  };
  const all = projectForShare(passport, ["projects", "evidence", "roles", "capabilities"], { repos: null, versionPolicy: "follow" });
  check("a private repository is left out of the shared projects", !all.projects.some((x) => x.repoFullName === "acme/secret"));
  check("its findings do not support any shared capability", !all.capabilities.capabilities.some((c) => c.statement === "Secure handling"));
  check("its contribution statement is not shared", !(all.contributions ?? []).some((c) => c.repoFullName === "acme/secret"));
  check("its presentation is not shared", !(all.presentations ?? []).some((x) => x.projectKey === "acme/secret"));
  check("private manual projects are not shared", !(all.presentations ?? []).some((x) => x.title === "Private side project"));
  check("shareable manual projects are shared when all projects are included", (all.presentations ?? []).some((x) => x.projectKey === m1.projectKey));
  check("shared presentations carry no row id or version", (all.presentations ?? []).every((x) => x.id === null && x.version === 0));
  const onlyBilling = projectForShare(passport, ["projects", "evidence"], { repos: ["acme/billing"], versionPolicy: "follow" });
  check("a link for one repository shows only that repository's presentation", (onlyBilling.presentations ?? []).map((x) => x.projectKey).join(",") === "acme/billing");
  const withManual = projectForShare(passport, ["projects"], { repos: [m1.projectKey], versionPolicy: "follow" });
  check("a link can include just a manual project", (withManual.presentations ?? []).length === 1 && withManual.projects.length === 0);
  const pinnedSecret = projectForShare(passport, ["projects", "evidence"], { versionPolicy: "pinned", pinnedProjectIds: [secret.id ?? ""] });
  check("a pinned link to a now-private repository stops showing it", pinnedSecret.projects.length === 0);
  const noProjects = projectForShare(passport, ["roles"], { repos: null, versionPolicy: "follow" });
  check("without the projects field, no presentations are shared", noProjects.presentations === undefined);

  console.log("Project images");
  check("an image needs a description", typeof parseImageAlt("   ") !== "string" && typeof parseImageAlt(undefined) !== "string");
  check("an over-long description is refused", typeof parseImageAlt("a".repeat(201)) !== "string");
  check("a description is trimmed and collapsed", parseImageAlt("  Dashboard \n showing  retries ") === "Dashboard showing retries");
  check("PNG, JPEG and WebP are recognised by their bytes", sniffImage(PNG)?.ext === "png" && sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext === "jpg");
  check("a file that only claims to be an image is refused", sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")) === null);
  const privateAlt = "Private admin console screenshot";
  const imaged: PassportData = {
    ...passport,
    presentations: (passport.presentations ?? []).map((x) =>
      x.projectKey === "acme/secret" || x.title === "Private side project"
        ? { ...x, image: { alt: privateAlt, url: "", updatedAt: null } }
        : x.projectKey === "acme/billing"
          ? { ...x, image: { alt: "Billing dashboard", url: "", updatedAt: null } }
          : x,
    ),
  };
  const imagedShare = projectForShare(imaged, ["projects", "evidence", "roles", "capabilities"], { repos: null, versionPolicy: "follow" });
  const imagedJson = JSON.stringify(imagedShare);
  check("a private project's image never appears in the share projection", !imagedJson.includes(privateAlt));
  check("a shareable project's image description survives the projection", imagedJson.includes("Billing dashboard"));
  check("the projection carries no image URL until the server signs one", (imagedShare.presentations ?? []).every((x) => !x.image || x.image.url === ""));
  const rows = [
    { projectKey: "acme/billing", visibility: "shareable" as const, imagePath: "owner/1/a.png" },
    { projectKey: "acme/secret", visibility: "private" as const, imagePath: "owner/2/b.png" },
    { projectKey: m1.projectKey, visibility: "private" as const, imagePath: "owner/3/c.png" },
  ];
  const shareTargets = imageTargets("share", imagedShare.presentations ?? [], rows);
  check("a share signs only images of projects in the projection", [...shareTargets.keys()].join(",") === "acme/billing", [...shareTargets.keys()].join(","));
  check("a share never signs an image whose project is private in the database, even if the list says shareable", !shareTargets.has(m1.projectKey.toLowerCase()));
  check("the owner can see every image they uploaded", imageTargets("owner", imaged.presentations ?? [], rows).size === 3);
  const signed = withSignedImages(imagedShare.presentations ?? [], new Map([["acme/billing", "https://signed.example/x"]]));
  check("a signed image gets its URL", signed.find((x) => x.projectKey === "acme/billing")?.image?.url === "https://signed.example/x");
  check("an image that could not be signed falls back to the text-only layout", signed.filter((x) => x.projectKey !== "acme/billing").every((x) => x.image === null));

  console.log("How I build");
  const statement = "I write the failing test first and review each AI suggestion before it lands.";
  const privateHow = parseHowIBuild({ text: statement });
  check("the statement is private by default", privateHow.ok && privateHow.value.includeInShares === false);
  const emptyShared = parseHowIBuild({ text: "   ", includeInShares: true });
  check("an empty statement can never be shared", emptyShared.ok && emptyShared.value.includeInShares === false);
  check("an over-long statement is refused", !parseHowIBuild({ text: "a".repeat(1501) }).ok);
  check("non-text is refused", !parseHowIBuild({ text: 42 }).ok);
  check("a statement not included is dropped from a share", shareHowIBuild({ text: statement, includeInShares: false, updatedAt: null }) === null);
  check("an included statement is kept for a share", shareHowIBuild({ text: statement, includeInShares: true, updatedAt: null })?.text === statement);
  check("the share projection never carries the statement", !imagedJson.includes(statement) && !JSON.stringify(all).includes(statement));

  console.log("Private development feedback");
  const withDetectors = (detectors: string[], skipped = 0): PassportProject => {
    const base = project("acme/api", "55555555-5555-4555-8555-555555555555", detectors.map(() => "backend"));
    return {
      ...base,
      coverage: { ...base.coverage, totalFiles: 10 + skipped, analyzedFiles: 10, skippedFiles: skipped },
      evidence: base.evidence.map((e, i) => ({ ...e, detector: detectors[i] })),
    };
  };
  const untested = developmentFeedback(withDetectors(["fastapi_validated_route", "fastapi_validated_route"]));
  check("handlers with no tests produce an item", untested.some((i) => i.id === "routes_without_tests"));
  const item = untested.find((i) => i.id === "routes_without_tests");
  check("the observation carries the count", !!item && item.observation.includes("2 validated request handlers"), item?.observation);
  check("every item has all six parts", untested.every((i) => i.observation && i.implication && i.nextStep && i.limit && i.recheck && i.evidenceIds.length > 0));
  check("evidence points at the findings that triggered it", !!item && item.evidenceIds.length === 2);
  const tested = developmentFeedback(withDetectors(["fastapi_validated_route", "test_suite"]));
  check("the item clears once tests are found", !tested.some((i) => i.id === "routes_without_tests"));
  check("tests without failure cases produce the next item", tested.some((i) => i.id === "tests_without_failure_paths"));
  check("nothing is suggested without a triggering finding", developmentFeedback(withDetectors([])).length === 0);
  const many = developmentFeedback(withDetectors(["test_suite", "llm_api_integration", "ml_training_step", "container_build", "react_component", "background_job"]));
  check(`at most ${MAX_FEEDBACK_ITEMS} items are shown`, many.length === MAX_FEEDBACK_ITEMS, String(many.length));
  check("partial coverage is stated in the limit", developmentFeedback(withDetectors(["fastapi_validated_route"], 4))[0].limit.includes("Only 10 of 14 files"));
  const sharedJson = JSON.stringify(projectForShare({ ...passport, projects: [withDetectors(["fastapi_validated_route"])], presentations: [] }, ["projects", "evidence", "roles", "capabilities"], { repos: null }));
  check("a share projection never contains feedback text", !sharedJson.includes("Request handlers with no tests") && !sharedJson.includes("Next step"));
}

const ZIP_FILES: Record<string, string> = {
  "app/worker.py": "def handle(event, store):\n    if store.already_processed(event.id):\n        return None\n    store.mark(event.id)\n    return event\n",
  "tests/test_worker.py": "def test_skips_duplicates():\n    assert True\n",
};

function zip(files: Record<string, string>): Uint8Array {
  const tree: Zippable = {};
  for (const [path, text] of Object.entries(files)) tree[`proj/${path}`] = strToU8(text);
  return zipSync(tree);
}

async function liveTest() {
  console.log("Live store (dev database)");
  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const { analyzeUpload } = await import("@/lib/passport/upload");
  const { saveProjectVersion, getOwnerPassport, createShare, resolveShare } = await import("@/lib/passport/store");
  const store = await import("@/lib/passport/presentation-store");
  const admin = createAdminSupabaseClient();
  const tag = randomUUID().slice(0, 8);
  const { data, error } = await admin.auth.admin.createUser({ email: `presentation+${tag}@example.com`, password: `T-${randomUUID()}`, email_confirm: true });
  if (error || !data.user) throw new Error("Could not create a test user.");
  const userId = data.user.id;
  const owner = { id: userId, displayName: "presentation-test" };
  const imagePathOf = async (projectKey: string): Promise<string> => {
    const { data: row } = await admin
      .from("passport_project_presentations")
      .select("image_path, passports!inner(owner_id)")
      .eq("passports.owner_id", userId)
      .eq("project_key", projectKey)
      .maybeSingle();
    return (row as { image_path: string | null } | null)?.image_path ?? "";
  };
  const input = (over: Record<string, unknown> = {}) => {
    const r = parsePresentationInput({ title: "Ledger sync", summary: "Keeps two ledgers in step.", ...over });
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };
  try {
    const requestId = `req-${randomUUID()}`;
    const first = await store.createManualProject(owner, input(), requestId, false);
    check("a manual project can be created with no passport yet", first.ok);
    const retry = await store.createManualProject(owner, input({ summary: "changed on retry" }), requestId, false);
    check("retrying the same request returns the first project", retry.ok && first.ok && retry.value.projectKey === first.value.projectKey && retry.reused === true);
    const dupe = await store.createManualProject(owner, input({ title: "ledger-sync" }), `req-${randomUUID()}`, false);
    check("a project with the same name is refused with a pointer to it", dupe.ok === false && dupe.status === 409 && !!dupe.duplicateOf);
    const dupeOk = await store.createManualProject(owner, input({ title: "Ledger Sync" }), `req-${randomUUID()}`, true);
    check("confirming it is different adds it", dupeOk.ok);

    const a = analyzeUpload(zip(ZIP_FILES), { ownerId: userId, name: "worker-service" });
    if (!a.ok) throw new Error("analysis failed");
    await saveProjectVersion(owner, null, a.result, "");
    const passport = await getOwnerPassport(userId);
    const repoKey = passport?.projects[0]?.repoFullName ?? "";
    const listed = await store.getPresentations(userId, passport?.projects ?? []);
    const draft = listed.find((p) => p.projectKey === repoKey);
    check("the analyzed project appears as an unconfirmed draft", !!draft && draft.confirmedAt === null && draft.version === 0);

    const saved = await store.savePresentation(userId, repoKey, input({ title: "Worker service", summary: "Engineer's own words." }), 0);
    check("saving the draft confirms it", saved.ok && saved.value.confirmedAt !== null && saved.value.fieldSources.title === "engineer");
    const stale = await store.savePresentation(userId, repoKey, input({ title: "Stale edit" }), 0);
    check("a save from an outdated copy is refused with the newer copy", stale.ok === false && stale.status === 409 && stale.current?.title === "Worker service");

    const changed = analyzeUpload(zip({ ...ZIP_FILES, "app/extra.py": "x = 1\n" }), { ownerId: userId, name: "worker-service" });
    if (!changed.ok) throw new Error("reanalysis failed");
    await saveProjectVersion(owner, null, changed.result, "");
    const after = await store.getPresentations(userId, (await getOwnerPassport(userId))?.projects ?? []);
    check("re-analysis keeps the engineer's text", after.find((p) => p.projectKey === repoKey)?.title === "Worker service");

    const unknown = await store.savePresentation(userId, "someone/else", input(), 0);
    check("a repository outside the work record cannot be presented", unknown.ok === false && unknown.status === 404);

    const keys = after.map((p) => p.projectKey);
    const tooMany = await store.arrangePresentations(userId, keys.map((k) => ({ projectKey: k, featured: true })).concat([1, 2].map((i) => ({ projectKey: `manual:${i}`, featured: true }))));
    check("featuring more than four is refused", tooMany.ok === false);
    const arranged = await store.arrangePresentations(userId, [...keys].reverse().map((k, i) => ({ projectKey: k, featured: i === 0 })));
    const reordered = await store.getPresentations(userId, (await getOwnerPassport(userId))?.projects ?? []);
    check("order and featured persist", arranged.ok && reordered[0].projectKey === [...keys].reverse()[0] && reordered[0].featured);

    console.log("Live project images");
    const shareableKey = dupeOk.ok ? dupeOk.value.projectKey : "";
    const privateKey = first.ok ? first.value.projectKey : "";
    const noAlt = await store.setPresentationImage(userId, repoKey, PNG, "  ");
    check("an image without a description is refused", noAlt.ok === false && noAlt.status === 400);
    const fake = await store.setPresentationImage(userId, repoKey, new TextEncoder().encode("<svg onload=alert(1)></svg>"), "x");
    check("a file that is not PNG, JPEG or WebP is refused", fake.ok === false && fake.status === 400);
    const big = new Uint8Array(2 * 1024 * 1024 + 1);
    big.set(PNG);
    const tooBig = await store.setPresentationImage(userId, repoKey, big, "x");
    check("an image over 2 MB is refused", tooBig.ok === false && tooBig.status === 400);
    const unknownImg = await store.setPresentationImage(userId, `manual:${randomUUID()}`, PNG, "x");
    check("an image cannot be attached to a project outside the profile", unknownImg.ok === false && unknownImg.status === 404);
    const versionBefore = reordered.find((p) => p.projectKey === repoKey)?.version;
    const repoImg = await store.setPresentationImage(userId, repoKey, PNG, "Worker queue diagram");
    check("an image with a description is stored", repoImg.ok && repoImg.value.image?.alt === "Worker queue diagram");
    check("the owner gets a signed URL that serves the image", repoImg.ok && !!repoImg.value.image?.url && (await fetch(repoImg.value.image.url)).status === 200);
    check("adding an image does not change the text version", repoImg.ok && repoImg.value.version === versionBefore);
    const repoPath = await imagePathOf(repoKey);
    check("the file is stored under the owner's id", repoPath.startsWith(`${userId}/`), repoPath);
    const firstShared = await store.setPresentationImage(userId, shareableKey, PNG, "Ledger sync screenshot");
    const firstSharedPath = await imagePathOf(shareableKey);
    await store.setPresentationImage(userId, shareableKey, PNG, "Ledger sync screenshot");
    const sharedPath = await imagePathOf(shareableKey);
    check("replacing an image removes the old file", firstShared.ok && sharedPath !== firstSharedPath && (await admin.storage.from("project-images").download(firstSharedPath)).error !== null);
    const altChanged = await store.setPresentationImageAlt(userId, shareableKey, "Ledger sync reconciliation view");
    check("the description can be changed on its own", altChanged.ok && altChanged.value.image?.alt === "Ledger sync reconciliation view");
    check("an empty description is refused on change", (await store.setPresentationImageAlt(userId, shareableKey, "")).ok === false);
    await store.setPresentationImage(userId, privateKey, PNG, "Private ledger screenshot");
    const privatePath = await imagePathOf(privateKey);

    const manualKey = first.ok ? first.value.projectKey : "";
    const current = reordered.find((p) => p.projectKey === manualKey);
    await store.savePresentation(userId, manualKey, input({ title: "Ledger sync", visibility: "private" }), current?.version ?? 1);
    await store.savePresentation(userId, repoKey, input({ title: "Worker service", visibility: "private" }), (reordered.find((p) => p.projectKey === repoKey)?.version ?? 1));
    const share = await createShare(userId, "Test link", ["projects", "evidence"], { versionPolicy: "follow" });
    if ("error" in share) throw new Error(share.error);
    const resolved = await resolveShare(share.token);
    const shared = resolved.status === "ok" ? resolved.passport : null;
    check("the share resolves", !!shared);
    check("a private repository and its findings are not in the share", !!shared && shared.projects.length === 0);
    check("a private manual project is not in the share", !!shared && !(shared.presentations ?? []).some((p) => p.projectKey === manualKey));
    check("a shareable manual project is in the share", !!shared && (shared.presentations ?? []).some((p) => p.title === "Ledger Sync"));
    check("the resolved share carries no image URL or storage path", !!shared && !JSON.stringify(shared).includes(userId + "/") && (shared.presentations ?? []).every((p) => !p.image?.url));

    console.log("Live share assembly");
    const profiles = await import("@/lib/profile/store");
    const statement = `I test the failure paths first (${tag}).`;
    await profiles.updateHowIBuild(userId, "presentation-test", { text: statement, includeInShares: false });
    const pub = await profiles.getPublicProfile(share.token);
    const pubJson = JSON.stringify(pub);
    const pubPresentations = pub.status === "ok" ? pub.public.passport.presentations ?? [] : [];
    const sharedImgUrl = pubPresentations.find((p) => p.projectKey === shareableKey)?.image?.url ?? "";
    check("the shareable project's image is signed for the share", sharedImgUrl.startsWith("https://") && (await fetch(sharedImgUrl)).status === 200);
    check("a private manual project's image is not in the shared profile", !pubJson.includes(privatePath) && !pubJson.includes("Private ledger screenshot"));
    check("a private repository's image is not in the shared profile", !pubJson.includes(repoPath) && !pubJson.includes("Worker queue diagram"));
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    check("the image bucket does not serve files publicly", (await fetch(`${base}/storage/v1/object/public/project-images/${privatePath}`)).status !== 200);
    check("How I build is left out of the share while not included", pub.status === "ok" && pub.public.profile.howIBuild === null && !pubJson.includes(statement));
    const ownerProfile = await profiles.getProfile(userId);
    check("the owner still sees it, marked private", ownerProfile?.howIBuild?.text === statement && ownerProfile.howIBuild.includeInShares === false);
    const preview = await profiles.getSharePreview(userId, ["projects", "evidence"], { versionPolicy: "follow" });
    const previewJson = JSON.stringify(preview);
    check("the recipient preview leaves out the statement and private images", !previewJson.includes(statement) && !previewJson.includes(privatePath) && !previewJson.includes("Private ledger screenshot"));
    await profiles.updateHowIBuild(userId, "presentation-test", { text: statement, includeInShares: true });
    const pub2 = await profiles.getPublicProfile(share.token);
    check("once included, the statement appears in the share", pub2.status === "ok" && pub2.public.profile.howIBuild?.text === statement);
    const cleared = await profiles.updateHowIBuild(userId, "presentation-test", { text: "", includeInShares: true });
    const { data: clearedRow } = await admin.from("engineer_profiles").select("how_i_build_shared").eq("owner_id", userId).maybeSingle();
    check("clearing the statement also stops sharing it", cleared.howIBuild === null && (clearedRow as { how_i_build_shared: boolean } | null)?.how_i_build_shared === false);

    const removedImg = await store.removePresentationImage(userId, repoKey);
    check("an image can be removed and its file deleted", removedImg.ok && removedImg.value.image === null && (await admin.storage.from("project-images").download(repoPath)).error !== null);

    const removed = await store.deleteManualProject(userId, manualKey);
    check("a manual project can be removed", removed);
    check("removing a manual project deletes its image file", (await admin.storage.from("project-images").download(privatePath)).error !== null);
    check("an analyzed repository cannot be removed through this path", !(await store.deleteManualProject(userId, repoKey)));
  } finally {
    const { data: imgRows } = await admin.from("passport_project_presentations").select("image_path, passports!inner(owner_id)").eq("passports.owner_id", userId);
    const leftover = ((imgRows ?? []) as { image_path: string | null }[]).map((r) => r.image_path).filter((p): p is string => !!p);
    if (leftover.length) await admin.storage.from("project-images").remove(leftover);
    const { data: pp } = await admin.from("passports").select("id").eq("owner_id", userId).maybeSingle();
    if (pp) await admin.from("passports").delete().eq("id", (pp as { id: string }).id);
    await admin.from("engineer_profiles").delete().eq("owner_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

async function main() {
  unitTests();
  if (process.argv.includes("--live")) await liveTest();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

void main();
