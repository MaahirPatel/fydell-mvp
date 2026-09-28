# Fydell Design Spec — "Fydell Light" (v1.0)

Authoritative visual contract for the design-perfection program. Founder direction: **light mode, Stripe-like rich color, Linear-grade density, Figma-like expressiveness, animated visuals, visual-first**. Written 2026-09-28.

Research basis: stripe.com (metric proof strips, customer story cards with "products used" chips, structured solution sections, colorful gradient-mesh hero on warm white), linear.app (dark minimal product-UI-embedded marketing, hairline precision, monospace accents, extreme density, "purpose-built / powered by agents / designed for speed" triad), figma.com (playful color, canvas metaphor, community). Applied as principles, never copied.

Master-prompt rules that still bind: no invented logos/testimonials/stats/certs; visual story = projects, demonstrated work, reusable evidence; one interface typeface + one mono; teal=project evidence, violet=simulation evidence, amber=attention, red=failure.

## 1. Color system

Base tokens live in `src/styles/fydell-tokens.css` (canonical, `:root` light default). This spec EXTENDS, never contradicts.

- **Canvas**: warm ivory `#FAFAF8`-ish (`--surface-canvas`), warm-tinted bands alternate sections. Never pure pitch white expanses, never dark mode.
- **Accent fields**: Stripe-style tinted surfaces per meaning — teal (`--surface-observation`), violet (`--surface-intelligence`), amber (`--surface-uncertain`), coral (`--field-coral`), blue (`--field-blue`). Marketing may use broader, more saturated color fields and tasteful mesh/aurora backgrounds. App surfaces use tints at low saturation for chips/badges/illustration only.
- **Brand**: chain-mark logo (approved asset `public/brand/`), brand blue `#5662ff` primary action, ink `#17212B` text.
- **Text hierarchy by solid color**, never opacity. All pairs must clear WCAG AA (existing contract).
- **Still banned**: purple-blue AI cliché gradients, glassmorphism, decorative filler.

## 2. Typography

- Interface: Geist Sans (repo's intentional system — keep). Code: Geist Mono.
- Marketing hero 56–72px desktop / 36–44 mobile, tight tracking (-0.02em), `text-wrap: balance`.
- App: page 24–28px semibold; section 16–18px semibold; body 14px/1.5; meta 12–13px secondary-solid (never hiding essentials).
- Tabular numerals for counts/durations. Code snippets 13–14px.

## 3. Density & layout (Linear-grade)

- 4px base, 8px rhythm. Hairline borders only, max containment depth 2.
- App consoles: slim sidebar nav (icon+label, section eyebrows), dense content, Stripe-style tables (row hover, status pills, right-aligned meta), detail views with breadcrumb + key facts header.
- Marketing: alternating warm bands, generous whitespace BETWEEN sections but dense WITHIN proof components (metric strips, story cards, code snippets).
- Empty states are purposeful: illustration + one-line explanation + primary action. Never blank.

## 4. Motion

- Base rule (existing): 120–220ms state changes, `prefers-reduced-motion` kills it, 2px focus rings.
- NEW for marketing: scroll-triggered reveals (fade+rise 16px, staggered), animated hero product visual (live-typing simulation, evidence cards assembling, count-up metrics — only with REAL numbers), hover lift on cards, tabbed product stories with animated transitions. Lenis smooth scroll already present — keep.
- App surfaces: subtle only — row hover, skeleton shimmer, toast slide, modal fade/scale. No bouncy marketing motion inside consoles.
- Desktop: match web — view transitions, hover states, progress animations.

## 5. Component patterns

- **Buttons**: solid ink primary (white text), tinted secondary per accent, pill or 8px radius; every button works or doesn't render.
- **Status**: pill with dot — teal=verified/project, violet=simulation, amber=attention/expiring, red=failed, neutral=muted. Always icon+text, never color alone.
- **Evidence rows**: source icon, title, citation link, provenance tag, timestamp. Clickable → opens evidence.
- **Metric strip**: big tabular number + small label. ONLY real numbers (scenario count, real capabilities). No invented stats, ever.
- **Story cards** (marketing): real product screenshot/snippet + honest caption. No fake customer logos.
- **Code snippets**: dark code surface ok inside light pages (Stripe does this), real code only.

## 6. Per-surface direction

- **Marketing home**: animated hero (product visual: passport assembling from evidence), proof strip (real numbers), "how it works" 3-step with real UI snippets, simulation preview (real scenario), passport preview, desktop app showcase (real), download CTA, honest FAQ.
- **/download** (new): OS-detected primary button (Windows .msi / macOS .dmg / Linux .AppImage), links to `github.com/MaahirPatel/fydell-mvp/releases` with explicit "installers publish with v0.1.0" state; system requirements; auto-update note. No dead buttons.
- **Employers/developers/pricing**: Stripe-organized — tables, tier cards with real feature lists, code-first developer page.
- **Passport (flagship)**: light, dense; identity header with completeness (data-presence only, never a score); colorful evidence cards by type; timeline; share controls; cited evidence browser.
- **Candidate console**: Linear sidebar (Home, Simulations, Passport, Inbox); simulation detail = Cursor-like workspace hierarchy.
- **Employer console**: Stripe tables (candidates, invitations, reviews) + detail views with evidence.
- **Desktop app**: light theme mirroring web tokens; sidebar+Home/Inbox/Profile/Workspace with motion polish.

## 7. Honesty inventory (must hold)

Every surface audit must confirm: no lorem, no dead buttons, no invented testimonials/logos/stats/certs, simulated vs real clearly labeled, token-reissue tradeoff documented, offline states labeled.
