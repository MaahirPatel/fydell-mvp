/*
 * Line illustrations for feature rows. Structure is drawn in currentColor at
 * low contrast; one element per figure carries Fydell blue or red.
 */

import type { ReactNode } from "react";

const BLUE = "#5b6cff";
const RED = "#ff5a6e";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 260 200" fill="none" stroke="currentColor" strokeWidth={1} aria-hidden>
      {children}
    </svg>
  );
}

/** An incident: rings spreading from one failing point. */
export function FigIncident() {
  return (
    <Svg>
      {[84, 64, 44, 24].map((r, i) => (
        <circle key={r} cx="130" cy="100" r={r} opacity={0.35 + i * 0.15} strokeDasharray={i === 0 ? "2 4" : undefined} />
      ))}
      <path d="M46 100h168M130 16v168" opacity="0.25" />
      <circle cx="130" cy="100" r="6" fill={RED} stroke="none" />
      <circle cx="130" cy="100" r="14" stroke={RED} opacity="0.6" />
    </Svg>
  );
}

/** The work trail: steps on a line, one of them the requirement change. */
export function FigTrail() {
  const ys = [28, 64, 100, 136, 172];
  return (
    <Svg>
      <path d="M92 28v144" opacity="0.4" />
      {ys.map((y, i) => (
        <g key={y}>
          <circle cx="92" cy={y} r="5" fill={i === 2 ? RED : i === 4 ? BLUE : "#08090a"} stroke={i === 2 ? RED : i === 4 ? BLUE : "currentColor"} />
          <path d={`M108 ${y}h${[88, 64, 96, 56, 76][i]}`} opacity={i === 2 || i === 4 ? 0.9 : 0.45} stroke={i === 2 ? RED : i === 4 ? BLUE : "currentColor"} />
        </g>
      ))}
    </Svg>
  );
}

/** A decision: three options, one chosen, each resting on evidence. */
export function FigDecide() {
  return (
    <Svg>
      {[40, 90, 140].map((y, i) => (
        <g key={y}>
          <rect x="54" y={y} width="152" height="30" rx="6" opacity={i === 0 ? 1 : 0.4} stroke={i === 0 ? BLUE : "currentColor"} />
          <circle cx="72" cy={y + 15} r="5" stroke={i === 0 ? BLUE : "currentColor"} opacity={i === 0 ? 1 : 0.6} />
          {i === 0 ? <circle cx="72" cy={y + 15} r="2" fill={BLUE} stroke="none" /> : null}
          <path d={`M88 ${y + 15}h${[80, 52, 64][i]}`} opacity={i === 0 ? 0.9 : 0.4} />
        </g>
      ))}
    </Svg>
  );
}

/** Consent: the disclosed list, checked before the work begins. */
export function FigConsent() {
  return (
    <Svg>
      <rect x="66" y="22" width="128" height="156" rx="10" opacity="0.5" />
      {[52, 80, 108, 136].map((y) => (
        <g key={y}>
          <path d={`M86 ${y}l5 5 9-10`} stroke={BLUE} strokeWidth={1.4} />
          <path d={`M110 ${y}h62`} opacity="0.45" />
        </g>
      ))}
      <path d="M86 162h86" opacity="0.2" strokeDasharray="2 4" />
    </Svg>
  );
}

/** Hidden checks: a grid of results, one failing. */
export function FigChecks() {
  const cells = Array.from({ length: 15 }, (_, i) => i);
  return (
    <Svg>
      {cells.map((i) => {
        const x = 52 + (i % 5) * 34;
        const y = 44 + Math.floor(i / 5) * 40;
        const fail = i === 8;
        return (
          <rect key={i} x={x} y={y} width="24" height="24" rx="5" stroke={fail ? RED : "currentColor"} opacity={fail ? 1 : 0.45} fill={fail ? "rgba(255,90,110,0.15)" : "none"} />
        );
      })}
      <path d="M52 164h156" stroke="url(#fyChecks)" strokeWidth={2} />
      <defs>
        <linearGradient id="fyChecks" x1="52" x2="208" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.9" stopColor={BLUE} />
          <stop offset="0.9" stopColor={RED} />
        </linearGradient>
      </defs>
    </Svg>
  );
}

/** A cited report: a document whose lines link out to their sources. */
export function FigReport() {
  return (
    <Svg>
      <rect x="40" y="30" width="112" height="140" rx="8" opacity="0.5" />
      {[56, 84, 112, 140].map((y, i) => (
        <path key={y} d={`M56 ${y}h${[72, 60, 80, 48][i]}`} opacity="0.45" />
      ))}
      {[56, 112].map((y) => (
        <g key={y}>
          <path d={`M${y === 56 ? 134 : 142} ${y}C170 ${y} 170 ${y + 14} 196 ${y + 14}`} stroke={BLUE} opacity="0.8" />
          <rect x="196" y={y + 4} width="28" height="20" rx="4" stroke={BLUE} />
        </g>
      ))}
    </Svg>
  );
}

/** The desktop app: a window with the project inside. */
export function FigDesktop() {
  return (
    <Svg>
      <rect x="36" y="36" width="188" height="128" rx="10" opacity="0.55" />
      <path d="M36 58h188M92 58v106" opacity="0.35" />
      {[74, 88, 102, 116].map((y, i) => (
        <path key={y} d={`M48 ${y}h${[30, 24, 32, 20][i]}`} opacity="0.35" />
      ))}
      {[76, 92, 108, 124, 140].map((y, i) => (
        <path key={y} d={`M106 ${y}h${[70, 96, 54, 84, 62][i]}`} stroke={i === 2 ? BLUE : i === 3 ? RED : "currentColor"} opacity={i === 2 || i === 3 ? 0.9 : 0.4} />
      ))}
      <circle cx="210" cy="47" r="3" fill={BLUE} stroke="none" />
    </Svg>
  );
}

/** A passport: work records the engineer owns and shares. */
export function FigPassport() {
  return (
    <Svg>
      <rect x="70" y="24" width="120" height="152" rx="10" opacity="0.55" />
      <circle cx="104" cy="60" r="14" stroke={BLUE} />
      <path d="M126 54h44M126 66h28" opacity="0.45" />
      {[96, 120, 144].map((y) => (
        <g key={y}>
          <rect x="86" y={y - 8} width="88" height="16" rx="4" opacity="0.35" />
        </g>
      ))}
      <path d="M190 100h34" stroke={RED} strokeDasharray="3 3" />
      <circle cx="226" cy="100" r="3" fill={RED} stroke="none" />
    </Svg>
  );
}
