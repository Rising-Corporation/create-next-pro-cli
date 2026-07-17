import { join } from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import { loadConfig } from "./utils";

function defaultText(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

type PreparedTextFile = {
  locale: string;
  file: string;
  data: Record<string, unknown>;
  replaced: boolean;
};

export const addText: CommandHandler = async (args, context) => {
  const pathArg = args[1];
  if (!pathArg) {
    throw new CliError("Translation dot path is required.", {
      code: "INVALID_ARGUMENT",
      hint: "Use addtext domain.key followed by an optional value.",
    });
  }
  const segments = parseLogicalName(pathArg, "translation path");
  if (segments.length < 2) {
    throw new CliError("Translation path must contain a file and a key.", {
      code: "INVALID_ARGUMENT",
    });
  }
  const providedText = args.slice(2).join(" ");
  const finalKey = segments.at(-1)!;
  const text = providedText || defaultText(finalKey);

  const config = await loadConfig(context);
  if (!config?.useI18n) {
    throw new CliError("Internationalization is not enabled in this project.", {
      code: "I18N_DISABLED",
    });
  }
  const messagesRoot = join(context.cwd, "messages");
  if (!context.fs.exists(messagesRoot)) {
    throw new CliError("The messages directory was not found.", {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: "messages",
    });
  }
  const locales = (await context.fs.list(messagesRoot))
    .filter((entry) => entry.isDirectory)
    .map((entry) => entry.name)
    .sort();
  if (locales.length === 0) {
    throw new CliError("No locale directories were found.", {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: "messages",
    });
  }

  const [fileName, ...keySegments] = segments;
  const prepared: PreparedTextFile[] = [];
  for (const locale of locales) {
    const file = join(messagesRoot, locale, `${fileName}.json`);
    await assertSafeTarget(context.cwd, file, context.fs);
    const existed = context.fs.exists(file);
    let data: Record<string, unknown> = {};
    if (existed) {
      try {
        const parsed = JSON.parse(await context.fs.readText(file)) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("root value is not an object");
        }
        data = parsed as Record<string, unknown>;
      } catch (error) {
        throw new CliError(
          `Invalid JSON in messages/${locale}/${fileName}.json.`,
          {
            code: "FILESYSTEM_ERROR",
            scope: "project",
            path: `messages/${locale}/${fileName}.json`,
            hint: error instanceof Error ? error.message : undefined,
          },
        );
      }
    }
    let cursor = data;
    for (const segment of keySegments.slice(0, -1)) {
      const current = cursor[segment];
      if (current === undefined) cursor[segment] = {};
      else if (
        !current ||
        typeof current !== "object" ||
        Array.isArray(current)
      ) {
        throw new CliError(
          `Translation segment "${segment}" is not an object in ${locale}.`,
          {
            code: "INVALID_ARGUMENT",
            scope: "project",
            path: `messages/${locale}/${fileName}.json`,
          },
        );
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
    const previous = cursor[finalKey];
    cursor[finalKey] = text;
    prepared.push({
      locale,
      file,
      data,
      replaced: previous !== undefined && previous !== text,
    });
  }

  const gateway = new MutationGateway(context, context.cwd);
  for (const item of prepared) {
    await gateway.write(item.file, `${JSON.stringify(item.data, null, 2)}\n`, {
      role: "translation-messages",
      detail: {
        locale: item.locale,
        key: pathArg,
        replaced: item.replaced,
      },
    });
  }
  const mutated = context.operations
    .snapshot()
    .some((event) => event.action === "created" || event.action === "updated");
  const nextSteps = mutated
    ? [
        ...(locales.length > 1
          ? [
              {
                kind: "translate" as const,
                required: true,
                message:
                  "Review the value in every locale; the same text was written to all locale files.",
                paths: prepared.map((item) => ({
                  scope: "project" as const,
                  path: gateway.path(item.file),
                })),
              },
            ]
          : []),
        {
          kind: "run-checks" as const,
          required: true,
          message: "Run the project checks.",
          paths: [],
          commands: ["bun run check", "npm run check", "pnpm run check"],
        },
      ]
    : [];
  return commandResult(context, {
    command: "addtext",
    summary: mutated
      ? `Set translation "${pathArg}" to "${text}" in ${locales.length} locale files.`
      : `Translation "${pathArg}" already has value "${text}" in every locale.`,
    projectRoot: context.cwd,
    nextSteps,
  });
};
