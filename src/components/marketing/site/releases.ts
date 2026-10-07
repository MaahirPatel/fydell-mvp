/**
 * Published desktop releases, newest first, as they appear on
 * github.com/MaahirPatel/fydell-mvp/releases (built by
 * .github/workflows/release-desktop.yml from the v* tags). Dates are the
 * GitHub publish dates in UTC. Notes restate each tagged commit in plain
 * language; nothing here describes unreleased work.
 */

export const RELEASES_URL = "https://github.com/MaahirPatel/fydell-mvp/releases";

export type Release = {
  version: string;
  date: string;
  title: string;
  notes: readonly string[];
};

export const RELEASES: readonly Release[] = [
  {
    version: "0.1.5",
    date: "2026-09-30",
    title: "A lighter look that matches the website",
    notes: ["New warm off-white theme with dark text and black primary buttons, matching fydell.com."],
  },
  {
    version: "0.1.4",
    date: "2026-09-29",
    title: "Connected to fydell.com",
    notes: [
      "Release builds connect to fydell.com and fetch their public configuration from it.",
      "Sign-in completes in your browser and hands back to the app, for engineer and employer accounts.",
      "Opening a Fydell link while the app is running focuses the open window instead of starting a second copy.",
    ],
  },
  {
    version: "0.1.3",
    date: "2026-09-29",
    title: "Launch fixes",
    notes: [
      "Fixed a crash on launch caused by the update component, which is turned off in these builds.",
      "The Windows console window no longer appears behind the app.",
      "Installers use the Fydell icon.",
    ],
  },
  {
    version: "0.1.2",
    date: "2026-09-29",
    title: "Onboarding and a denser workspace",
    notes: [
      "First-run onboarding: a guided welcome, profile basics and an introduction to simulations. Every step can be skipped.",
      "Workspace: status bar, command palette (Ctrl or Cmd + K), Ctrl + S to save, a collapsible file tree and a problems view built from test output.",
      "An Analysis panel with a static-analysis prototype over the workspace files.",
      "Submissions now include message counts and reply times for each simulated teammate.",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-09-28",
    title: "Blank window fix",
    notes: ["Fixed a blank window on launch in packaged builds."],
  },
  {
    version: "0.1.0",
    date: "2026-09-28",
    title: "First desktop installers",
    notes: [
      "First published installers for macOS (Apple silicon), Windows (64-bit) and Linux (64-bit).",
      "Unsigned test builds. Automatic updates are turned off; install new versions from the download page.",
    ],
  },
];

export const LATEST = RELEASES[0];

export type DesktopOs = "macos" | "windows" | "linux";

export type DesktopBuild = { label: string; file: string; note: string };

const asset = (file: string) => `${RELEASES_URL}/download/v${LATEST.version}/${file}`;

/** Only builds attached to the latest release. There is no Intel macOS or ARM Windows/Linux build. */
export const BUILDS: Record<DesktopOs, { name: string; arch: string; primary: DesktopBuild; others: readonly DesktopBuild[]; unavailable: string }> = {
  macos: {
    name: "macOS",
    arch: "Apple silicon (M1 or later)",
    primary: { label: "Download for macOS", file: asset(`Fydell_${LATEST.version}_aarch64.dmg`), note: ".dmg disk image" },
    others: [{ label: "App archive", file: asset(`Fydell_${LATEST.version}_aarch64.app.tar.gz`), note: ".app.tar.gz" }],
    unavailable: "No build for Intel Macs yet. Use Fydell in the browser.",
  },
  windows: {
    name: "Windows",
    arch: "64-bit (x64)",
    primary: { label: "Download for Windows", file: asset(`Fydell_${LATEST.version}_x64-setup.exe`), note: ".exe installer" },
    others: [{ label: "MSI package", file: asset(`Fydell_${LATEST.version}_x64_en-US.msi`), note: ".msi, for managed installs" }],
    unavailable: "No build for Windows on ARM yet. Use Fydell in the browser.",
  },
  linux: {
    name: "Linux",
    arch: "64-bit (x86_64)",
    primary: { label: "Download AppImage", file: asset(`Fydell_${LATEST.version}_amd64.AppImage`), note: ".AppImage, runs on most distributions" },
    others: [
      { label: "Debian package", file: asset(`Fydell_${LATEST.version}_amd64.deb`), note: ".deb, for Ubuntu and Debian" },
      { label: "RPM package", file: asset(`Fydell-${LATEST.version}-1.x86_64.rpm`), note: ".rpm, for Fedora and RHEL" },
    ],
    unavailable: "No ARM build yet. Use Fydell in the browser.",
  },
};

export function formatReleaseDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
