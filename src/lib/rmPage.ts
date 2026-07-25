import path from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import {
  discoverPageCatalog,
  resolvePageCandidate,
  type PageCandidate,
} from "../core/page-catalog";
import {
  parseAreaOption,
  requirePageArea,
  type PageArea,
} from "../core/page-area";
import {
  assertSafeTarget,
  parseLogicalName,
  resolveInside,
} from "../core/project-paths";
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
  const escapedFileName = escapeRegExp(fileName);
  const escapedPath = escapeRegExp(`./${locale}/${fileName}.json`);
  const importPattern = new RegExp(
    `^import\\s+${escapedIdentifier}\\s+from\\s+["']${escapedPath}["'];?\\r?\\n?`,
    "m",
  );
  const propertyExpression =
    identifier === fileName
      ? escapedIdentifier
      : `(?:["']${escapedFileName}["']\\s*:\\s*)?${escapedIdentifier}`;
  const propertyPattern = new RegExp(
    `^\\s*${propertyExpression},\\s*\\r?\\n?`,
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

function parseRmPageArguments(args: string[]): {
  area?: PageArea;
  logicalName?: string;
} {
  const parsedArea = parseAreaOption(args);
  let logicalName: string | undefined;
  for (const argument of parsedArea.args.slice(1)) {
    if (argument.startsWith("-")) {
      throw new CliError(`Unknown rmpage option: ${argument}.`, {
        code: "INVALID_ARGUMENT",
      });
    }
    if (logicalName) {
      throw new CliError(`Unexpected rmpage argument: ${argument}.`, {
        code: "INVALID_ARGUMENT",
      });
    }
    logicalName = argument;
  }
  return { area: parsedArea.area, logicalName };
}

export const rmPage: CommandHandler = async (args, context) => {
  const parsed = parseRmPageArguments(args);
  const catalog = await discoverPageCatalog(context.cwd, context.fs);
  let { area, logicalName } = parsed;
  let candidate: PageCandidate;
  if (!logicalName) {
    if (context.outputMode === "json") {
      throw new CliError("Page name is required in JSON mode.", {
        code: "INTERACTIVE_INPUT_REQUIRED",
        hint: "Pass a page name returned by completion after rmpage.",
      });
    }
    const candidates = area
      ? catalog.candidates.filter((entry) => entry.area === area)
      : catalog.candidates;
    if (candidates.length === 0) {
      const issue = catalog.issues[0];
      if (issue) {
        throw new CliError(
          `Page route "${issue.logicalName}" is inconsistent.`,
          {
            code: "INCONSISTENT_ROUTE",
            scope: "project",
            path: issue.routeDirectories.join(", "),
            hint: "Move the route into exactly one of the (public) or (user) areas before retrying.",
          },
        );
      }
      throw new CliError(
        area
          ? `No pages were found in the ${area} area.`
          : "No removable pages were found.",
        { code: "TARGET_NOT_FOUND", scope: "project", path: "." },
      );
    }
    const selected = await context.prompt<"page" | "confirm">([
      {
        type: "autocomplete",
        name: "page",
        message: "Page to remove:",
        choices: candidates.map((candidate) => ({
          title: `${candidate.area[0].toUpperCase()}${candidate.area.slice(1)} > ${candidate.logicalName.replaceAll(".", " > ")}`,
          value: candidate.id,
        })),
      },
      {
        type: (value: string) => (value ? "confirm" : null),
        name: "confirm",
        message: "Confirm page deletion?",
        initial: false,
      },
    ]);
    const selectedId = String(selected.page ?? "");
    const selectedCandidate = candidates.find(
      (entry) => entry.id === selectedId,
    );
    if (!selected.confirm) {
      context.operations.record({
        action: "cancelled",
        resource: "command",
        role: "page-removal",
        scope: "project",
        path: ".",
        detail: selectedCandidate
          ? { area: selectedCandidate.area }
          : area
            ? { area }
            : undefined,
      });
      return commandResult(context, {
        command: "rmpage",
        summary: selectedCandidate
          ? `Deletion of ${selectedCandidate.area} page "${selectedCandidate.logicalName}" was cancelled.`
          : area
            ? `Page deletion in the ${area} area was cancelled.`
            : "Page deletion was cancelled.",
        projectRoot: context.cwd,
        status: "cancelled",
        data: selectedCandidate
          ? {
              area: selectedCandidate.area,
              logicalName: selectedCandidate.logicalName,
            }
          : area
            ? { area }
            : undefined,
      });
    }
    if (!selectedCandidate) {
      throw new CliError("The selected page is not in the page catalog.", {
        code: "INVALID_ARGUMENT",
      });
    }
    candidate = selectedCandidate;
    logicalName = candidate.logicalName;
    area = candidate.area;
  } else {
    area = requirePageArea(area, "rmpage");
    parseLogicalName(logicalName, "page name");
    candidate = resolvePageCandidate(catalog, logicalName, area);
  }

  area = requirePageArea(area, "rmpage");

  const messagesRoot = resolveInside(context.cwd, "messages");
  await assertSafeTarget(context.cwd, candidate.uiDirectory, context.fs);
  await assertSafeTarget(context.cwd, candidate.routeDirectory, context.fs);
  const preparedMessages: PreparedMessageRemoval[] = [];
  const preparedAggregators: PreparedAggregatorUpdate[] = [];
  if (context.fs.exists(messagesRoot)) {
    await assertSafeTarget(context.cwd, messagesRoot, context.fs);
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
      await assertSafeTarget(context.cwd, target, context.fs);
      if (!candidate.messageKey) {
        const aggregator = resolveInside(
          context.cwd,
          "messages",
          `${locale}.ts`,
        );
        await assertSafeTarget(context.cwd, aggregator, context.fs);
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
      await gateway.remove(prepared.target, {
        role: "translation-messages",
        detail: { area },
      });
    } else if (prepared.keyPresent) {
      await gateway.write(prepared.target, prepared.content!, {
        role: "translation-messages",
        detail: { area, removedKey: candidate.messageKey },
      });
    } else {
      gateway.unchanged(prepared.target, {
        role: "translation-messages",
        detail: { area, missingKey: candidate.messageKey },
      });
    }
  }
  for (const prepared of preparedAggregators) {
    if (prepared.changed) {
      await gateway.write(prepared.target, prepared.content, {
        role: "locale-aggregator",
        detail: { area },
      });
    } else {
      gateway.unchanged(prepared.target, {
        role: "locale-aggregator",
        detail: { area },
      });
    }
  }
  await gateway.remove(
    candidate.uiDirectory,
    {
      role: "page-ui",
      resource: "directory",
      detail: { area },
    },
    { recursive: true, force: false },
  );
  await gateway.remove(
    candidate.routeDirectory,
    {
      role: "page-route",
      resource: "directory",
      detail: { area },
    },
    { recursive: true, force: false },
  );

  const mutated = context.operations
    .snapshot()
    .some((event) => event.action === "deleted" || event.action === "updated");
  return commandResult(context, {
    command: "rmpage",
    summary: mutated
      ? `Deleted ${area} page "${logicalName}" and its associated resources.`
      : `No resources remained for ${area} page "${logicalName}".`,
    projectRoot: context.cwd,
    data: { area, logicalName },
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
