# Fydell Desktop — Release Pipeline

How the Tauri desktop app ships to candidates: GitHub Actions builds signed
(or unsigned) native installers on every version tag and attaches them to a
draft GitHub Release. The founder reviews the draft, publishes it, and the
`/download` page + in-app updater pick the artifacts up.

Status: pipeline is **configured but not yet live-tested**. The first `v*`
tag push is the first real validation (see "What CI will prove" below).

## How it works

- Workflow: `.github/workflows/release-desktop.yml`
- Trigger: `git tag vX.Y.Z && git push origin vX.Y.Z`
- Matrix (all from one tag push):
  - `windows-latest` → NSIS `Fydell_<ver>_x64-setup.exe` + `Fydell_<ver>_x64_en-US.msi`
  - `macos-latest` → `Fydell_<ver>_aarch64.dmg` (Apple Silicon)
  - `ubuntu-latest` → `Fydell_<ver>_amd64.AppImage` + `Fydell_<ver>_amd64.deb`
- The action (`tauri-apps/tauri-action@v2`) creates a **draft** GitHub Release
  named after the tag and uploads every installer plus updater artifacts
  (`latest.json`, `.sig` files when the updater private key is configured).
- Artifact versions come from `version` in `desktop/src-tauri/tauri.conf.json`,
  **not** from the tag name. Keep the tag and the config version in sync.

## Cutting a release (exact commands)

```bash
cd ~/workspace/fydell-mvp          # or C:\Users\Maahi\fydell-mvp on Windows

# 1. Make sure the three version fields agree (currently 0.1.0):
#      desktop/src-tauri/tauri.conf.json  -> "version"
#      desktop/package.json              -> "version"
#      desktop/src-tauri/Cargo.toml      -> "version"

# 2. Commit everything, push the branch, then tag from a clean tree:
git status --short            # must be clean
git tag v0.1.0
git push origin v0.1.0        # <-- this starts the builds

# 3. Watch Actions tab -> "Release Desktop" -> three platform jobs.
# 4. Open the draft release, sanity-check the assets, then Publish.
# 5. Verify https://github.com/MaahirPatel/fydell-mvp/releases/latest shows it.
```

Releasing a fix: bump the three version fields, commit, `git tag v0.1.1`,
`git push origin v0.1.1`. Never re-push the same tag after publishing —
create a new patch version instead.

## Unsigned vs signed builds

The workflow builds **unsigned** artifacts when signing secrets are absent —
this is intentional and fine for internal testing. Installers will show the
usual OS warnings ("unknown publisher", macOS Gatekeeper block). When the
secrets below are present, the same workflow signs + notarizes automatically.
No workflow change is needed to go from unsigned to signed.

## Founder-action checklist: signing

Do these once, in this order. Nothing here can be done by an agent — each
step needs the founder's Apple Developer account, certificate purchases, or
hardware-backed keys.

### A. Updater keypair (enables in-app updates)

1. On any machine with the Tauri CLI:
   `npm run tauri signer generate -- -w ~/.tauri/fydell.key`
   (prompts for a key password — store it in a password manager).
