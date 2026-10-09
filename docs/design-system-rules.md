# Fydell design system rules

Rules for turning Figma designs (or any new UI) into code in this repo. Read this before adding a page, a marketing section, or a shared component.

## 1. Stack and styling approach

- Next.js 16 App Router, React 19, TypeScript strict (no `any`).
- Tailwind v4 (`@import "tailwindcss"` in `src/app/globals.css`) for product UI, with arbitrary values that point at tokens: `bg-[var(--surface-raised)]`, never raw palette classes like `bg-zinc-100`.
- CSS Modules for marketing and dense visuals: `src/components/marketing/**/*.module.css`. One module per component family.
- `cn()` from `src/lib/cn.ts` is a plain class join. It does not merge Tailwind conflicts, so do not rely on a passed `className` overriding a base class.

## 2. Tokens (single source of truth)

All design values live in `src/styles/fydell-tokens.css`. `globals.css` imports it and must not redeclare its tokens. If a value is missing, add a token there. Do not hardcode hex in components.

| Group | Tokens | Use |
| --- | --- | --- |
| Surfaces | `--surface-canvas`, `--surface-raised`, `--surface-panel`, `--surface-hover`, `--surface-selected`, `--surface-deep` | Page < card < selected. |
| Borders | `--border-subtle`, `--border-default`, `--border-strong` | Hairlines only. |
| Text | `--text-primary`, `--text-body`, `--text-secondary`, `--text-tertiary` | Secondary and tertiary pass 4.5:1 on canvas. `--text-quaternary` and `--text-disabled` are for non-essential text only. |
| Accent | `--accent`, `--accent-hover`, `--accent-ink`, `--accent-soft`, `--accent-line` | Links, selection, focus. Indigo from the logo. |
| Solid control | `--control-solid`, `--control-solid-ink` | The one primary button per screen. |
| Status | `--status-{positive,neutral,attention}-{bg,ink,line}`, `--badge-*-{bg,ink}` | Tags and badges: tinted fill, strong ink, no border. |
| Evidence | `--ev-observed-*`, `--ev-generated-*`, `--ev-attention-*` | Observed (teal) vs inferred (violet) claims. Never swap them. |
| Brand fields | `--field-{teal,blue,violet,coral,warm}`, `--ink-*` | Small chips and highlights. |
| Section tints | `--tint-{teal,blue,violet,warm}` | Soft colored backgrounds behind marketing product visuals. Equal lightness so a row reads evenly. |
| Radii | `--radius-tag` 4, `--radius-control` 6, `--radius-panel` 10, `--radius-frame` 14 | |
| Spacing | `--space-1`..`--space-12` (4px base, 8px rhythm) | |
| Shadows | `--shadow-1`..`--shadow-4`, `--shadow-card`, `--shadow-float` | Light, never colored glows. |
| Motion | `--ease`, `--motion-fast` 140ms, `--motion-panel` 190ms | State changes 120 to 220ms. |

`.theme-ink` re-points the same names for dark contexts, so components written against the semantic tokens work in both.

## 3. Typography

- Sans: Inter (`--font-inter`, set on `<body>` in `src/app/layout.tsx`). Mono: Geist Mono (`--font-mono`) for code, file paths and commands.
- Two weights on marketing: 400 and 500. No 700 headings.
- Marketing scale (see `src/components/marketing/site/home.module.css`): H1 64/1.04, tracking `-0.032em`; H2 44/1.1, tracking `-0.028em`; lead 19/1.55; body 15/1.55. Steps down at 1023px and 639px.
- Two-tone headings: the statement in `--text-primary`, then a quieter clause in `--text-tertiary` inside the same `<h2>`.
- Product UI uses the fixed `--type-app-*` scale.

## 4. Components

Shared UI is in `src/components/ui/`. Keep APIs backward compatible.

```tsx
import { Button, ButtonLink } from "@/components/ui/Button";
// variant: "primary" | "secondary" | "soft" | "quiet" | "destructive" | "accent"
// size: "sm" | "md" | "cta" | "lg"; shape: "rect" | "pill"
<ButtonLink href="/signup" variant="primary" size="cta" shape="pill">Sign up free</ButtonLink>
```

- `Panel`, `PanelSection`, `PanelLabel` (`Panel.tsx`), `Surface` with `tone: "panel" | "raised" | "outline" | "paper"`.
- `StatusTag` with `tone: "neutral" | "active" | "changed" | "risk" | "good"`.
- `Field`, `Input`, `Textarea`, `Select`, `PasswordInput`, `FormError` (`Field.tsx`): every input has a visible label.
- `Tabs`, `Dialog`, `Sheet`, `Toast`, `Table`, `Skeleton`, `EmptyState`.

Marketing building blocks (`src/components/marketing/site/`):

