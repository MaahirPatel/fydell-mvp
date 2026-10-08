import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";
import s from "./home.module.css";

export type Painting = "hills" | "coast" | "field";

const available = new Map<Painting, boolean>();

/** Whether the painting ships in `public/`. A missing file leaves a plain warm ground. */
export function hasPainting(painting: Painting): boolean {
  let found = available.get(painting);
  if (found === undefined) {
    found = existsSync(join(process.cwd(), "public", "marketing", "paintings", `${painting}.jpg`));
    available.set(painting, found);
  }
  return found;
}

/**
 * A product view floated on an oil-painting ground. The painting is
 * decorative. `wash` adds the brand's teal-to-violet light behind the view;
 * it is meant for the one hero visual on a page.
 */
export default function PaintedStage({
  painting,
  children,
  inset = "default",
  priority = false,
  wash = false,
}: {
  painting: Painting;
  children: ReactNode;
  inset?: "default" | "wide" | "hero";
  priority?: boolean;
  wash?: boolean;
}) {
  const painted = hasPainting(painting);
  return (
    <div className={inset === "wide" ? s.stageWide : inset === "hero" ? `${s.stage} ${s.stageHero}` : s.stage} data-painted={painted ? undefined : "none"}>
      {painted ? (
        <Image
          src={`/marketing/paintings/${painting}.jpg`}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 1264px) 100vw, 1200px"
          className={s.stageImage}
        />
      ) : null}
      {wash ? <span aria-hidden className={s.stageWash} /> : null}
      <div className={s.stageInner}>{children}</div>
    </div>
  );
}
