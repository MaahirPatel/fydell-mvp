/** ExecutionProvider contract for Project Relay. No host arbitrary shell. */

export type FileMap = Record<string, string>;

export type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  command: string;
};

export type Snapshot = {
  files: FileMap;
  createdAt: string;
  label: string;
};

export interface ExecutionProvider {
  initializeSession(seedFiles: FileMap): Promise<void>;
  listFiles(): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  runCommand(command: string): Promise<CommandResult>;
  runTests(): Promise<CommandResult>;
  runEvaluations(): Promise<CommandResult>;
  snapshot(label: string): Promise<Snapshot>;
  restore(snapshot: Snapshot): Promise<void>;
  terminate(): Promise<void>;
}

export const ALLOWED_COMMANDS = new Set([
  "test",
  "pytest",
  "evals",
  "preview",
  "reconcile",
  "help",
]);

export function parseAllowlistedCommand(input: string): string | null {
  const cmd = input.trim().toLowerCase();
  if (ALLOWED_COMMANDS.has(cmd)) return cmd;
  if (cmd.startsWith("python ") && cmd.includes("run_evals")) return "evals";
  if (cmd.startsWith("python ") && cmd.includes("reconcile")) return "reconcile";
  if (cmd.startsWith("pytest")) return "pytest";
  return null;
}
