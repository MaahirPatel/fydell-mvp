import type { CSSProperties, ReactNode } from "react";

/*
 * Line illustrations for feature trios. 1.5px strokes (1 unit at the rendered
 * 1.5x scale), neutral ink with one ring-palette accent each.
 * Every drawn path carries pathLength=1 and .fy-draw, so it draws itself in
 * when its trio scrolls into view; --d orders the strokes.
 */

const INK = "var(--text-tertiary)";
const FAINT = "var(--border-strong)";
const BLUE = "#5B6CFF";
const RED = "#FF5A6E";
const TEAL = "#1FB8A5";

function Svg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 160 100"
      width="240"
      height="150"
      style={{ maxWidth: "72%", height: "auto", overflow: "visible" }}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

const d = (n: number) => ({ "--d": n }) as CSSProperties;
const base = {
  pathLength: 1,
  className: "fy-draw",
  // 1 unit at the rendered 1.5x scale = a 1.5px line.
  strokeWidth: 1,
};

/** Two small interlocking rings: the mark, drawn in line. */
function MiniMark({ x, y, r = 4.2 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle {...base} style={d(4)} cx={x} cy={y} r={r} stroke={BLUE} />
      <circle {...base} style={d(4)} cx={x + r * 1.06} cy={y} r={r} stroke={RED} />
    </g>
  );
}

export function IncidentRipple() {
  return (
    <Svg label="An incident rippling outward from one failing call">
      <path {...base} style={d(0)} d="M14 70 H146" stroke={FAINT} />
      {[18, 32, 46].map((r, i) => (
        <path
          key={r}
          {...base}
          style={d(i + 1)}
          d={`M${80 - r} 70 A${r} ${r} 0 0 1 ${80 + r} 70`}
          stroke={i === 0 ? RED : INK}
          strokeOpacity={i === 0 ? 1 : 0.7 - i * 0.18}
        />
      ))}
      <circle className="fy-fill" cx="80" cy="70" r="3.2" fill={RED} />
      {[24, 40, 120, 136].map((x, i) => (
        <path key={x} {...base} style={d(3 + i * 0.3)} d={`M${x} 66 V74`} stroke={INK} />
      ))}
    </Svg>
  );
}

export function WorkTrail() {
  const nodes = [22, 54, 86, 118, 140];
  return (
    <Svg label="A timeline of recorded work: edits, commands, test runs">
      <path {...base} style={d(0)} d="M14 50 H146" stroke={FAINT} />
      {nodes.map((x, i) =>
        i === 2 ? (
          <path key={x} {...base} style={d(i + 1)} d={`M${x} 44 L${x + 6} 50 L${x} 56 L${x - 6} 50 Z`} stroke={RED} />
        ) : (
          <circle key={x} {...base} style={d(i + 1)} cx={x} cy="50" r="4.5" stroke={i === 4 ? TEAL : INK} />
        ),
      )}
      {nodes.map((x, i) => (
        <path
          key={`l${x}`}
          {...base}
          style={d(i + 2)}
          d={i % 2 ? `M${x - 8} 72 H${x + 10}` : `M${x - 8} 28 H${x + 12}`}
          stroke={INK}
          strokeOpacity="0.55"
        />
      ))}
      <circle className="fy-fill" cx="140" cy="50" r="1.8" fill={TEAL} />
    </Svg>
  );
}

export function DecisionStack() {
  return (
    <Svg label="Three decisions, Advance, Hold and Decline, with one selected">
      {[18, 42, 66].map((y, i) => (
        <rect
          key={y}
          {...base}
          style={d(i)}
          x="34"
          y={y}
          width="92"
          height="18"
          rx="5"
          stroke={i === 0 ? BLUE : INK}
          strokeOpacity={i === 0 ? 1 : 0.6}
        />
      ))}
      <path {...base} style={d(3)} d="M44 27 l3.5 3.5 L54 24" stroke={BLUE} />
      <path {...base} style={d(3)} d="M62 27 H98" stroke={INK} />
      <path {...base} style={d(4)} d="M44 51 H86" stroke={INK} strokeOpacity="0.5" />
      <path {...base} style={d(5)} d="M44 75 H80" stroke={INK} strokeOpacity="0.5" />
    </Svg>
  );
}

