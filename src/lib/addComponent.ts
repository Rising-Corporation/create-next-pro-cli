import { join } from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import {
  discoverPageCatalog,
  resolvePageCandidate,
} from "../core/page-catalog";
import {
  parseAreaOption,
  requirePageArea,
  type PageArea,
} from "../core/page-area";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import { capitalize, loadConfig, toIdentifier } from "./utils";

type PreparedMessages = {
  locale: string;
  target: string;
  content?: string;
  exists: boolean;
};

type ParsedAddComponentArguments = {
  area?: PageArea;
  componentName?: string;
  pageScope?: string;
};

function formatGeneratedTranslations(content: string): string {
  return content.replace(
    /^(\s*)(<(?:h2|p)\b[^>]*>)\{t\("([^"]+)"\)\}(<\/(?:h2|p)>)$/gm,
    (line, indent: string, opening: string, key: string, closing: string) =>
      line.length <= 80
        ? line
        : `${indent}${opening}\n${indent}  {t("${key}")}\n${indent}${closing}`,
  );
}

function parseAddComponentArguments(
  args: string[],
): ParsedAddComponentArguments {
  const parsedArea = parseAreaOption(args);
  let componentName: string | undefined;
  let pageScope: string | undefined;
  for (let index = 1; index < parsedArea.args.length; index += 1) {
    const argument = parsedArea.args[index];
    if (argument === "-P" || argument === "--page") {
      if (pageScope) {
        throw new CliError("The --page option can only be provided once.", {
          code: "INVALID_ARGUMENT",
        });
      }
      const value = parsedArea.args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new CliError("The --page option requires a page name.", {
          code: "INVALID_ARGUMENT",
        });
      }
      pageScope = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new CliError(`Unknown addcomponent option: ${argument}.`, {
        code: "INVALID_ARGUMENT",
      });
    }
    if (componentName) {
      throw new CliError(`Unexpected addcomponent argument: ${argument}.`, {
        code: "INVALID_ARGUMENT",
      });
    }
    componentName = argument;
  }
  if (pageScope && !parsedArea.area) {
    requirePageArea(parsedArea.area, "addcomponent --page");
  }
  if (!pageScope && parsedArea.area) {
    throw new CliError(
      "The --area option is only valid with addcomponent --page.",
      { code: "INVALID_ARGUMENT" },
    );
  }
  return { area: parsedArea.area, componentName, pageScope };
}

