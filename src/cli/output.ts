import path from "node:path";

import type {
  CliContext,
  CommandResult,
  OperationEvent,
  ResourceScope,
} from "../core/contracts";

export type OutputMode = "human" | "json";

function rootFor(
  result: CommandResult,
  context: CliContext,
  scope: ResourceScope,
): string | undefined {
  if (scope === "project") return result.projectRoot;
  if (scope === "config") return result.configRoot;
  if (scope === "home") return result.homeRoot;
  return context.packageRoot;
}

function displayPath(
  result: CommandResult,
  context: CliContext,
  scope: ResourceScope,
  target: string,
): string {
  const root = rootFor(result, context, scope);
  return root ? path.resolve(root, target) : target;
}

function renderEvent(
  result: CommandResult,
  context: CliContext,
  event: OperationEvent,
): string {
  const source = event.source?.template
    ? ` from template ${event.source.template}`
    : event.source?.path
      ? ` from ${displayPath(
          result,
          context,
          event.source.scope ?? event.scope,
          event.source.path,
        )}`
      : "";
  const detail = event.detail
    ? ` (${Object.entries(event.detail)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(", ")})`
    : "";
  return `${event.action.toUpperCase()} ${event.role}: ${displayPath(
    result,
    context,
    event.scope,
    event.path,
  )}${source}${detail}`;
}

export function renderResult(
  result: CommandResult,
  context: CliContext,
  mode: OutputMode,
): void {
  if (mode === "json") {
    context.terminal.log(JSON.stringify({ schemaVersion: 1, ...result }));
    return;
  }

  if (result.command === "help" && typeof result.data?.help === "string") {
    context.terminal.log(result.data.help);
    return;
  }
  if (
    result.command === "version" &&
    typeof result.data?.version === "string"
  ) {
    context.terminal.log(`v${result.data.version}`);
    return;
  }

  const copiedTemplateFiles = result.events.filter(
    (event) => event.action === "copied" && event.role === "template-file",
  );
  if (copiedTemplateFiles.length > 0) {
    context.terminal.log(
      `COPIED ${copiedTemplateFiles.length} template files to ${result.projectRoot}.`,
    );
  }

  for (const event of result.events) {
    if (event.action === "copied" && event.role === "template-file") continue;
    const line = renderEvent(result, context, event);
    if (event.action === "failed") context.terminal.error(line);
    else if (event.action === "skipped") context.terminal.warn(line);
    else context.terminal.log(line);
  }

  if (result.error) {
    context.terminal.error(
      `ERROR [${result.error.code}]: ${result.error.message}`,
    );
    if (result.error.hint) context.terminal.error(`HINT: ${result.error.hint}`);
  } else if (result.status === "success") {
    context.terminal.log(`SUCCESS: ${result.summary}`);
  } else if (result.status === "unchanged") {
    context.terminal.log(`NO CHANGES: ${result.summary}`);
  } else if (result.status === "cancelled") {
    context.terminal.log(`CANCELLED: ${result.summary}`);
  }

  for (const step of result.nextSteps) {
    context.terminal.log(`NEXT [${step.kind}]: ${step.message}`);
    for (const target of step.paths) {
      context.terminal.log(
        `  ${displayPath(result, context, target.scope, target.path)}`,
      );
    }
    for (const command of step.commands ?? []) {
      context.terminal.log(`  ${command}`);
    }
  }
}
