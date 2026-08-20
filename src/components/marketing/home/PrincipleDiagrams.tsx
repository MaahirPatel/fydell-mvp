/**
 * The three principle figures.
 *
 * Drawn as 2:1 isometric line work: every rhombus is twice as wide as it is
 * tall, so the three figures share one projection and read as a set rather than
 * as three unrelated drawings. Strokes inherit `currentColor` and are held at
 * low alpha, which is what keeps them as quiet structure on the ivory ground
 * instead of diagrams competing with the headline.
 *
 * They are deliberately abstract. A literal illustration of a hiring workflow
 * ends up as clip art; these describe the shape of the idea, and the caption
 * underneath does the naming.
 */

const STROKE = "currentColor";

/** A 2:1 isometric rhombus centred on (cx, cy). */
function rhombus(cx: number, cy: number, w: number) {
  const h = w / 2;
  return `${cx},${cy - h} ${cx + w},${cy} ${cx},${cy + h} ${cx - w},${cy}`;
}

function Figure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      className="principle-figure"
      viewBox="0 0 280 200"
      role="img"
      aria-label={label}
      fill="none"
      stroke={STROKE}
      strokeWidth={1}
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/**
 * Work, not a test.
 *
 * A stack of accumulated work with the most recent revision lifted clear of it:
 * the artifact has a history, and the last state is not the whole story.
 */
export function WorkSurfaceDiagram() {
  // Spaced as an exploded stack. Tightly packed plates at this width overlap by
  // more than half their height and collapse into noise.
  const plates = [158, 130, 102];
  return (
    <Figure label="A stack of accumulated work with the latest revision lifted above it">
      {/* The spine runs behind everything, holding the layers on one axis. */}
      <line x1={140} y1={20} x2={140} y2={190} opacity={0.14} strokeDasharray="3 5" />

      {plates.map((y, i) => (
        <polygon
          key={y}
          points={rhombus(140, y, 58)}
          opacity={0.22 + i * 0.07}
          fill={STROKE}
          fillOpacity={0.025}
        />
      ))}

      {/* The current revision, lifted clear of the history it came from. */}
      <polygon points={rhombus(140, 46, 58)} opacity={0.5} fill={STROKE} fillOpacity={0.05} />
      <polygon points={rhombus(140, 46, 18)} opacity={0.28} />
    </Figure>
  );
}

/**
 * Evidence with limits.
 *
 * One claim held above the ground it rests on, tied down to what supports it,
 * what argues against it, and one thing still dashed because nobody knows.
 */
export function EvidenceDiagram() {
  const anchors: Array<{ x: number; y: number; dashed?: boolean }> = [
    { x: 96, y: 142 },
    { x: 182, y: 154 },
    { x: 112, y: 174 },
    { x: 196, y: 134, dashed: true },
  ];

  return (
    <Figure label="A claim connected to supporting evidence, counter evidence, and one unknown">
      <polygon points={rhombus(140, 152, 90)} opacity={0.28} fill={STROKE} fillOpacity={0.02} />

      {anchors.map((a) => (
        <g key={`${a.x}-${a.y}`} opacity={a.dashed ? 0.5 : 0.58}>
          <line
            x1={140}
            y1={68}
            x2={a.x}
            y2={a.y - 13}
            strokeDasharray={a.dashed ? "3 4" : undefined}
            opacity={0.62}
          />
          <line x1={a.x} y1={a.y} x2={a.x} y2={a.y - 13} opacity={0.6} />
          <polygon
            points={rhombus(a.x, a.y - 13, 9)}
            strokeDasharray={a.dashed ? "3 3" : undefined}
            fill={STROKE}
            fillOpacity={a.dashed ? 0 : 0.06}
          />
        </g>
      ))}

      {/* The claim itself, the only filled form in the set. */}
      <polygon points={rhombus(140, 55, 24)} opacity={0.62} fill={STROKE} fillOpacity={0.08} />
    </Figure>
  );
}

/**
 * A better interview.
 *
 * Three steps of rising resolution: an open question, a probe drawn from the
 * work, and a finding that stands on both.
 */
export function BriefDiagram() {
  const boxes = [
    { cx: 68, cy: 100, h: 12, o: 0.26 },
    { cx: 140, cy: 136, h: 26, o: 0.4 },
    { cx: 212, cy: 172, h: 44, o: 0.6 },
  ];
  const w = 32;
  const hh = w / 2;

  return (
    <Figure label="Three rising steps, from an open question to a probe to a finding">
      {/* The ground line the three steps advance along. */}
      <line x1={36} y1={100} x2={244} y2={204} opacity={0.12} strokeDasharray="2 5" />

      {boxes.map((b) => (
        <g key={b.cx} opacity={b.o}>
          {/* Left and right faces, then the lid. */}
          <path
            d={`M${b.cx - w} ${b.cy} L${b.cx} ${b.cy + hh} L${b.cx} ${b.cy + hh - b.h} L${b.cx - w} ${b.cy - b.h} Z`}
            fill={STROKE}
            fillOpacity={0.05}
          />
          <path
            d={`M${b.cx} ${b.cy + hh} L${b.cx + w} ${b.cy} L${b.cx + w} ${b.cy - b.h} L${b.cx} ${b.cy + hh - b.h} Z`}
            fill={STROKE}
            fillOpacity={0.03}
          />
          <polygon
            points={rhombus(b.cx, b.cy - b.h, w)}
            fill={STROKE}
            fillOpacity={0.04}
          />
        </g>
      ))}
    </Figure>
  );
}