export const addComponent: CommandHandler = async (args, context) => {
  const parsed = parseAddComponentArguments(args);
  let { componentName } = parsed;
  const { area, pageScope } = parsed;
  if (!componentName) {
    if (context.outputMode === "json") {
      throw new CliError("Component name is required in JSON mode.", {
        code: "INTERACTIVE_INPUT_REQUIRED",
        hint: "Pass the component name after addcomponent.",
      });
    }
    const response = await context.prompt<"componentName">({
      type: "text",
      name: "componentName",
      message: "Component name to add:",
      validate: (name: string) => (name ? true : "Component name is required"),
    });
    componentName = String(response.componentName ?? "");
    if (!componentName) {
      context.operations.record({
        action: "cancelled",
        resource: "command",
        role: "component-creation",
        scope: "project",
        path: ".",
      });
      return commandResult(context, {
        command: "addcomponent",
        summary: "Component creation was cancelled.",
        projectRoot: context.cwd,
        status: "cancelled",
      });
    }
  }
  const componentSegments = parseLogicalName(componentName, "component name");
  if (componentSegments.length !== 1) {
    throw new CliError("Component names must contain exactly one segment.", {
      code: "INVALID_ARGUMENT",
    });
  }
  const pageSegments = pageScope
    ? parseLogicalName(pageScope, "page name")
    : [];
  const config = await loadConfig(context);
  if (!config) {
    throw new CliError("Configuration file cnp.config.json was not found.", {
      code: "CONFIG_NOT_FOUND",
      hint: "Run this command from the generated project root.",
    });
  }
  if (pageScope) {
    const catalog = await discoverPageCatalog(context.cwd, context.fs);
    resolvePageCandidate(catalog, pageScope, area!);
  }

  const componentNameUpper = capitalize(toIdentifier(componentName));
  const templateRoot = join(context.packageRoot, "templates", "Component");
  const componentTemplate = join(templateRoot, "Component.tsx");
  const messagesTemplate = join(templateRoot, "component.json");
  if (
    !context.fs.exists(componentTemplate) ||
    (config.useI18n && !context.fs.exists(messagesTemplate))
  ) {
    throw new CliError("Required component template files were not found.", {
      code: "TEMPLATE_MISSING",
      scope: "package",
      path: "templates/Component",
    });
  }

  const targetDirectory = pageScope
    ? join(context.cwd, "src", "ui", ...pageSegments)
    : join(context.cwd, "src", "ui", "_global");
  await assertSafeTarget(context.cwd, targetDirectory, context.fs);
  const componentFile = join(targetDirectory, `${componentNameUpper}.tsx`);
  const translationNamespace = pageScope ?? "_global_ui";
  const componentContent = formatGeneratedTranslations(
    (await context.fs.readText(componentTemplate))
      .replace(/Component/g, componentNameUpper)
      .replace(/componentPage/g, translationNamespace),
  );

  const preparedMessages: PreparedMessages[] = [];
  if (config.useI18n) {
    const messagesRoot = join(context.cwd, "messages");
    if (!context.fs.exists(messagesRoot)) {
      throw new CliError("The messages directory was not found.", {
        code: "CONFIG_NOT_FOUND",
        scope: "project",
        path: "messages",
      });
    }
    await assertSafeTarget(context.cwd, messagesRoot, context.fs);
    const templateMessages = JSON.parse(
      await context.fs.readText(messagesTemplate),
    ) as Record<string, unknown>;
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
    for (const locale of locales) {
      const messageFile = pageScope ? pageSegments[0] : "_global_ui";
      const target = join(messagesRoot, locale, `${messageFile}.json`);
      await assertSafeTarget(context.cwd, target, context.fs);
      let data: Record<string, unknown> = {};
      if (context.fs.exists(target)) {
        try {
          data = JSON.parse(await context.fs.readText(target)) as Record<
            string,
            unknown
          >;
        } catch {
          throw new CliError(
            `Invalid JSON in messages/${locale}/${messageFile}.json.`,
            {
              code: "FILESYSTEM_ERROR",
              scope: "project",
              path: `messages/${locale}/${messageFile}.json`,
            },
          );
        }
      }
      let container = data;
      if (pageSegments.length > 1) {
        const child = pageSegments[1];
        const current = data[child];
        if (
          current !== undefined &&
          (!current || typeof current !== "object" || Array.isArray(current))
        ) {
          throw new CliError(
            `Translation namespace ${pageScope} is not an object in ${locale}.`,
            {
              code: "INVALID_ARGUMENT",
              scope: "project",
              path: `messages/${locale}/${messageFile}.json`,
            },
          );
        }
        if (!current) data[child] = {};
        container = data[child] as Record<string, unknown>;
      }
      const exists = Object.hasOwn(container, componentNameUpper);
      if (!exists) container[componentNameUpper] = templateMessages;
      preparedMessages.push({
        locale,
        target,
        exists,
        content: exists ? undefined : `${JSON.stringify(data, null, 2)}\n`,
      });
    }
  }

  const gateway = new MutationGateway(context, context.cwd);
  await gateway.mkdir(targetDirectory, {
    role: "component-directory",
    resource: "directory",
    detail: area ? { area } : undefined,
  });
  await gateway.write(componentFile, componentContent, {
    role: "ui-component",
    preserveExisting: true,
    detail: area ? { area } : undefined,
  });
  for (const item of preparedMessages) {
    if (item.exists) {
      gateway.unchanged(item.target, {
        role: "translation-messages",
        detail: {
          ...(area ? { area } : {}),
          locale: item.locale,
          key: `${translationNamespace}.${componentNameUpper}`,
        },
      });
    } else {
      await gateway.write(item.target, item.content!, {
        role: "translation-messages",
        detail: {
          ...(area ? { area } : {}),
          locale: item.locale,
          key: `${translationNamespace}.${componentNameUpper}`,
        },
      });
    }
  }

  const mutated = context.operations
    .snapshot()
    .some((event) => event.action === "created" || event.action === "updated");
  return commandResult(context, {
    command: "addcomponent",
    summary: mutated
      ? `Added component "${componentNameUpper}" ${pageScope ? `to ${area} page "${pageScope}"` : "globally"}.`
      : pageScope
        ? `Component "${componentNameUpper}" already exists on ${area} page "${pageScope}" and was preserved.`
        : `Component "${componentNameUpper}" already exists and was preserved.`,
    projectRoot: context.cwd,
    data: pageScope
      ? { area, componentName: componentNameUpper, page: pageScope }
      : { componentName: componentNameUpper },
    nextSteps: mutated
      ? [
          {
            kind: "review",
            required: true,
            message:
              "Review the generated component and its localized messages.",
            paths: [
              { scope: "project", path: gateway.path(componentFile) },
              ...preparedMessages.map((item) => ({
                scope: "project" as const,
                path: gateway.path(item.target),
              })),
            ],
          },
          {
            kind: "run-checks",
            required: true,
            message: "Run the project checks.",
            paths: [],
            commands: ["bun run check", "npm run check", "pnpm run check"],
          },
        ]
      : [],
  });
};
