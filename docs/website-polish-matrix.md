# Fydell website polish — pattern-to-implementation matrix

Inspected 2026-10-04/05 via live browser (visual only, no sign-in, no CTA clicks).
Screenshots: Linear hero attached to task handoff; x.ai and Cursor heroes viewed
from the task's snapshot directory.

Constraint: light mode, existing Kit grammar, no landing rebuild, no copied branding.

## 1. Linear.app (dark, near-black)

Observed:
- Hero: "The product development system for teams and agents" ~64-72px, medium
  weight (not bold), tight tracking, white. Signature two-tone headlines: white
  lead clause, gray tail. Mono micro eyebrows ("FIG 0.1/0.2/0.3").
- Hero visual: one large straight-on product screenshot (issue detail view) in a
  macOS-chrome window, soft radial violet/indigo glow behind the headline, subtle
  grain. Ultra-dense real product UI at full fidelity, no perspective tilt.
- Sections: logo cloud, three-column pillars split by 1px hairlines with isometric
  wireframe illustrations, alternating text+visual, hairline dividers not cards.

Fydell mapping (adapt to light):
- CARRY: two-tone headline rhythm (Fydell already does this with the teal tail);
  mono eyebrows (already present); FIG-style figure numbering on product shots;
  full-density product UI at straight-on angle (Fydell's shots already do this);
  soft radial glow behind the hero product window (strengthen Fydell's Stage glow).
- REJECT: dark theme, violet/indigo glow colors, Linear's exact copy structures.

## 2. x.ai (light, white, minimal)

Observed:
- Hero: "Frontier AI models for everything you imagine." ~56-64px medium black,
  centered; final word rotates (imagine/search/reason/build) with a hand-drawn
  orange underline. Announcement pill above. Black pill CTA + light-gray pill CTA.
- Pure white, flat, generous whitespace. One idea per screen. Bento grid of
  product cards (Chat / Build / Bot) below the fold; "By the numbers" stat band.
- Premium touch: the hand-drawn underline flourish softening the rigid grid.

Fydell mapping:
- CARRY: one strong claim per band (already the pattern); generous whitespace
  between sections; a stat band could strengthen the pricing/trust pages later.
- REJECT: rotating-word gimmick, hand-drawn underline (too playful for Fydell's
  engineering-register voice), copying xAI's voice.

## 3. Cursor.com (light cream, editorial)

Observed:
- Hero deliberately modest: "Cursor is your coding agent for building ambitious
  software." ~40-48px regular/medium, tight leading, left-aligned. No subhead;
  straight to CTAs. Warm cream (#F7F4EE) flat background.
- Product visuals: light-UI app windows with macOS traffic lights, layered with
  overlap and soft shadows, set against classical painting backdrops (Monet-style
  landscapes, white gallery mat). Medium density. Logo wall: 8 logos each in its
  own bordered rounded rectangle, monochrome.
- Two-tone headlines (black lead / gray tail). Orange (#FF5C00) reserved for links.
- Premium touch: the gallery conceit — IDE windows over museum-grade paintings,
  sections feel like magazine spreads.

Fydell mapping:
- CARRY: Fydell ALREADY uses the gallery conceit (painted lake/coast/hills grounds
  behind product windows). Strengthen it: richer painted grounds, a gallery-mat
  frame feel, soft shadows. Keep light UI windows, straight-on, no tilt.
- CARRY: two-tone headline rhythm (consistent with Linear too).
- REJECT: reducing hero type to Cursor's modest size (founder rejected bigger/
  fatter text churn; keep Fydell's 60px hero, refine don't resize); cream
  background (Fydell has its own warm canvas); orange accent.

## 4. Figma Top 50 Websites collection (Attio, Notion, Fiberplane, Bento)

Inspected 2026-10-05 via live browser (visual only, no sign-in). Written briefs
delivered; screenshot files not extractable from the task session.

Observed:
- Attio: announcement pill + massive centered 2-line headline + dual CTAs (black
  pill + outline pill) + product UI peeking below the fold. Monochrome; color
  only inside product UI. Logo wall, 4-card grid, alternating text/visual bands.
- Notion: headline with tiny inline icons ON the words; B&W hand-drawn
  illustration of collaborators in hero (not a UI screenshot); color only in the
  tiny icons. Airy, confident, charming.
- Fiberplane: massive SERIF headline with one keyword in a blue/purple rounded
  highlight; floating avatar pins; orange-to-purple gradient band. Editorial.
- Bento: blunt 2-line value-prop headline; gradient CTA; floating widget cards;
  a COMPLETE realistic sample profile in a bordered card below the hero.

Fydell mapping:
- CARRY: Attio's hero pattern (Fydell already does pill + centered headline +
  dual CTA + product UI; keep). Bento's "show a real sample" (Fydell's
  EvaluationShot already shows a fully-populated artifact; keep it realistic).
- REJECT: Notion's inline-icon headline (gimmicky for Fydell's register);
  Fiberplane's serif + gradient (wrong voice); copying any brand's exact
  composition, colors, or illustrations.

## Implementation rules

- Small batches, one page or one component at a time.
- Screenshot before/after at 1440px and 390px via the static-export pipeline.
- Reuse Kit components and tokens; extend tokens only with existing values.
- Copy changes only where factually required:
  (a) EvaluationShot candidate names -> generic "Candidate 01" style labels
      (no fabricated individual engineer profiles on the landing page);
  (b) employers page FigChecks "isolated sandbox" claim -> honest framing
      matching the standing trust-labeling rule (candidate-submitted evidence);
  (c) Shots.tsx team-thread names (Alex Morgan, Jordan Hayes) -> generic
      "Engineering lead" / "Partner support" labels (same no-fabricated-names
      rule applied to the product-page incident visuals).
- No commit until founder review.

## Implemented 2026-10-05 (evening)

- Stage glow strengthened (kit.module.css `.stage::before`): larger, slightly
  more present warm radial glow behind hero product windows, adapted from
  Linear's restrained-glow pattern to Fydell's light theme. No color copied.
- FIG-style figure numbering: `Stage` accepts optional `fig` prop, rendered in
  mono uppercase in the caption (`.figNum`). Homepage hero now shows "Fig 01".
  Adapted from Linear's "FIG 0.1" micro-eyebrow pattern.
- Extended FIG numbering to `Visual` component; product page visuals numbered
  Fig 02 through Fig 07 in sequence; employers page visuals numbered Fig 08
  and Fig 09.