- `Home.tsx`: `CenteredHero`, `ShowcaseSection` (two-tone heading top, visual below, optional "more" link), `Tiles`, `CenteredClosing`.
- `ProductFrame.tsx`: the window frame around a product visual. Requires a `label` that describes the visual for screen readers; it appends "Example data".
- `PaintedStage.tsx`: painted backdrop behind a framed product.
- `EvidenceGrid.tsx`: 2x2 cards, sentence on top, product detail on a `--tint-*` field below.
- Site buttons in marketing pages use `.l-btn l-btn-solid` and `.l-btn l-btn-quiet` from `globals.css`.

## 5. Icons

- `lucide-react` only, imported per icon: `import { Check } from "lucide-react"`.
- 14 to 16px in dense UI, `aria-hidden` when decorative, with text beside it. Icon-only buttons need `aria-label`.
- Small custom SVGs (arrows in `Home.tsx`, OS logos in `OsIcons.tsx`) use `currentColor`. No emoji as icons.

## 6. Layout patterns

- Default section: heading and one short clause on top, product visual below in a frame (Linear and Attio). Split layout (text left, visual right) only when the visual is narrow.
- Container: `max-width: 1200px` plus gutters (`.container` in `home.module.css`). Sections are separated by 144px of space, not by rules.
- Colored grounds: painted stages for hero-scale visuals; `--tint-*` fields for smaller feature cards. One tint per card, never gradients over text.
- Responsive down to 375px: grids collapse to one column at 860px; dense rows stack at 479px.

## 7. Content rules

- No eyebrow labels (small uppercase kicker above a heading). No colored side borders (`border-left` accents). No em dashes in UI copy (`npm run test:copy` checks retired terms and dashes).
- Example product data is labelled "Example data" and uses synthetic names: "Candidate 01", "Applicant 02". No real people, logos, testimonials, quotes, prices or metrics that are not real.
- Never claim Fydell scores, ranks, recommends, verifies authorship, detects all cheating or predicts performance. The hiring team decides.
- Say "simulation template", not "role model".
- Copy is short and concrete. One idea per sentence.

## 8. Accessibility and motion

- Text contrast 4.5:1 minimum. Focus is always visible: `outline: 2px solid var(--accent)` with 2 to 3px offset, or `.fydell-focusable`.
- Every link and button goes to a real route under `src/app`.
- Reveal animations (`RevealObserver`, `data-reveal`) and the hero entrance are CSS only and disabled under `prefers-reduced-motion` (global rule at the end of `fydell-tokens.css`).

## 9. Patterns from the top 50

Studied from the Figma community file "TOP 50 WEBSITES" (`fK98SFK24rhgixHt3PO1LP`), frames attio.com (`1:6263`), clickup.com (`1:5680`), cal.com (`3:7268`) and raycast.com (`1:33096`). The file has no Linear, Cursor, Stripe or Vercel frames. What Fydell takes, adapted rather than copied:

- **Hero:** small pill announcement, a two-line headline of 56 to 72px at weight 500 to 600 with tight tracking, one sentence of lead, two CTAs (solid dark, quiet), then a large framed product view directly under the CTAs. Every site in the set leads with a product view, not an illustration.
- **Section head:** left-aligned. A two-line heading of 40 to 48px, then one or two lines of grey supporting text. Attio puts a small icon before it; Fydell uses the two-tone heading instead.
- **Feature card:** one bordered card per section. Attio's version has a row of 3 or 4 short steps across the top (bold name, two lines of grey copy), and the product UI cropped by the card's bottom edge. Fydell: `TintStage` plus a `StepRow`.
- **Bento grid:** 2x2 or 1+2 cards. Each opens with a bold lead-in sentence that runs into grey body text, and the UI crop sits at the bottom of the card. Fydell: `EvidenceGrid`.
- **Colored section cards (ClickUp):** each feature area sits in its own large rounded card (20 to 24px radius) on a pastel tint, with the copy and visual split side by side and a "Get started" link at the bottom. Fydell uses the `--tint-*` tokens, one hue per area: teal for projects and findings, blue for simulations, violet for hiring, warm for decisions.
- **Numbered capability cards (cal.com):** a grid of cards numbered 01 to 06, with the screenshot on top and the title and description below. Fydell uses this for the product index.
- **Rhythm:** sections are about 120 to 160px apart, and cards about 16 to 24px apart. The content column is about 1200px wide.
- **Closing:** a full-width colored band with a two-line question or statement and two CTAs, then a footer with four or five link columns plus a CTA column.
- **What Fydell does not take:** customer logo strips, testimonials, star ratings and "loved by" walls, because Fydell has no real ones to show. It also skips dark gradient hero worlds (Raycast), because Fydell is light mode.

## 10. Figma to code checklist

1. Map Figma colors to the nearest token in section 2. If none fits, add a token, do not inline the hex.
2. Map text styles to the scale in section 3; drop any weight above 500 on marketing.
3. Reuse a component from section 4 before creating one. New marketing sections go in `src/components/marketing/site/` with a CSS module.
4. Replace Figma placeholder content with Fydell example data, labelled as example.
5. Check 1440px, 768px and 375px, keyboard focus, and `npm run test:copy`, `npx tsc --noEmit -p .`, `npx eslint <files>`.
