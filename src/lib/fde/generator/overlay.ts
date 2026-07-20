/**
 * Apply a compiled employer blueprint onto the proven Project Relay runtime.
 *
 * Material consequence: different blueprints produce different CSV rows,
 * inbox threads, and briefs — not just markdown stickers. Columns are remapped
 * to the names Relay Python loaders expect so tests/evals still run.
 *
 * Hidden root-cause / answer keys are never written into the FileMap.
 */
import type { FileMap } from "@/lib/relay/execution-provider";
import type { InboxThread, SimulationBlueprint } from "./types";

export const OVERLAY_VERSION = "blueprint-overlay-v2";

export type OverlayResult = {
  files: FileMap;
  durationMinutes: number;
  curveballKey: string | null;
  curveballNarrative: string | null;
  companyName: string;
  templateLabel: string;
  usedValidatedTemplate: boolean;
  blueprintId: string;
  materialDiffSignature: string;
};

function remapCsvHeader(csv: string, renames: Record<string, string>): string {
  const lines = csv.replace(/\r\n/g, "\n").split("\n");
  if (lines.length === 0) return csv;
  const header = lines[0].split(",").map((h) => renames[h.trim()] || h.trim());
  return [header.join(","), ...lines.slice(1)].join("\n").replace(/\n+$/, "\n");
}

function inboxToRelayJson(thread: InboxThread): string {
  // Relay inbox-seed expects author + timestamp fields.
  const payload = {
    channel: `#${thread.channel.replace(/^#/, "")}`,
    participants: thread.participants.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
    })),
    messages: thread.messages.map((m) => {
      const author =
        thread.participants.find((p) => p.id === m.authorId)?.name || m.authorId;
      const base = new Date("2026-07-13T14:00:00.000Z").getTime();
      const at = new Date(base + m.timestampOffsetMinutes * 60_000).toISOString();
      return {
        id: m.id,
        author: m.authorId,
        authorName: author,
        timestamp: at,
        text: m.text,
      };
    }),
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

function buildCustomerBrief(blueprint: SimulationBlueprint): string {
  const w = blueprint.world;
  const episodes = blueprint.episodes
    .map((e, i) => `${i + 1}. ${e.title} (~${e.estimatedMinutes} min)`)
    .join("\n");

  return `# ${blueprint.intake.title}

## Client
**${w.companyName}** — ${w.industry}

## Ask (verbatim)
> ${w.ask}

## Your role
Forward Deployed Engineer embedded with the customer. There is no complete
spec. Clarify before you build. Verify before you ship.

## Employer objective
${blueprint.intake.objective}

${blueprint.intake.customerContext?.trim() ? `## Additional context\n${blueprint.intake.customerContext.trim()}\n` : ""}
## Suggested work episodes
${episodes || "1. Frame the problem\n2. Investigate evidence\n3. Verify and communicate"}

## Constraints
- Duration target: **${blueprint.durationMinutes} minutes**
- AI use: allowed and observed — verify any assistant output against the data
- Do not invent customer facts; work from the artifacts in this workspace

## Data files
- \`data/shipments.csv\` — system-of-record export
- \`data/carriers.csv\` — partner self-reported reliability
- \`data/delays_manual_tracking.csv\` — hand-kept delay log (ID formats may disagree)

## Measurement note
This attempt runs on Fydell's validated FDE work-sample runtime with your
organization's role configuration and generated world data overlaid. Evidence
is scored from observable actions only — not personality inference.
`;
}

function buildSlackThreadOverlay(blueprint: SimulationBlueprint): string {
  const a = blueprint.world.stakeholderA;
  const b = blueprint.world.stakeholderB;
  const lines = [
    `# Client thread — ${blueprint.world.companyName}`,
    "",
    `Channel: #${blueprint.world.inboxThread.channel || "fde-engagement"}`,
    "",
    `**${a.name}** (${a.role}): wants ${a.goal}`,
    "",
    `**${b.name}** (${b.role}): wants ${b.goal}`,
    "",
    "These stakeholders have not reconciled their asks with each other.",
    "Managing that conflict is part of the job.",
    "",
    "### Thread",
    "",
  ];
  for (const msg of blueprint.world.inboxThread.messages.slice(0, 12)) {
    const author =
      blueprint.world.inboxThread.participants.find((p) => p.id === msg.authorId)?.name ||
      msg.authorId;
    lines.push(`**${author}** (+${msg.timestampOffsetMinutes}m): ${msg.text}`);
    lines.push("");
  }
  return lines.join("\n");
}