export function ConsentChecklist() {
  return (
    <Svg label="A consent checklist of what is and is not recorded">
      <rect {...base} style={d(0)} x="36" y="10" width="88" height="80" rx="7" stroke={INK} />
      <MiniMark x={48} y={22} r={3.4} />
      {[38, 52, 66].map((y, i) => (
        <g key={y}>
          <rect {...base} style={d(i + 1)} x="46" y={y - 4} width="8" height="8" rx="2" stroke={TEAL} />
          <path {...base} style={d(i + 1.5)} d={`M48 ${y} l1.6 1.6 L52.4 ${y - 1.6}`} stroke={TEAL} />
          <path {...base} style={d(i + 2)} d={`M62 ${y} H${104 - i * 8}`} stroke={INK} strokeOpacity="0.6" />
        </g>
      ))}
      <path {...base} style={d(5)} d="M46.5 76.5 l7 7 M53.5 76.5 l-7 7" stroke={INK} strokeOpacity="0.7" />
      <path {...base} style={d(5)} d="M62 80 H96" stroke={INK} strokeOpacity="0.4" />
    </Svg>
  );
}

export function ChecksGrid() {
  const cells = Array.from({ length: 15 }, (_, i) => i);
  return (
    <Svg label="A grid of fifteen hidden checks, fourteen passed and one failed">
      {cells.map((i) => {
        const x = 34 + (i % 5) * 19;
        const y = 22 + Math.floor(i / 5) * 19;
        const failed = i === 12;
        return (
          <rect
            key={i}
            {...base}
            style={d(i * 0.25)}
            x={x}
            y={y}
            width="13"
            height="13"
            rx="3"
            stroke={failed ? RED : TEAL}
            strokeOpacity={failed ? 1 : 0.85}
          />
        );
      })}
      <path className="fy-fill" d="M76.5 67 l6 6 M82.5 67 l-6 6" stroke={RED} strokeWidth="1" />
    </Svg>
  );
}

export function ReportDoc() {
  return (
    <Svg label="A report whose findings each cite a file, a test or a message">
      <rect {...base} style={d(0)} x="40" y="8" width="80" height="86" rx="7" stroke={INK} />
      <MiniMark x={52} y={20} r={3.4} />
      <path {...base} style={d(1)} d="M66 20 H106" stroke={INK} />
      {[36, 56, 76].map((y, i) => (
        <g key={y}>
          <path {...base} style={d(i + 2)} d={`M52 ${y} H${104 - i * 6}`} stroke={INK} strokeOpacity="0.6" />
          <rect
            {...base}
            style={d(i + 2.5)}
            x="52"
            y={y + 5}
            width={i === 2 ? 26 : 30}
            height="8"
            rx="2.5"
            stroke={i === 2 ? RED : BLUE}
          />
        </g>
      ))}
    </Svg>
  );
}

export function DesktopWindow() {
  return (
    <Svg label="The desktop app window with a file tree and code">
      <rect {...base} style={d(0)} x="18" y="12" width="124" height="78" rx="7" stroke={INK} />
      <path {...base} style={d(1)} d="M18 24 H142" stroke={INK} strokeOpacity="0.6" />
      <path {...base} style={d(1)} d="M50 24 V90" stroke={INK} strokeOpacity="0.6" />
      <MiniMark x={28} y={33} r={3} />
      {[46, 54, 62, 70].map((y, i) => (
        <path key={y} {...base} style={d(2 + i * 0.3)} d={`M26 ${y} H${42 - (i % 2) * 5}`} stroke={INK} strokeOpacity="0.5" />
      ))}
      {[34, 42, 50, 58, 66, 74].map((y, i) => (
        <path
          key={y}
          {...base}
          style={d(3 + i * 0.3)}
          d={`M${60 + (i % 3) * 6} ${y} H${96 + ((i * 17) % 34)}`}
          stroke={i === 2 ? TEAL : i === 3 ? RED : INK}
          strokeOpacity={i === 2 || i === 3 ? 1 : 0.55}
        />
      ))}
    </Svg>
  );
}

export function PassportCard() {
  return (
    <Svg label="An Engineering Passport linking findings to exact lines in a repository">
      <rect {...base} style={d(0)} x="30" y="12" width="100" height="76" rx="8" stroke={INK} />
      <MiniMark x={44} y={27} r={4} />
      <path {...base} style={d(1)} d="M62 27 H114" stroke={INK} />
      <circle {...base} style={d(2)} cx="46" cy="48" r="3" stroke={BLUE} />
      <path {...base} style={d(2)} d="M49 48 H72" stroke={BLUE} />
      <path {...base} style={d(3)} d="M80 48 H114" stroke={INK} strokeOpacity="0.5" />
      <path {...base} style={d(3)} d="M42 62 H100" stroke={INK} strokeOpacity="0.5" />
      <path {...base} style={d(4)} d="M42 72 H88" stroke={INK} strokeOpacity="0.5" />
      <path {...base} style={d(5)} d="M104 74 a5 5 0 0 1 7 -7 l3 -3 a5 5 0 0 1 7 7 l-3 3" stroke={TEAL} />
    </Svg>
  );
}