2. Copy the **public** key it prints into
   `desktop/src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
   (currently `""`). Commit that change.
3. GitHub repo → Settings → Secrets and variables → Actions → add:
   - `TAURI_SIGNING_PRIVATE_KEY` — the full private key text
     (or the path form; text is simplest for CI)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password from step 1
4. From the next tagged release on, builds emit `.sig` files and a populated
   `latest.json`, and shipped clients can verify updates.

> Losing this private key means already-installed apps can never accept a
> future update signed with a new key. Back it up offline.

### B. macOS code signing + notarization

Prereq: Apple Developer Program membership ($99/yr).

1. Apple Developer portal → Certificates → **+** → "Developer ID Application"
   (create a CSR first via Keychain Access → Certificate Assistant).
2. Download the `.cer`, double-click to install into Keychain.
3. Keychain Access → select the "Developer ID Application: …" identity →
   Export → save as `.p12` with a strong password.
4. `base64 -i <file>.p12 | pbcopy` (macOS) and add repo secrets:
   - `APPLE_CERTIFICATE` — the base64 text
   - `APPLE_CERTIFICATE_PASSWORD` — the `.p12` password from step 3
   - `APPLE_SIGNING_IDENTITY` — e.g. `Developer ID Application: Jane Doe (AB12CD34EF)`
     (find exact string via `security find-identity -v -p codesigning`)
5. Notarization credentials (Apple ID used for the Developer account):
   - `APPLE_ID` — the Apple ID email
   - `APPLE_PASSWORD` — an **app-specific password** (appleid.apple.com →
     Sign-In and Security → App-Specific Passwords), not the account password
   - `APPLE_TEAM_ID` — from developer.apple.com → Membership details

### C. Windows code signing

1. Buy a code-signing certificate from a public CA (DigiCert, Sectigo,
   SSL.com). **EV** skips SmartScreen reputation warm-up; **OV** works but
   Windows will warn until the binary builds reputation.
2. Export as `.pfx`/`.p12` with a password. (EV certs often live on a USB
   token or cloud HSM — for CI you need a provider that supports automated
   signing, e.g. SSL.com eSigner or DigiCert KeyLocker; pure token-based EV
   cannot sign in GitHub Actions.)
3. Add repo secrets:
   - `WINDOWS_CERTIFICATE` — base64 of the `.pfx`/`.p12`
   - `WINDOWS_CERTIFICATE_PASSWORD` — its password

## Updater endpoint convention

`desktop/src-tauri/tauri.conf.json` → `plugins.updater`:

```json
"updater": {
  "active": true,
  "dialog": true,
  "endpoints": [
    "https://github.com/MaahirPatel/fydell-mvp/releases/latest/download/latest.json"
  ],
  "pubkey": ""
}
```

- The endpoint is static: every release's `latest.json` is uploaded to the
  same `…/releases/latest/download/latest.json` URL by `tauri-action`
  (`uploadUpdaterJson` defaults to true). The app fetches it, compares
  `version` against its own, and installs from the per-platform URL inside.
- The updater plugin is **not registered** in v0.1.3. v0.1.0–v0.1.2
  registered it with no `plugins.updater` block, and plugin init failed at
  launch, so the installed app exited before showing a window. Add
  `tauri-plugin-updater` back only together with the full config block above,
  a real `pubkey` (checklist step A) and the signing secrets. If the renderer ever needs to
  trigger checks, add `updater:allow-check` to `capabilities/main.json`
  (deliberately not granted now, per DESK-17's minimal renderer boundary).
- The JS updater API (`@tauri-apps/plugin-updater`) is not installed yet;
  one `npm install` line when the app team wires an in-app update control.

## `/download` page — URL convention

The `/download` page itself is owned by the design track — this section is
only the contract it should code against.

- Durable "latest release" page (never breaks between versions):
  `https://github.com/MaahirPatel/fydell-mvp/releases/latest`
- Direct per-OS download links use the `…/releases/latest/download/<file>`
  pattern, but **asset filenames embed the version**, so they change every
  release. Default Tauri naming:
  - Windows (NSIS, recommended for candidates): `Fydell_<ver>_x64-setup.exe`
  - Windows (MSI alternative): `Fydell_<ver>_x64_en-US.msi`
  - macOS (Apple Silicon): `Fydell_<ver>_aarch64.dmg`
  - Linux: `Fydell_<ver>_amd64.AppImage` / `Fydell_<ver>_amd64.deb`
- Recommended page design: three OS cards (Windows / macOS / Linux) whose
  buttons point at the release page, OR per-version hardcoded asset URLs
  updated at release time. Do not guess asset URLs — copy them from the
  published release after the first tag proves the exact names.
- Until the first signed release exists, the page should carry an
  "early build — expect OS warnings" note rather than fake polish.

## What CI will prove (first live run)

Not yet verified without a real tag push:

1. `cargo` resolves the new `tauri-plugin-updater = "2"` dependency and
   refreshes `Cargo.lock` (this VM has no Rust toolchain, so the lockfile
   could not be pre-generated — harmless, CI updates it automatically).
2. `npm ci` + `vite build` succeed on all three runners from a clean tree.
3. NSIS/MSI bundling on `windows-latest`, DMG on `macos-latest`
   (`--target aarch64-apple-darwin`), AppImage/deb on `ubuntu-latest`
   (webkit2gtk 4.1 deps installed by the workflow).
4. `tauri-action` creates the draft release and uploads `latest.json`.
5. Plugin config is only deserialized at app runtime, so a missing or
   invalid plugin block passes CI and crashes on launch. Launch the built
   installer on each OS before publishing.

The workflow file itself passes `actionlint` 1.7.7 with zero findings, and
all action versions/pins were taken from the official `tauri-action` README
and usage docs on 2026-09-28.

## Decisions log

- **Draft releases, not auto-publish.** A human reviews artifacts before
  candidates can download them. Reversible, no surprise bad builds.
- **macOS = Apple Silicon only** for now. Intel Macs (≈ a shrinking share)
  need a `universal-apple-darwin` build or Rosetta — follow-up, not v0.1.0.
- **Unsigned builds allowed.** Unblocks internal testing before the founder
  buys certs; signing is purely additive via secrets.
- **No automatic update check wired.** Plugin initialized; trigger policy is
  an app-team product decision (startup check vs manual button).
- **Updater JSON via GitHub Releases**, not a custom update server. Zero
  infra to run; matches the `latest/download` endpoint convention.
- **No `/download` page in this change.** Owned by the design track; this doc
  is the URL contract.
