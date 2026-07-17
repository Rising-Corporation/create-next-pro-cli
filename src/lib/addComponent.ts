import { join } from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import { capitalize, loadConfig, toIdentifier } from "./utils";

type PreparedMessages = {
  locale: string;
  target: string;
  content?: string;
  exists: boolean;
};

export const addComponent: CommandHandler = async (args, context) => {
  let componentName = args[1];
  const pageIndex = args.findIndex(
    (argument) => argument === "-P" || argument === "--page",
  );
  const pageScope = pageIndex >= 0 ? args[pageIndex + 1] : undefined;
  if (pageIndex >= 0 && !pageScope) {
    throw new CliError("The --page option requires a page name.", {
      code: "INVALID_ARGUMENT",
    });
  }
  if (!componentName || componentName.startsWith("-")) {
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
  const componentContent = (await context.fs.readText(componentTemplate))
    .replace(/Component/g, componentNameUpper)
    .replace(/componentPage/g, translationNamespace);

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
  });
  await gateway.write(componentFile, componentContent, {
    role: "ui-component",
    preserveExisting: true,
  });
  for (const item of preparedMessages) {
    if (item.exists) {
      gateway.unchanged(item.target, {
        role: "translation-messages",
        detail: {
          locale: item.locale,
          key: `${translationNamespace}.${componentNameUpper}`,
        },
      });
    } else {
      await gateway.write(item.target, item.content!, {
        role: "translation-messages",
        detail: {
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
      ? `Added component "${componentNameUpper}" ${pageScope ? `to page "${pageScope}"` : "globally"}.`
      : `Component "${componentNameUpper}" already exists and was preserved.`,
    projectRoot: context.cwd,
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
