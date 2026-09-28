# GitHub intake scope (GH-01 / GH-02 / GH-06 / GH-07)

## Supported intake

Passport import starts with **explicitly selected public repositories**.
The intake endpoint (`POST /api/passport/github`) states this in every
response via `INTAKE_SCOPE`:

- `scope: "public"`, `repositories: "public-only"`
- `privateRepositories: "unavailable"`

Private repositories remain unavailable until scoped authorization, privacy
and provider controls are verified (GH-12, deferred). A repository that
resolves as private is refused with a `private_repository` error before any
file is fetched.

## Authorization vs authorship (GH-02)

Connecting or naming an account proves nothing about authorship:

- Forks are labelled: every extraction result carries a fork notice and each
  finding's `attribution` is `"unverified"`.
- Contribution statements are candidate-written and stored separately from
  extracted findings; they never become findings.
- Role suggestions derived from a fork carry the gap "Whether both sides
  were built by the candidate is not verified."

## Never execute imported code (GH-06)

Extraction reads code as data. No package scripts, notebooks, build tools,
or repository instructions are run. There is intentionally no execution
primitive anywhere under `src/lib/passport` (no `child_process`, `eval`,
`Function(`, `vm`, or `exec*`).

## Hostile input (GH-07)

Repository content is untrusted data:

- Instructions embedded in READMEs or code are ignored: findings come only
  from structural detectors, and the summarisation prompt explicitly forbids
  following instructions found in the evidence.
- Fetch destinations are restricted to `api.github.com` and
  `raw.githubusercontent.com`; redirects are refused and pagination never
  follows links off the API host.
- Likely secrets are redacted from excerpts before they are stored,
  displayed, or sent to a model (`src/lib/passport/github/redact.ts`).
  Filenames that look like credentials (`.env`, `*.pem`, `id_rsa*`, …) are
  skipped entirely at selection time.
