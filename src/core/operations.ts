import path from "node:path";

import type {
  CliContext,
  CommandError,
  CommandResult,
  CommandStatus,
  NextStep,
  OperationEvent,
  OperationRecorder,
  ResourceScope,
  ResourceType,
} from "./contracts";
import { CliError } from "./contracts";

export class OperationJournal implements OperationRecorder {
  readonly #events: OperationEvent[] = [];

  record(event: Omit<OperationEvent, "sequence">): OperationEvent {
    const detail = event.detail
      ? Object.fromEntries(
          Object.entries(event.detail).map(([key, value]) => [
            key,
            /(content|credential|env|password|secret|token|value)/i.test(key)
              ? "[REDACTED]"
              : value,
          ]),
        )
      : undefined;
    const recorded = {
      ...event,
      detail,
      sequence: this.#events.length + 1,
    };
    this.#events.push(recorded);
    return recorded;
  }

  snapshot(): OperationEvent[] {
    return this.#events.map((event) => ({ ...event }));
  }

  reset(): void {
    this.#events.length = 0;
  }
}

const MUTATIONS = new Set(["created", "copied", "updated", "deleted"]);

export function statusFromEvents(events: OperationEvent[]): CommandStatus {
  if (events.some((event) => event.action === "cancelled")) return "cancelled";
  return events.some((event) => MUTATIONS.has(event.action))
    ? "success"
    : "unchanged";
}

export function commandResult(
  context: CliContext,
  input: {
    command: string;
    summary: string;
    projectRoot?: string;
    configRoot?: string;
    homeRoot?: string;
    nextSteps?: NextStep[];
    data?: Record<string, unknown>;
    status?: CommandStatus;
  },
): CommandResult {
  const events = context.operations.snapshot();
  const status = input.status ?? statusFromEvents(events);
  return {
    exitCode: status === "failed" ? 1 : 0,
    status,
    command: input.command,
    summary: input.summary,
    projectRoot: input.projectRoot,
    configRoot: input.configRoot,
    homeRoot: input.homeRoot,
    events,
    nextSteps: input.nextSteps ?? [],
    error: null,
    data: input.data,
  };
}

export function failedResult(
  context: CliContext,
  command: string,
  error: unknown,
  roots: {
    projectRoot?: string;
    configRoot?: string;
    homeRoot?: string;
  } = {},
): CommandResult {
  const cliError = error instanceof CliError ? error : undefined;
  const normalized: CommandError = {
    code: cliError?.code ?? "FILESYSTEM_ERROR",
    message: error instanceof Error ? error.message : String(error),
    hint: cliError?.hint,
    scope: cliError?.scope,
    path: cliError?.path,
  };
  const nextSteps: NextStep[] =
    normalized.code === "ONBOARDING_REQUIRED"
      ? [
          {
            kind: "rerun",
            required: true,
            message:
              "Run create-next-pro once in human mode, then rerun the JSON command.",
            paths: [{ scope: "config", path: "config.json" }],
            commands: ["create-next-pro"],
          },
        ]
      : [];
  context.operations.record({
    action: "failed",
    resource: "command",
    role: command,
    scope: normalized.scope ?? "project",
    path: normalized.path ?? ".",
    detail: { code: normalized.code },
  });
  return {
    exitCode: cliError?.exitCode ?? 1,
    status: "failed",
    command,
    summary: normalized.message,
    ...roots,
    events: context.operations.snapshot(),
    nextSteps,
    error: normalized,
  };
}

export function relativeResource(root: string, target: string): string {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative || ".";
}

type MutationMetadata = {
  role: string;
  resource?: ResourceType;
  scope?: ResourceScope;
  source?: OperationEvent["source"];
  detail?: OperationEvent["detail"];
};

export class MutationGateway {
  constructor(
    private readonly context: CliContext,
    private readonly root: string,
    private readonly defaultScope: ResourceScope = "project",
  ) {}

  path(target: string): string {
    return relativeResource(this.root, target);
  }

  async mkdir(
    target: string,
    metadata: MutationMetadata,
    record = true,
  ): Promise<"created" | "unchanged"> {
    if (this.context.fs.exists(target)) {
      if (record) this.record("unchanged", target, metadata);
      return "unchanged";
    }
    await this.context.fs.mkdir(target);
    if (record) this.record("created", target, metadata);
    return "created";
  }

  async write(
    target: string,
    content: string,
    metadata: MutationMetadata & { preserveExisting?: boolean },
  ): Promise<"created" | "updated" | "unchanged"> {
    const exists = this.context.fs.exists(target);
    if (exists && metadata.preserveExisting) {
      this.record("unchanged", target, metadata);
      return "unchanged";
    }
    if (exists && (await this.context.fs.readText(target)) === content) {
      this.record("unchanged", target, metadata);
      return "unchanged";
    }
    await this.context.fs.mkdir(path.dirname(target));
    await this.context.fs.writeText(target, content);
    const action = exists ? "updated" : "created";
    this.record(action, target, metadata);
    return action;
  }

  async copy(
    source: string,
    target: string,
    metadata: MutationMetadata & { preserveExisting?: boolean },
  ): Promise<"copied" | "unchanged"> {
    if (this.context.fs.exists(target) && metadata.preserveExisting) {
      this.record("unchanged", target, metadata);
      return "unchanged";
    }
    await this.context.fs.mkdir(path.dirname(target));
    await this.context.fs.copyFile(source, target);
    this.record("copied", target, {
      ...metadata,
      source: metadata.source ?? { path: source },
    });
    return "copied";
  }

  async remove(
    target: string,
    metadata: MutationMetadata,
    options: { recursive?: boolean; force?: boolean } = {},
  ): Promise<"deleted" | "unchanged"> {
    if (!this.context.fs.exists(target)) {
      this.record("unchanged", target, metadata);
      return "unchanged";
    }
    await this.context.fs.remove(target, options);
    this.record("deleted", target, metadata);
    return "deleted";
  }

  unchanged(target: string, metadata: MutationMetadata): void {
    this.record("unchanged", target, metadata);
  }

  skipped(target: string, metadata: MutationMetadata): void {
    this.record("skipped", target, metadata);
  }

  private record(
    action: OperationEvent["action"],
    target: string,
    metadata: MutationMetadata,
  ): void {
    this.context.operations.record({
      action,
      resource: metadata.resource ?? "file",
      role: metadata.role,
      scope: metadata.scope ?? this.defaultScope,
      path: this.path(target),
      source: metadata.source,
      detail: metadata.detail,
    });
  }
}
