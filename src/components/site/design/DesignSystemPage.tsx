import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import s from "../site.module.css";
import d from "./design.module.css";
import { Lockup, Mark } from "../Mark";
import {
  ArrowLink,
  ButtonLink,
  Caption,
  CitationChip,
  Container,
  FeatureTrio,
  Frame,
  Pill,
  Section,
  SectionHead,
} from "../primitives";
import {
  ChecksGrid,
  ConsentChecklist,
  DecisionStack,
  DesktopWindow,
  IncidentRipple,
  PassportCard,
  ReportDoc,
  WorkTrail,
} from "../Illustrations";
import { HeroPrototype, ScrollPrototype } from "./MotionDemo";

const SURFACES: [string, string, string][] = [
  ["raised", "#ffffff", "#16181f"],
  ["canvas", "#fafbfc", "#0b0c10"],
  ["band", "#f4f6fa", "#101217"],
  ["panel", "#f0f2f7", "#13151b"],
  ["deep", "#e9ecf2", "#08090c"],
  ["hover", "#ebeef5", "#1c1f27"],
  ["selected", "#e4e8f3", "#232733"],
  ["code", "#10131c", "#0a0b0f"],
];

/* Measured with WCAG 2.2 relative luminance against every surface step. */
const TEXT: [string, string, string, string, string][] = [
  ["primary", "#0e1117", "15.4–18.9", "#f2f4f8", "13.5–18.1"],
  ["secondary", "#3a4150", "8.4–10.2", "#c1c6d1", "8.7–11.6"],
  ["tertiary", "#535b6b", "5.6–6.8", "#9aa1af", "5.7–7.7"],
  ["quaternary", "#5e6676", "4.7–5.8", "#8d94a2", "4.9–6.5"],
];

const RING: [string, string, string, string][] = [
  ["Blue", "#5b6cff", "#3f4fe6", "Primary and interactive: focus, selection, links on hover."],
  ["Red", "#ff5a6e", "#bd2340", "Requirement changes and failures. Nothing else."],
  ["Teal", "#2dd4bf", "#0a7064", "Passed and healthy."],
  ["Violet", "#a855f7", "#7b2fd1", "Only inside gradients and the mark."],
];

const TYPE: [string, string, CSSProperties, string][] = [
  ["Display", "64 / 1.05 · 510 · -0.022em", { fontSize: 64, lineHeight: 1.05, fontWeight: 510, letterSpacing: "-0.022em" }, "Hire engineers on the work itself"],
  ["Section title", "48 / 1.08 · 510 · -0.022em", { fontSize: 48, lineHeight: 1.08, fontWeight: 510, letterSpacing: "-0.022em" }, "Checked on the code they submitted"],
  ["Lead", "20 / 1.5 · 400 · tertiary", { fontSize: 20, lineHeight: 1.5, color: "var(--text-tertiary)" }, "One quiet supporting line under each headline."],
  ["Body", "15 / 1.6 · 400", { fontSize: 15, lineHeight: 1.6, color: "var(--text-tertiary)" }, "Files changed, commands run, test runs and timing."],
  ["Heading", "15 / 1.4 · 600", { fontSize: 15, lineHeight: 1.4, fontWeight: 600 }, "A disclosed work trail"],
  ["Nav", "13 · 510", { fontSize: 13, fontWeight: 510, color: "var(--text-tertiary)" }, "Product   Employers   Developers   Pricing"],
  ["Caption", "12 · 400 · quaternary", { fontSize: 12, color: "var(--text-quaternary)" }, "Example: the desktop app 31 minutes into the incident."],
  ["Mono", "Geist Mono 12", { fontFamily: "var(--font-geist-mono), monospace", fontSize: 12 }, "dispatcher.py:45–49  test_retry_after_503"],
];

