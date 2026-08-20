import { spawn } from "child_process";
import path from "path";
import type { AnalysisJobType, AnalysisResult, RunSnapshot } from "./types";
import { validateAnalysisResult } from "./validate-analysis";

function pythonBins(): string[] {
  if (process.env.EVIDENCE_ENGINE_PYTHON) return [process.env.EVIDENCE_ENGINE_PYTHON];
  return process.platform === "win32" ? ["py", "python", "python3"] : ["python3", "python"];
}

function engineRoot(): string {
  return path.join(process.cwd(), "services", "evidence-engine");
}

export async function runEvidenceJob(
  jobType: AnalysisJobType,
  snapshot: RunSnapshot,
): Promise<AnalysisResult> {
  const url = process.env.EVIDENCE_ENGINE_URL;
  const secret = process.env.EVIDENCE_ENGINE_SECRET || "";
  const payload = JSON.stringify({ job_type: jobType, snapshot });

  if (url) {
    const response = await fetch(`${url.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: payload,
    });
    if (!response.ok) throw new Error(`evidence engine HTTP ${response.status}`);
    return validateAnalysisResult(await response.json());
  }

  const raw = await spawnPython(payload);
  return validateAnalysisResult(JSON.parse(raw) as unknown);
}

function spawnPython(stdin: string): Promise<string> {
  const bins = pythonBins();
  const tryBin = (index: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const bin = bins[index];
      const args = bin === "py" ? ["-3", "-m", "evidence_engine"] : ["-m", "evidence_engine"];
      const child = spawn(bin, args, {
        cwd: engineRoot(),
        env: { ...process.env, PYTHONPATH: engineRoot() },
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (chunk: Buffer) => {
        out += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        err += chunk.toString("utf8");
      });
      child.on("error", (error) => {
        if (index + 1 < bins.length) tryBin(index + 1).then(resolve, reject);
        else reject(error);
      });
      child.on("close", (code) => {
        if (code !== 0) {
          if (index + 1 < bins.length && /not found|ENOENT/i.test(err)) {
            tryBin(index + 1).then(resolve, reject);
            return;
          }
          reject(new Error(err || `python exited ${code}`));
        } else resolve(out);
      });
      child.stdin.write(stdin);
      child.stdin.end();
    });
  return tryBin(0);
}