function buildDataIntegrityNote(blueprint: SimulationBlueprint): string {
  return `# Data integrity notes — ${blueprint.world.companyName}

The manual delay-tracking sheet was kept by hand. ID formats are **not**
guaranteed to match the system-of-record export. A naive exact-match join will
silently drop mismatched rows.

Quirk in this session: \`${blueprint.world.dataQuirk}\`.

Partner on-time rates in \`carriers.csv\` are self-reported and may not
reconcile with shipment outcomes. Verify before you ship a number.

This note is candidate-visible. Hidden evaluator answer keys are not included.
`;
}

function materialSignature(blueprint: SimulationBlueprint): string {
  const w = blueprint.world;
  const primaryHead = w.tables.primaryRecords.split("\n").slice(0, 3).join("|");
  const partnerHead = w.tables.partners.split("\n").slice(0, 2).join("|");
  const delayHead = w.tables.manualTracking.split("\n").slice(0, 2).join("|");
  return [w.companyName, w.ask, w.dataQuirk, primaryHead, partnerHead, delayHead].join("::");
}

/**
 * Merge blueprint-visible content into a clone of the Relay FileMap.
 * Always returns a new object; never mutates `baseFiles`.
 */
export function applyBlueprintOverlay(
  baseFiles: FileMap,
  blueprint: SimulationBlueprint | null
): OverlayResult {
  const files: FileMap = { ...baseFiles };

  if (!blueprint) {
    return {
      files,
      durationMinutes: 55,
      curveballKey: null,
      curveballNarrative: null,
      companyName: "Client",
      templateLabel: "Validated FDE pilot template",
      usedValidatedTemplate: true,
      blueprintId: "project-relay@known-good",
      materialDiffSignature: "known-good",
    };
  }

  const w = blueprint.world;

  // Material data — remap to Relay loader column names so Python still runs.
  files["data/shipments.csv"] = remapCsvHeader(w.tables.primaryRecords, {
    record_id: "shipment_id",
    partner_id: "carrier_id",
  });
  files["data/carriers.csv"] = remapCsvHeader(w.tables.partners, {
    partner_id: "carrier_id",
  });
  files["data/delays_manual_tracking.csv"] = remapCsvHeader(w.tables.manualTracking, {
    record_id: "shipment_id",
    notes: "ops_notes",
  });

  // Also keep generator-named copies for employer preview / audit.
  files["data/primary_records.csv"] = w.tables.primaryRecords;
  files["data/partners.csv"] = w.tables.partners;
  files["data/manual_tracking.csv"] = w.tables.manualTracking;

  files["docs/customer-brief.md"] = buildCustomerBrief(blueprint);
  files["docs/slack-thread.md"] = buildSlackThreadOverlay(blueprint);
  files["docs/data-integrity.md"] = buildDataIntegrityNote(blueprint);
  files["data/inbox_thread.json"] = inboxToRelayJson(w.inboxThread);

  const existingReadme = files["README.md"] || "";
  const banner = [
    `# ${blueprint.intake.title}`,
    "",
    `Client: **${w.companyName}** (${w.industry})`,
    "",
    `> ${w.ask}`,
    "",
    `Configured duration: ${blueprint.durationMinutes} minutes.`,
    `World seed data is overlaid onto the validated FDE runtime (overlay ${OVERLAY_VERSION}).`,
    "",
    "---",
    "",
  ].join("\n");
  if (!existingReadme.includes(`Client: **${w.companyName}**`)) {
    files["README.md"] = banner + existingReadme.replace(/^# .*\n/, "");
  }

  // Candidate-safe canonical facts (no hidden answer keys).
  files["canonical.json"] = JSON.stringify(
    {
      templateId: "project-relay",
      version: blueprint.version,
      label: `${w.companyName} — ${blueprint.intake.title}`,
      durationMinutes: blueprint.durationMinutes,
      curveballs: blueprint.curveballs.map((c) => c.key),
      canonicalFacts: w.canonicalFacts,
      companyName: w.companyName,
      blueprintId: blueprint.blueprintId,
    },
    null,
    2
  ) + "\n";

  const primaryCurveball = blueprint.curveballs[0] || null;

  return {
    files,
    durationMinutes: blueprint.durationMinutes || 55,
    curveballKey: primaryCurveball?.key || null,
    curveballNarrative: primaryCurveball?.narrative || null,
    companyName: w.companyName,
    templateLabel: `Validated FDE template · ${w.companyName}`,
    usedValidatedTemplate: true,
    blueprintId: blueprint.blueprintId,
    materialDiffSignature: materialSignature(blueprint),
  };
}
