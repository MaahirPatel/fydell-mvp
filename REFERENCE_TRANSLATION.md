# Reference translation — public marketing site

What was borrowed from the supplied references, how it was translated into Fydell, and what was deliberately rejected. Written after the build, describing what actually shipped.

## Reference register

| ID | Image | Role |
|---|---|---|
| `POS-HERO-01` | Competitor homepage hero, centred two-line headline over a layered product composition | Positive reference for hero composition and type hierarchy |
| `POS-HERO-02` | Duplicate of `POS-HERO-01` | No additional authority |
| `POS-FEATURE-01` | Feature section, dominant product visual left, narrow copy column right | Positive reference for feature-section composition |
| `POS-FEATURE-02` | Feature section, narrow copy column left, dominant product visual right | Positive reference for alternation |
| `CURRENT-01` | Fydell "Work simulation" label rendering near-invisible | Current-state defect to correct |
| `CURRENT-02` | Fydell "Verified work evidence for hiring" label rendering near-invisible | Current-state defect to correct |

### Authority

No image governs every category. Colour, imagery, and content were taken from Fydell's own token system and the Northline fixture, never from a reference.

| Reference | Typography | Grid / pacing | Product framing | Colour | Content | Imagery |
|---|---|---|---|---|---|---|
| `POS-HERO-01` | Primary | Primary | Supporting | None | None | None |
| `POS-FEATURE-01/02` | Supporting | Primary | Supporting | None | None | None |
| `CURRENT-01/02` | Negative | None | None | Negative | None | None |

## Extraction and translation

| Observation | Principle | Fydell translation | Rejected |
|---|---|---|---|
| Hero is a centred two-line headline with a short measure | A decisive, short headline reads as confidence | `See the work before / you make the hire.` at 42–76px, weight 530, tracking −0.045em, 760px measure, break authored rather than left to the browser | The reference's wording, product category, and exact metrics |
| Exactly two hero actions | A third action dilutes the first | `Create your workspace →` and `See the evaluation →`, nothing else | Download/pricing actions that do not exist here |
| A large product composition sits directly below the hero | The product is the proof of the claim | A layered composition of the employer evidence report with the candidate's `production_runs.csv` panel floating over it | Editor chrome, terminals, agent panels, scenic artwork |
| Feature sections alternate a narrow copy column against a dominant visual | Alternation creates editorial rhythm without new components | Four alternating splits at 4/12 copy against 8/12 visual | The reference's feature claims |
| Product visuals carry dense, legible interface detail | Specific detail is what makes a claim credible | Every panel renders from `src/lib/fixtures/northline` — the same synthetic scenario the product ships | Illegible miniature UI or generated text |
| Motion is restrained | Calm interaction reads as considered | Hover and focus only, 150ms, on the existing easing token | Scroll-jacking, pinning, card stacking, marquees, entrance choreography |

## Colour

The brief asked for "red blue purple gradients" while also banning purple gradients as the previous redesign's failure. Resolved by putting colour in the product rather than on the page:

- `--fydell-evidence` `#6b8cff` — cited rows, active claim rail, citation markers, full access
- `--fydell-risk` `#f26b82` — the L2 Day loss row, limitations, where a claim stops
- `--fydell-verified` `#b07fd0` — evidence-checked state, follow-up question
- `--fydell-changed` `#e9b949` — changed information
- `--fydell-good` `#67d9a0` — genuinely completed states

Each appears only where it carries that meaning. The Fydell mark keeps its own teal-blue-magenta-purple gradient; nothing else on the page uses a gradient. There is no background wash, no gradient text, and no glow.

## Removed

- **Every eyebrow, sitewide.** `CURRENT-01` and `CURRENT-02` are eyebrows rendering at tertiary contrast above their headings. They were deleted from the homepage, `/product`, `/trust`, `/simulations`, `/request-pilot`, `PageIntro`, and `ClosingCTA`, and the `.section-eyebrow` class was removed. The one on `/simulations` carried real metadata (`Data Analyst · 20 minutes`), so it moved below the title instead of being deleted.
- The third floating panel in the hero. Two layers read as depth; three read as decoration, and the third was covering evidence text.
- `src/components/marketing/home/HeroEvidenceScene` from the homepage. It still serves `/signup`.

## What was not done

- **The navigation still promotes "Request a pilot" while the hero promotes "Create your workspace."** These are two different funnels. Which one is primary is a go-to-market decision, not a design one, so it was left alone and flagged.
- The candidate workbench panel in the hero is hidden below 1024px. At tablet width the base report already stacks to a single column and a floating panel over it would cover content.
- `/pricing`, `/security`, `/privacy`, `/terms`, and the `/pilot` flow were not touched.
