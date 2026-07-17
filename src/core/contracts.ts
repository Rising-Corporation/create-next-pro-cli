import type { PromptObject } from "prompts";

export type ExitCode = 0 | 1;

export type CommandResult = {
  exitCode: ExitCode;
};

export type Terminal = {
  log: (...values: unknown[]) => void;
  warn: (...values: unknown[]) => void;
  error: (...values: unknown[]) => void;
};

export type PromptRunner = <T extends string = string>(
  questions: PromptObject<T> | PromptObject<T>[],
  options?: { onCancel?: () => boolean | void },
) => Promise<Record<T, unknown>>;

export type CliFileSystem = {
  exists: (path: string) => boolean;
  readText: (path: string) => Promise<string>;
  writeText: (path: string, content: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (source: string, target: string) => Promise<void>;
  appendText: (path: string, content: string) => Promise<void>;
};

export type CliContext = {
  argv: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  homeDir: string;
  packageRoot: string;
  terminal: Terminal;
  prompt: PromptRunner;
  fs: CliFileSystem;
};

export type CommandHandler = (
  args: string[],
  context: CliContext,
) => Promise<CommandResult>;

export const success = (): CommandResult => ({ exitCode: 0 });

export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: ExitCode = 1,
  ) {
    super(message);
    this.name = "CliError";
  }
}
