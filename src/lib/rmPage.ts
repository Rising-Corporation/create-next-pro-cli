import path from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import { discoverPages } from "../core/page-catalog";
import { parseLogicalName, resolveInside } from "../core/project-paths";
import { toIdentifier } from "./utils";

type PreparedMessageRemoval = {
  target: string;
  content?: string;
  keyPresent: boolean;
};

type PreparedAggregatorUpdate = {
  target: string;
  content: string;
  changed: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unregisterMessagesFile(
  content: string,
  locale: string,
  fileName: string,
): { content: string; changed: boolean } {
  const identifier = toIdentifier(fileName);
  const escapedIdentifier = escapeRegExp(identifier);
  const escapedPath = escapeRegExp(`./${locale}/${fileName}.json`);
  const importPattern = new RegExp(
    `^import\\s+${escapedIdentifier}\\s+from\\s+["']${escapedPath}["'];?\\r?\\n?`,
    "m",
  );
  const propertyPattern = new RegExp(
    `^\\s*${escapedIdentifier},\\s*\\r?\\n?`,
    "m",
  );
  const hasImport = importPattern.test(content);
  const hasProperty = propertyPattern.test(content);
  if (hasImport !== hasProperty) {
    throw new CliError(
      `Locale aggregator messages/${locale}.ts is inconsistent for ${fileName}.json.`,
      {
        code: "INCONSISTENT_LOCALE",
        scope: "project",
        path: `messages/${locale}.ts`,
      },
    );
  }
  if (!hasImport) return { content, changed: false };
  return {
    content: content.replace(importPattern, "").replace(propertyPattern, ""),
    changed: true,
  };
}

export const rmPage: CommandHandler = async (args, context) => {
  const candidates = await discoverPages(context.cwd, context.fs);
  let logicalName = args[1];
  if (!logicalName || logicalName.startsWith("-")) {
    if (context.outputMode === "json") {
      throw new CliError("Page name is required in JSON mode.", {
        code: "INTERACTIVE_INPUT_REQUIRED",
        hint: "Pass a page name returned by completion after rmpage.",
      });
    }
    const selected = await context.prompt<"page" | "confirm">([
      {
        type: "autocomplete",
        name: "page",
        message: "Page to remove:",
        choices: candidates.map((candidate) => ({
          title: candidate.logicalName.replaceAll(".", " > "),
          value: candidate.logicalName,
        })),
      },
      {
        type: (value: string) => (value ? "confirm" : null),
        name: "confirm",
        message: "Confirm page deletion?",
        initial: false,
      },
    ]);
    if (!selected.confirm) {
      context.operations.record({
        action: "cancelled",
        resource: "command",
        role: "page-removal",
        scope: "project",
        path: ".",
      });
      return commandResult(context, {
        command: "rmpage",
        summary: "Page deletion was cancelled.",
        projectRoot: context.cwd,
        status: "cancelled",
      });
    }
    logicalName = String(selected.page ?? "");
  }

  parseLogicalName(logicalName, "page name");
  const candidate = candidates.find(
    (entry) => entry.logicalName === logicalName,
  );
  if (!candidate) {
    throw new CliError(`Page not found: ${logicalName}.`, {
      code: "TARGET_NOT_FOUND",
      scope: "project",
      path: logicalName.replaceAll(".", "/"),
    });
  }

  const messagesRoot = resolveInside(context.cwd, "messages");
  const preparedMessages: PreparedMessageRemoval[] = [];
  const preparedAggregators: PreparedAggregatorUpdate[] = [];
  if (context.fs.exists(messagesRoot)) {
    const locales = (await context.fs.list(messagesRoot))
      .filter((entry) => entry.isDirectory)
      .map((entry) => entry.name)
      .sort();
    for (const locale of locales) {
      const target = resolveInside(
        context.cwd,
        "messages",
        locale,
        `${candidate.routeSegments[0]}.json`,
      );
      if (!candidate.messageKey) {
        const aggregator = resolveInside(
          context.cwd,
          "messages",
          `${locale}.ts`,
        );
        if (!context.fs.exists(aggregator)) {
          throw new CliError(
            `Locale aggregator messages/${locale}.ts was not found.`,
            {
              code: "CONFIG_NOT_FOUND",
              scope: "project",
              path: `messages/${locale}.ts`,
            },
          );
        }
        const nextAggregator = unregisterMessagesFile(
          await context.fs.readText(aggregator),
          locale,
          candidate.routeSegments[0],
        );
        preparedMessages.push({
          target,
          keyPresent: context.fs.exists(target),
        });
        preparedAggregators.push({
          target: aggregator,
          ...nextAggregator,
        });
        continue;
      }
      if (!context.fs.exists(target)) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(await context.fs.readText(target)) as Record<
          string,
          unknown
        >;
      } catch {
        throw new CliError(
          `Invalid JSON prevents removal from ${path.relative(context.cwd, target)}.`,
          {
            code: "FILESYSTEM_ERROR",
            scope: "project",
            path: path.relative(context.cwd, target),
          },
        );
      }
      const keyPresent = Object.hasOwn(data, candidate.messageKey);
      if (keyPresent) delete data[candidate.messageKey];
      preparedMessages.push({
        target,
        keyPresent,
        content: `${JSON.stringify(data, null, 2)}\n`,
      });
    }
  }

  const gateway = new MutationGateway(context, context.cwd);
  for (const prepared of preparedMessages) {
    if (!candidate.messageKey) {
      await gateway.remove(prepared.target, { role: "translation-messages" });
    } else if (prepared.keyPresent) {
      await gateway.write(prepared.target, prepared.content!, {
        role: "translation-messages",
        detail: { removedKey: candidate.messageKey },
      });
    } else {
      gateway.unchanged(prepared.target, {
        role: "translation-messages",
        detail: { missingKey: candidate.messageKey },
      });
    }
  }
  for (const prepared of preparedAggregators) {
    if (prepared.changed) {
      await gateway.write(prepared.target, prepared.content, {
        role: "locale-aggregator",
      });
    } else {
      gateway.unchanged(prepared.target, { role: "locale-aggregator" });
    }
  }
  await gateway.remove(
    candidate.uiDirectory,
    {
      role: "page-ui",
      resource: "directory",
    },
    { recursive: true, force: false },
  );
  await gateway.remove(
    candidate.routeDirectory,
    {
      role: "page-route",
      resource: "directory",
    },
    { recursive: true, force: false },
  );

  const mutated = context.operations
    .snapshot()
    .some((event) => event.action === "deleted" || event.action === "updated");
  return commandResult(context, {
    command: "rmpage",
    summary: mutated
      ? `Deleted page "${logicalName}" and its associated resources.`
      : `No resources remained for page "${logicalName}".`,
    projectRoot: context.cwd,
    nextSteps: mutated
      ? [
          {
            kind: "run-checks",
            required: true,
            message: "Run the project checks after removing the page.",
            paths: [],
            commands: ["bun run check", "npm run check", "pnpm run check"],
          },
        ]
      : [],
  });
};
