/**
 * Desktop experience explainer (DEMO-07).
 *
 * The interactive web preview must make clear what is SIMULATED in the
 * browser and what REQUIRES INSTALLATION of the desktop app. The desktop
 * download must name supported systems and installation needs.
 *
 * Per DESK-01 (architecture decision): only Linux distribution is claimed
 * (installers: .deb / .rpm / .AppImage). macOS/Windows are explicitly NOT
 * offered - additional OS support waits for its own tested distribution
 * path (DESK-03).
 */

export type CapabilityKind = "simulated" | "requires_install";

export interface DesktopCapability {
  id: string;
  label: string;
  kind: CapabilityKind;
  /** One-line explanation shown in the preview. */
  detail: string;
}

export const DESKTOP_CAPABILITIES: readonly DesktopCapability[] = [
  {
    id: "workspace-layout",
    label: "Workspace layout preview",
    kind: "simulated",
    detail: "A clickable mock of the file tree, editor and panels. Nothing here edits real files.",
  },
  {
    id: "sample-test-output",
    label: "Sample test output",
    kind: "simulated",
    detail: "Example output so you can see the results panel. Real runs happen in the installed app.",
  },
  {
    id: "briefing-tour",
    label: "Briefing and teammate tour",
    kind: "simulated",
    detail: "Walk through the brief and teammate updates with fictional content.",
  },
  {
    id: "local-execution",
    label: "Running your code and tests",
    kind: "requires_install",
    detail: "Code runs locally in the installed app against a pinned snapshot.",
  },
  {
    id: "offline-drafts",
    label: "Offline drafts and sync",
    kind: "requires_install",
    detail: "Durable local drafts with remote sync need the installed app's local storage.",
  },
  {
    id: "credential-storage",
    label: "OS-protected sign-in",
    kind: "requires_install",
    detail: "Sign-in tokens are kept in OS-protected storage, only available in the installed app.",
  },
];

export interface SupportedPlatform {
  os: "linux";
  status: "supported";
  /** Installer formats actually shipped. */
  formats: readonly [".deb", ".rpm", ".AppImage"];
  installNotes: string;
}

export const DESKTOP_PLATFORMS: readonly SupportedPlatform[] = [
  {
    os: "linux",
    status: "supported",
    formats: [".deb", ".rpm", ".AppImage"],
    installNotes:
      "Download the package for your distribution, install with your system package manager (or run the AppImage), then open your assignment from the app. No developer tooling required.",
  },
];

export const UNSUPPORTED_PLATFORM_NOTE =
  "macOS and Windows builds are not offered yet. Additional OS support waits for its own tested distribution path.";

/**
 * Every capability in the preview must be labeled simulated vs
 * requires_install - an unlabeled capability is a DEMO-07 failure.
 */
export function validatePreviewLabels(caps: readonly DesktopCapability[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const c of caps) {
    if (seen.has(c.id)) errors.push(`Duplicate capability "${c.id}"`);
    seen.add(c.id);
    if (c.kind !== "simulated" && c.kind !== "requires_install") {
      errors.push(`Capability "${c.id}" is not labeled simulated vs requires_install`);
    }
    if (!c.detail) errors.push(`Capability "${c.id}" has no explanatory detail`);
  }
  const kinds = new Set(caps.map((c) => c.kind));
  if (!kinds.has("simulated")) errors.push("Preview shows no simulated capabilities");
  if (!kinds.has("requires_install")) errors.push("Preview shows no requires_install capabilities");
  return errors;
}
