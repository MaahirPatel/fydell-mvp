import type { ReactNode } from "react";
import f from "./figs.module.css";

/*
 * Line illustrations for feature rows. Structure is drawn in currentColor;
 * Fydell blue and red carry the one element each figure is about. Motion is
 * defined in figs.module.css and starts when the figure scrolls into view.
 */

const BLUE = "#5b5bd6";
const RED = "#ff5a6e";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 260 200" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" className={f.svg}>
      <defs>
        <linearGradient id="fyRingL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a19d92" />
          <stop offset="1" stopColor="#8b8be6" />
        </linearGradient>
        <linearGradient id="fyRingR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e5484d" />
          <stop offset="1" stopColor="#b4323a" />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

/** The Fydell rings, drawn at (cx, cy) with ring radius r. */
function Rings({ cx, cy, r, className }: { cx: number; cy: number; r: number; className?: string }) {
  const w = r * 0.42;
  return (
    <g className={className}>
      <circle cx={cx - r * 0.68} cy={cy} r={r} stroke="url(#fyRingL)" strokeWidth={w} />
      <circle cx={cx + r * 0.68} cy={cy} r={r} stroke="url(#fyRingR)" strokeWidth={w} />
    </g>
  );
}

/** An incident: rings spreading from one failing point. */
export function FigIncident() {
  return (
    <Svg>
      <path d="M40 100h180M130 12v176" opacity="0.3" strokeDasharray="2 5" />
      {[84, 64, 44].map((r, i) => (
        <circle key={r} cx="130" cy="100" r={r} opacity={0.45 + i * 0.2} />
      ))}
      <circle cx="130" cy="100" r="24" stroke={RED} className={f.pulse} />
      <circle cx="130" cy="100" r="24" stroke={RED} className={`${f.pulse} ${f.pulseLate}`} />
      <circle cx="130" cy="100" r="7" fill={RED} stroke="none" className={f.core} />
    </Svg>
  );
}

/** The work trail: steps on a line, one of them the requirement change. */
export function FigTrail() {
  const ys = [28, 64, 100, 136, 172];
  const widths = [88, 64, 96, 56, 76];
  return (
    <Svg>
      <path d="M92 28v144" opacity="0.55" />
      <path d="M92 28v144" stroke={BLUE} strokeWidth={1.5} className={f.grow} pathLength={1} />
      {ys.map((y, i) => {
        const tone = i === 2 ? RED : i === 4 ? BLUE : undefined;
        return (
          <g key={y} className={f.step} style={{ animationDelay: `${200 + i * 180}ms` }}>
            <circle cx="92" cy={y} r="5.5" fill={tone ?? "#08090a"} stroke={tone ?? "currentColor"} />
            <path d={`M110 ${y}h${widths[i]}`} stroke={tone ?? "currentColor"} opacity={tone ? 1 : 0.7} />
          </g>
        );
      })}
    </Svg>
  );
}

/** A decision: three options, one chosen, signed off with the Fydell mark. */
export function FigDecide() {
  return (
    <Svg>
      {[40, 90, 140].map((y, i) => (
        <g key={y} className={f.step} style={{ animationDelay: `${150 + i * 160}ms` }}>
          <rect x="48" y={y} width="164" height="32" rx="7" stroke={i === 0 ? BLUE : "currentColor"} opacity={i === 0 ? 1 : 0.6} className={i === 0 ? f.chosen : undefined} />
          <circle cx="68" cy={y + 16} r="5.5" stroke={i === 0 ? BLUE : "currentColor"} opacity={i === 0 ? 1 : 0.7} />
          {i === 0 ? <circle cx="68" cy={y + 16} r="2.5" fill={BLUE} stroke="none" className={f.core} /> : null}
          <path d={`M84 ${y + 16}h${[80, 52, 64][i]}`} opacity={i === 0 ? 1 : 0.6} />
        </g>
      ))}
      <Rings cx={192} cy={56} r={6} className={f.step} />
    </Svg>
  );
}

