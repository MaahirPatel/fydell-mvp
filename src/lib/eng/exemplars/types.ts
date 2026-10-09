import type { ProtectedMaterials, ScenarioPackage } from "../authoring/package";
import type { Level } from "../taxonomy";
import type { TrackId } from "../tracks";

export type ExemplarDifficulty = "introductory" | "moderate" | "challenging";

/**
 * A simulation template: a complete, hand-reviewed scenario package for one
 * track and task family. Employers can run it as is, and the generator uses
 * it as the pattern for a new scenario in the employer's own context. It is
 * never offered until its package passes `validatePackage` on the runner.
 */
export type Exemplar = {
  key: string;
  version: string;
  track: TrackId;
  taskFamily: string;
  level: Level;
  difficulty: ExemplarDifficulty;
  businessContext: string;
  stack: { language: "javascript" | "python"; label: string };
  /** One-line card description. */
  summary: string;
  /** Package runs with `node --test` and only stdlib imports, so the browser preview can run it too. */
  browserPreview: boolean;
  /** What the generator must keep and may vary when it adapts this scenario to another context. */
  pattern: {
    /** The underlying engineering problem, independent of business domain. */
    problem: string;
    /** Capabilities the scenario produces evidence for. */
    assesses: string[];
    /** Properties every adaptation must preserve for the scenario to stay fair and measurable. */
    invariants: string[];
    /** Dimensions an adaptation is expected to change. */
    variationAxes: string[];
  };
  build(): { pkg: ScenarioPackage; prot: ProtectedMaterials };
};