const MOTION: [string, string, string, string, string, string, string][] = [
  ["Hero headline, lead, actions", "Page load", "opacity, translateY", "0 → 1, 14px → 0", "800ms", "60ms + 80ms × i", "ease"],
  ["Hero product image", "Page load", "opacity, translateY, scale", "0 → 1, 32px → 0, 0.985 → 1", "1200ms", "320ms", "ease"],
  ["Section title and lead", "15% into viewport, once", "opacity, translateY", "0 → 1, 14px → 0", "700ms", "90ms × i", "ease"],
  ["Product visual", "15% into viewport, once", "opacity, translateY, scale", "0 → 1, 24px → 0, 0.99 → 1", "900ms", "90ms × i", "ease"],
  ["Trail rows, check rows, findings", "Parent in viewport", "opacity, translateY", "0 → 1, 8px → 0", "600ms", "90ms × i", "ease"],
  ["Requirement update card", "Parent in viewport", "box-shadow", "none → red glow → hairline", "1800ms", "500ms + 90ms × i", "ease"],
  ["Check summary bar segments", "Parent in viewport", "scaleX", "0 → 1", "900ms", "300ms + 40ms × i", "ease"],
  ["Line illustrations", "Trio in viewport", "stroke-dashoffset", "1 → 0 (pathLength 1)", "1100ms", "150ms + 120ms × d", "ease"],
  ["Illustration fills", "Trio in viewport", "opacity", "0 → 1", "600ms", "700ms", "ease"],
  ["Selected decision", "Report in viewport", "box-shadow", "none → soft blue glow", "900ms", "700ms", "ease"],
  ["Loop step rule", "Steps in viewport", "width", "0 → 100%", "900ms", "200ms + 90ms × i", "ease"],
  ["Colour washes", "Always", "translate, scale", "±1.5%, 1 → 1.04", "18s alternate", "0", "ease"],
  ["Hover: links, buttons, nav", "Pointer", "color, background, opacity", "state → state", "120ms", "0", "ease"],
  ["UI state change", "Interaction", "any", "state → state", "200ms", "0", "ease"],
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={d.block}>
      <h3 className={d.blockTitle}>{title}</h3>
      {children}
    </div>
  );
}