/** Consent: the disclosed list, checked before the work begins. */
export function FigConsent() {
  return (
    <Svg>
      <rect x="66" y="22" width="128" height="156" rx="10" opacity="0.7" />
      <Rings cx={96} cy={40} r={5} />
      {[64, 92, 120, 148].map((y, i) => (
        <g key={y}>
          <path d={`M86 ${y}l5 5 9-10`} stroke={BLUE} strokeWidth={1.8} pathLength={1} className={f.draw} style={{ animationDelay: `${250 + i * 220}ms` }} />
          <path d={`M110 ${y}h62`} opacity="0.65" />
        </g>
      ))}
    </Svg>
  );
}

/** Hidden checks: a grid of results filling in, one failing. */
export function FigChecks() {
  const cells = Array.from({ length: 15 }, (_, i) => i);
  return (
    <Svg>
      {cells.map((i) => {
        const x = 52 + (i % 5) * 34;
        const y = 36 + Math.floor(i / 5) * 40;
        const fail = i === 8;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width="24"
            height="24"
            rx="5"
            stroke={fail ? RED : BLUE}
            fill={fail ? "rgba(255,90,110,0.2)" : "rgba(91,108,255,0.14)"}
            className={f.cell}
            style={{ animationDelay: `${120 + i * 70}ms` }}
          />
        );
      })}
      <path d="M52 168h156" opacity="0.35" />
      <path d="M52 168h140" stroke={BLUE} strokeWidth={2} pathLength={1} className={f.grow} />
      <path d="M194 168h14" stroke={RED} strokeWidth={2} className={f.late} />
    </Svg>
  );
}

/** A cited report: a document whose lines link out to their sources. */
export function FigReport() {
  return (
    <Svg>
      <rect x="40" y="30" width="112" height="140" rx="8" opacity="0.7" />
      <Rings cx={64} cy={48} r={5} />
      {[76, 100, 124, 148].map((y, i) => (
        <path key={y} d={`M56 ${y}h${[72, 60, 80, 48][i]}`} opacity="0.65" />
      ))}
      {[76, 124].map((y, i) => (
        <g key={y}>
          <path d={`M${y === 76 ? 134 : 142} ${y}C170 ${y} 170 ${y + 14} 196 ${y + 14}`} stroke={BLUE} className={f.flow} />
          <rect x="196" y={y + 4} width="30" height="20" rx="4" stroke={BLUE} fill="rgba(91,108,255,0.14)" className={f.step} style={{ animationDelay: `${500 + i * 250}ms` }} />
        </g>
      ))}
    </Svg>
  );
}

/** The desktop app: a window with the project and the Fydell mark in its chrome. */
export function FigDesktop() {
  return (
    <Svg>
      <rect x="36" y="32" width="188" height="136" rx="10" opacity="0.75" />
      <path d="M36 56h188M92 56v112" opacity="0.5" />
      <Rings cx={52} cy={44} r={4} />
      {[72, 86, 100, 114].map((y, i) => (
        <path key={y} d={`M48 ${y}h${[30, 24, 32, 20][i]}`} opacity="0.55" />
      ))}
      {[74, 90, 106, 122, 138].map((y, i) => (
        <path
          key={y}
          d={`M106 ${y}h${[70, 96, 54, 84, 62][i]}`}
          stroke={i === 2 ? BLUE : i === 3 ? RED : "currentColor"}
          opacity={i === 2 || i === 3 ? 1 : 0.6}
          pathLength={1}
          className={f.type}
          style={{ animationDelay: `${150 + i * 200}ms` }}
        />
      ))}
      <path d="M170 106v8" stroke="#f7f8f8" strokeWidth={1.5} className={f.caret} />
      <circle cx="210" cy="44" r="3" fill={BLUE} stroke="none" className={f.core} />
    </Svg>
  );
}

/** A passport: work records the engineer owns, shared by link. */
export function FigPassport() {
  return (
    <Svg>
      <rect x="62" y="22" width="120" height="156" rx="10" opacity="0.75" />
      <Rings cx={100} cy={54} r={10} />
      <path d="M126 48h40M126 60h28" opacity="0.65" />
      {[96, 120, 144].map((y, i) => (
        <rect key={y} x="78" y={y - 8} width="88" height="16" rx="4" opacity="0.6" className={f.step} style={{ animationDelay: `${150 + i * 160}ms` }} />
      ))}
      <path d="M182 100h36" stroke={RED} strokeDasharray="3 4" className={f.flow} />
      <circle cx="222" cy="100" r="4" fill={RED} stroke="none" className={f.core} />
    </Svg>
  );
}
