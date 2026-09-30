"use client";

import { useState, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import s from "../site.module.css";
import d from "./design.module.css";
import HeroWorkspace from "../visuals/HeroWorkspace";
import { CitedReport, WorkTrailPanel } from "../visuals/panels";
import { FeatureTrio, Stage } from "../primitives";
import { DecisionStack, IncidentRipple, WorkTrail } from "../Illustrations";
import Reveal from "../Reveal";

const i = (n: number) => ({ "--i": n }) as CSSProperties;

/** Remounts its content on Replay so every entrance plays again. */
function Replayable({ children }: { children: React.ReactNode }) {
  const [run, setRun] = useState(0);
  return (
    <div className={d.demo}>
      <button type="button" className={`${s.btn} ${s.btnSecondary} ${s.btnSm} ${d.replay}`} onClick={() => setRun((n) => n + 1)}>
        <RotateCcw size={13} strokeWidth={1.75} aria-hidden /> Replay
      </button>
      <div key={run}>{children}</div>
    </div>
  );
}

export function HeroPrototype() {
  return (
    <Replayable>
      <div className={s.heroWash} aria-hidden style={{ inset: 0 }} />
      <div className={s.heroCopy}>
        <p className={s.display} data-hero="" style={{ ...i(0), fontSize: "clamp(36px, 5vw, 56px)" }}>
          Hire engineers on the work itself
        </p>
        <p className={s.lead} data-hero="" style={i(1)}>
          Headline, lead and actions rise 14px with a fade, 80ms apart. The product image rises 32px and settles from
          scale 0.985 over 1200ms.
        </p>
        <div className={s.actions} data-hero="" style={i(2)}>
          <span className={`${s.btn} ${s.btnPrimary}`}>Start hiring</span>
          <span className={`${s.btn} ${s.btnSecondary}`}>Build your passport</span>
        </div>
      </div>
      <Reveal className={s.heroVisual} style={{ marginTop: 48 }}>
        <div data-hero-visual="">
          <Stage>
            <HeroWorkspace />
          </Stage>
        </div>
      </Reveal>
    </Replayable>
  );
}

export function ScrollPrototype() {
  return (
    <Replayable>
      <div style={{ display: "grid", gap: 48, paddingBottom: 48 }}>
        <FeatureTrio
          items={[
            { title: "Strokes draw in", body: "Paths draw over 1100ms, 120ms apart.", art: <IncidentRipple />, glow: "red" },
            { title: "Rows stagger", body: "Trail rows rise 8px, 90ms apart.", art: <WorkTrail />, glow: "teal" },
            { title: "Decision glows", body: "The selected decision settles into a soft blue glow.", art: <DecisionStack />, glow: "blue" },
          ]}
        />
        <Reveal className={s.grid2}>
          <div data-r="visual" style={i(0)}>
            <WorkTrailPanel />
          </div>
          <div data-r="visual" style={i(1)}>
            <CitedReport />
          </div>
        </Reveal>
      </div>
    </Replayable>
  );
}
