export type ExitCode = 0 | 1;

export type CommandStatus = "success" | "unchanged" | "cancelled" | "failed";

export type OperationAction =
  | "created"
  | "copied"
  | "updated"
  | "deleted"
  | "unchanged"
  | "skipped"
  | "cancelled"
  | "failed";

export type ResourceType =
  | "file"
  | "directory"
  | "project"
  | "configuration"
  | "shell-profile"
  | "command";

export type ResourceScope = "project" | "config" | "home" | "package";

export type ResourcePath = {
  scope: ResourceScope;
  path: string;
};

export type OperationEvent = ResourcePath & {
  sequence: number;
  action: OperationAction;
  resource: ResourceType;
  role: string;
  source?: Partial<ResourcePath> & { template?: string };
  detail?: Record<string, string | number | boolean | null>;
};

export type NextStep = {
  kind: "translate" | "review" | "install" | "run-checks" | "rerun";
  required: boolean;
  message: string;
  paths: ResourcePath[];
  commands?: string[];
};

export type CommandError = Partial<ResourcePath> & {
  code: string;
  message: string;
  hint?: string;
};

export type CommandResult = {
  exitCode: ExitCode;
  status: CommandStatus;
  command: string;
  summary: string;
  projectRoot?: string;
  configRoot?: string;
  homeRoot?: string;
  events: OperationEvent[];
  nextSteps: NextStep[];
  error: CommandError | null;
  data?: Record<string, unknown>;
};

export type Terminal = {
  log: (...values: unknown[]) => void;
  warn: (...values: unknown[]) => void;
  error: (...values: unknown[]) => void;
};

export type PromptQuestion<T extends string = string> = {
  type: unknown;
  name?: T;
  message?: string;
  [key: string]: unknown;
};

export type PromptRunner = <T extends string = string>(
  questions: PromptQuestion<T> | PromptQuestion<T>[],
  options?: { onCancel?: () => boolean | void },
) => Promise<Record<T, unknown>>;

export type CliFileSystem = {
  exists: (path: string) => boolean;
  readText: (path: string) => Promise<string>;
  writeText: (path: string, content: string) => Promise<void>;
  mkdir: (path: string) => Promise<void>;
  copyFile: (source: string, target: string) => Promise<void>;
  appendText: (path: string, content: string) => Promise<void>;
  remove: (
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ) => Promise<void>;
  inspect: (path: string) => Promise<DirectoryEntry | null>;
  list: (path: string) => Promise<DirectoryEntry[]>;
};

export type DirectoryEntry = {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
};

export type OperationRecorder = {
  record: (event: Omit<OperationEvent, "sequence">) => OperationEvent;
  snapshot: () => OperationEvent[];
  reset: () => void;
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
  operations: OperationRecorder;
  outputMode: "human" | "json";
};

export type CommandHandler = (
  args: string[],
  context: CliContext,
) => Promise<CommandResult>;

export type CliErrorOptions = Partial<ResourcePath> & {
  exitCode?: ExitCode;
  code?: string;
  hint?: string;
};

export class CliError extends Error {
  readonly exitCode: ExitCode;
  readonly code: string;
  readonly hint?: string;
  readonly scope?: ResourceScope;
  readonly path?: string;

  constructor(message: string, options: ExitCode | CliErrorOptions = {}) {
    super(message);
    this.name = "CliError";
    if (typeof options === "number") {
      this.exitCode = options;
      this.code = "FILESYSTEM_ERROR";
    } else {
      this.exitCode = options.exitCode ?? 1;
      this.code = options.code ?? "FILESYSTEM_ERROR";
      this.hint = options.hint;
      this.scope = options.scope;
      this.path = options.path;
    }
  }
}