function ThemePane({ dark }: { dark?: boolean }) {
  return (
    <div className={d.themePane} data-theme={dark ? "dark" : "light"}>
      <span className={d.themeLabel}>{dark ? "Dark" : "Light (default)"}</span>
      <div className={d.ladder}>
        {SURFACES.map(([name, l, dk]) => (
          <div
            key={name}
            className={d.swatch}
            style={{ background: `var(--surface-${name})`, color: name === "code" ? "#c1c6d1" : undefined }}
          >
            <b style={name === "code" ? { color: "#f2f4f8" } : undefined}>{name}</b>
            <code>{dark ? dk : l}</code>
          </div>
        ))}
      </div>
      <div>
        {TEXT.map(([name, l, lr, dk, dr]) => (
          <div key={name} className={d.textRow}>
            <span style={{ color: `var(--text-${name})`, fontWeight: 510 }}>text-{name}</span>
            <code>{dark ? dk : l}</code>
            <span className={d.meta}>{dark ? dr : lr} : 1</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      <section className={s.hero}>
        <div className={s.heroWash} aria-hidden />
        <Container>
          <div className={s.heroCopy}>
            <Lockup size={22} />
            <h1 className={`${s.display} ${s.displayPage}`}>The Fydell visual system</h1>
            <p className={s.lead}>
              Light by default, with depth from tonal surfaces rather than borders, and colour that enters as light. Every
              token here maps to a CSS custom property in src/styles/fydell-tokens.css.
            </p>
            <nav className={d.toc} aria-label="On this page">
              <a href="#rationale">Rationale</a>
              <a href="#tokens">Tokens</a>
              <a href="#components">Components</a>
              <a href="#motion">Motion</a>
              <Link href="/design/app">Product app comps</Link>
            </nav>
          </div>
        </Container>
      </section>

      <Section id="rationale">
        <SectionHead title="Depth without dark mode" stacked />
        <div className={`${d.prose} ${s.headToVisual}`}>
          <p>
            <strong>Shading carries structure.</strong> The page sits on a cool near-white canvas. Seven surface steps,
            from pure white for raised cards down to a soft blue-grey for wells, each at least a couple of percent of
            luminance from its neighbour, separate regions the way a lit object separates from its shadow. Borders appear
            only where two same-tone surfaces meet and structure needs a line, and then as 1px hairlines at 6–17% ink.
          </p>
          <p>
            <strong>Elevation is soft and cool.</strong> Shadows are layered at low opacity and tinted toward the blue of
            the ink, so a raised frame reads as lifted rather than outlined. The product frame gets the deepest shadow on
            the page and a hairline of the ring gradient along its top edge.
          </p>
          <p>
            <strong>Colour enters as light, never as paint.</strong> The ring palette appears as large, very soft washes
            behind the hero, the main product image and the closing call to action; as faint tinted bands (lavender, rose)
            that give the page rhythm; and as one glow per feature tile. Solid colour is reserved for meaning inside the
            product: blue for interaction, red for requirement changes and failures, teal for passing. Violet appears only
            inside gradients and the mark. The gradient itself is used once per page on text, and on the single Submit
            control.
          </p>
          <p>
            <strong>Why the product imagery is light.</strong> A dark editor would be the heaviest object on every page
            and would fight the washes for attention. A light app theme keeps the product continuous with the page, and it
            lets the few meaningful colours (the red requirement update, teal passes, the blue selection) do the talking.
            Code keeps its own slightly deeper editor surface so it still reads as code.
          </p>
          <p>
            <strong>Text is solid, never faded.</strong> Four text steps, each measured against every surface, all clear
            WCAG AA. Hierarchy comes from these steps, weight (400, 510, 600) and size, never from opacity.
          </p>
        </div>
      </Section>

      <Section id="tokens">
        <SectionHead title="Tokens" lead="Light and dark share every name. Only values move, so components never branch on theme." />
        <Block title="Surfaces and text (contrast is the range across all surface steps)">
          <div className={d.themes}>
            <ThemePane />
            <ThemePane dark />
          </div>
        </Block>
        <Block title="Ring palette: the only accent colours. -ink variants are text-safe.">
          <div className={d.ring}>
            {RING.map(([name, c, ink, use]) => (
              <div key={name} className={d.ringChip}>
                <i style={{ background: c }} />
                <b>
                  --fy-{name.toLowerCase()} <code className={d.meta}>{c}</code>
                </b>
                <span>
                  <span style={{ color: ink, fontWeight: 510 }}>ink {ink}</span> · {use}
                </span>
              </div>
            ))}
          </div>
        </Block>
        <Block title="--fy-gradient: 90deg teal → blue → violet → red">
          <div className={d.gradientBar} />
        </Block>
        <Block title="Borders">
          <div className={d.row}>
            {["subtle", "default", "strong"].map((b) => (
              <div key={b} className={d.shadowTile} style={{ width: 180, boxShadow: `inset 0 0 0 1px var(--border-${b})` }}>
                --border-{b}
              </div>
            ))}
          </div>
        </Block>
        <Block title="Shadows">
          <div className={d.tiles}>
            {["xs", "sm", "md", "lg", "frame"].map((sh) => (
              <div key={sh} className={d.shadowTile} style={{ boxShadow: `var(--shadow-${sh})` }}>
                --shadow-{sh}
              </div>
            ))}
          </div>
        </Block>
        <Block title="Radii">
          <div className={d.row}>
            {[6, 8, 12, 16].map((r) => (
              <div key={r} className={d.shadowTile} style={{ width: 120, height: 80, borderRadius: r, boxShadow: "var(--shadow-sm), 0 0 0 1px var(--border-subtle)" }}>
                {r}px
              </div>
            ))}
          </div>
        </Block>
        <Block title="Spacing: 8px base grid">
          <div className={d.row} style={{ alignItems: "flex-end" }}>
            {[4, 8, 12, 16, 24, 32, 48, 64, 72, 96, 144, 168].map((n) => (
              <div key={n} style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                <div style={{ width: 16, height: n, borderRadius: 3, background: "var(--fy-blue-soft)", boxShadow: "inset 0 0 0 1px rgba(91,108,255,0.3)" }} />
                <span className={d.meta}>{n}</span>
              </div>
            ))}
          </div>
        </Block>
        <Block title="Type: Geist Sans and Geist Mono, weights 400 / 510 / 600">
          <div className={d.scale}>
            {TYPE.map(([name, spec, style, sample]) => (
              <div key={name} className={d.scaleRow}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 510 }}>{name}</div>
                  <div className={d.meta}>{spec}</div>
                </div>
                <p className={d.specimen} style={{ ...style, fontSize: `min(${style.fontSize}px, 9vw)` }}>
                  {sample}
                </p>
              </div>
            ))}
          </div>
        </Block>
      </Section>

      <Section id="components">
        <SectionHead title="Components" lead="Every public page is assembled from these. The nav and footer on this page are the live components." />
        <Block title="Mark and lockup">
          <div className={d.row} style={{ gap: 32 }}>
            <Mark size={40} title="fydell mark" />
            <Mark size={20} />
            <Lockup size={28} />
            <Lockup size={18} />
          </div>
        </Block>
        <Block title="Buttons">
          <div className={d.row}>
            <ButtonLink href="#components">Primary</ButtonLink>
            <ButtonLink href="#components" variant="secondary">
              Secondary
            </ButtonLink>
            <ButtonLink href="#components" variant="ghost">
              Ghost
            </ButtonLink>
            <ButtonLink href="#components" variant="gradient">
              Submit
            </ButtonLink>
            <ButtonLink href="#components" size="sm">
              Small
            </ButtonLink>
            <ArrowLink href="#components">Link with arrow</ArrowLink>
          </div>
        </Block>
        <Block title="Status pills and citation chips">
          <div className={d.row}>
            <Pill tone="passed">Passed</Pill>
            <Pill tone="failed">Failed</Pill>
            <Pill tone="changed">Requirement changed</Pill>
            <Pill tone="blue">In progress</Pill>
            <Pill>Invited</Pill>
            <CitationChip kind="file">dispatcher.py:45–49</CitationChip>
            <CitationChip kind="test">test_400_is_not_retried</CitationChip>
            <CitationChip kind="test" failed>
              test_retry_after_503
            </CitationChip>
            <CitationChip kind="message">Thread 12:04</CitationChip>
          </div>
        </Block>
        <Block title="Section head">
          <SectionHead title="Checked on the code they submitted" lead="Title left, lead right, bottom-aligned. No eyebrow, no coloured words." />
        </Block>
        <Block title="Feature trio with glow tiles: the eight line illustrations">
          <FeatureTrio
            items={[
              { title: "Incident ripple", body: "Red.", art: <IncidentRipple />, glow: "red" },
              { title: "Work-trail timeline", body: "Teal.", art: <WorkTrail />, glow: "teal" },
              { title: "Decision stack", body: "Blue.", art: <DecisionStack />, glow: "blue" },
            ]}
          />
          <div style={{ height: 24 }} />
          <FeatureTrio
            items={[
              { title: "Consent checklist", body: "Teal.", art: <ConsentChecklist />, glow: "teal" },
              { title: "Checks grid", body: "Violet.", art: <ChecksGrid />, glow: "violet" },
              { title: "Report", body: "Blue.", art: <ReportDoc />, glow: "blue" },
            ]}
          />
          <div style={{ height: 24 }} />
          <FeatureTrio
            items={[
              { title: "Desktop window", body: "Blue.", art: <DesktopWindow />, glow: "blue" },
              { title: "Passport", body: "Violet.", art: <PassportCard />, glow: "violet" },
              { title: "Glow tile", body: "One hue per tile, never two.", art: <Mark size={32} />, glow: "teal" },
            ]}
          />
        </Block>
        <Block title="Product frame and caption">
          <Frame label="An empty product frame" title="Window title" right={<span className={s.body} style={{ fontSize: 12 }}>right slot</span>}>
            <div style={{ height: 160, background: "var(--surface-editor)" }} />
          </Frame>
          <Caption>every product visual carries a caption that begins with Example.</Caption>
        </Block>
        <Block title="Form inputs and empty state">
          <div className={s.grid2}>
            <div style={{ display: "grid", gap: 16 }}>
              <label className={s.label}>
                Work email
                <input className={s.input} placeholder="you@company.com" />
              </label>
              <label className={s.label}>
                GitHub profile
                <input className={s.input} defaultValue="github.com/your-handle" />
              </label>
            </div>
            <div className={s.empty}>
              <strong className={s.h3}>No candidates yet</strong>
              <p className={s.body}>Candidates appear here after you invite them to a role.</p>
              <ButtonLink href="#components" size="sm" variant="secondary">
                Invite a candidate
              </ButtonLink>
            </div>
          </div>
        </Block>
        <Block title="Plan cards, pricing table, footer">
          <p className={s.body}>
            Live on <Link href="/pricing" style={{ textDecoration: "underline" }}>/pricing</Link>; the footer closes this page.
          </p>
        </Block>
      </Section>

      <Section id="motion">
        <SectionHead
          title="Motion"
          lead="One easing, cubic-bezier(0.16, 1, 0.3, 1). Things arrive once, in reading order. With reduced motion everything is visible and still."
        />
        <Block title="Spec">
          <div className={s.tableWrap}>
            <table className={d.spec}>
              <thead>
                <tr>
                  {["Element", "Trigger", "Property", "From → to", "Duration", "Delay", "Easing"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOTION.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, n) => (
                      <td key={n}>{n === 6 ? <code>cubic-bezier(0.16, 1, 0.3, 1)</code> : c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
        <Block title="Prototype: home hero">
          <HeroPrototype />
        </Block>
        <Block title="Prototype: one scroll section">
          <ScrollPrototype />
        </Block>
      </Section>
      <div style={{ height: 168 }} />
    </>
  );
}
