import { join } from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import {
  assertConsistentLogicalRoute,
  discoverPageCatalog,
} from "../core/page-catalog";
import {
  areaRouteGroup,
  parseAreaOption,
  requirePageArea,
  type PageArea,
} from "../core/page-area";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import {
  capitalize,
  configuredAliasPrefix,
  loadConfig,
  toFileName,
  toIdentifier,
} from "./utils";

const LONG_FLAGS = [
  "layout",
  "page",
  "loading",
  "not-found",
  "error",
  "global-error",
  "route",
  "template",
  "default",
] as const;

const SHORT_FLAGS: Record<string, (typeof LONG_FLAGS)[number]> = {
  L: "layout",
  P: "page",
  l: "loading",
  n: "not-found",
  e: "error",
  g: "global-error",
  r: "route",
  t: "template",
  d: "default",
};

function registerMessagesFile(
  content: string,
  locale: string,
  fileName: string,
): string {
  const importPath = `./${locale}/${fileName}.json`;
  const declarationIndex = content.indexOf("const messages =");
  const registryMatch = content.match(/const messages = \{([\s\S]*?)\n\};/);
  if (declarationIndex < 0 || !registryMatch) {
    throw new CliError(
      `Unable to register ${fileName}.json in messages/${locale}.ts.`,
      {
        code: "CONFIG_NOT_FOUND",
        scope: "project",
        path: `messages/${locale}.ts`,
      },
    );
  }
  const identifier = toIdentifier(fileName);
  const property =
    identifier === fileName
      ? `  ${identifier},`
      : `  ${JSON.stringify(fileName)}: ${identifier},`;
  if (content.includes(importPath)) {
    if (registryMatch[1].split(/\r?\n/).includes(property)) return content;
    const legacyProperty = new RegExp(`^\\s*${identifier},\\s*$`, "m");
    if (legacyProperty.test(registryMatch[1])) {
      return content.replace(legacyProperty, property);
    }
    const nextRegistry = registryMatch[0].replace(
      /\n\};$/,
      `\n${property}\n};`,
    );
    return content.replace(registryMatch[0], nextRegistry);
  }
  const importStatement = `import ${identifier} from "${importPath}";\n`;
  const nextRegistry = registryMatch[0].replace(/\n\};$/, `\n${property}\n};`);
  return (
    content.slice(0, declarationIndex) +
    importStatement +
    content.slice(declarationIndex).replace(registryMatch[0], nextRegistry)
  );
}

function selectedFlags(optionArguments: string[]): Set<string> {
  const selected = new Set<string>();
  if (optionArguments.length === 0)
    return new Set(["layout", "page", "loading"]);
  for (const argument of optionArguments) {
    if (argument.startsWith("--")) {
      const flag = argument.slice(2);
      if (!(LONG_FLAGS as readonly string[]).includes(flag)) {
        throw new CliError(`Unknown addpage option: ${argument}.`, {
          code: "INVALID_ARGUMENT",
        });
      }
      selected.add(flag);
      continue;
    }
    for (const character of argument.slice(1)) {
      const flag = SHORT_FLAGS[character];
      if (!flag) {
        throw new CliError(`Unknown addpage short option: -${character}.`, {
          code: "INVALID_ARGUMENT",
        });
      }
      selected.add(flag);
    }
  }
  return selected;
}

type ParsedAddPageArguments = {
  area?: PageArea;
  logicalName?: string;
  flags: Set<string>;
};

function parseAddPageArguments(args: string[]): ParsedAddPageArguments {
  const parsedArea = parseAreaOption(args);
  let logicalName: string | undefined;
  const optionArguments: string[] = [];
  for (const argument of parsedArea.args.slice(1)) {
    if (argument.startsWith("-")) {
      optionArguments.push(argument);
      continue;
    }
    if (logicalName) {
      throw new CliError(`Unexpected addpage argument: ${argument}.`, {
        code: "INVALID_ARGUMENT",
      });
    }
    logicalName = argument;
  }
  return {
    area: parsedArea.area,
    logicalName,
    flags: selectedFlags(optionArguments),
  };
}

type PreparedLocale = {
  locale: string;
  target: string;
  targetContent?: string;
  messageExists: boolean;
  aggregator: string;
  aggregatorContent: string;
};

export const addPage: CommandHandler = async (args, context) => {
  const parsed = parseAddPageArguments(args);
  let { area, logicalName } = parsed;
  if (!logicalName) {
    if (context.outputMode === "json") {
      throw new CliError("Page name is required in JSON mode.", {
        code: "INTERACTIVE_INPUT_REQUIRED",
        hint: "Pass a simple or Parent.Child page name after addpage.",
      });
    }
    const questions = [
      {
        type: "text",
        name: "pageName" as const,
        message: "Page name to add:",
        validate: (name: string) => (name ? true : "Page name is required"),
      },
      ...(!area
        ? [
            {
              type: "select",
              name: "area" as const,
              message: "Page area:",
              choices: [
                { title: "public", value: "public" },
                { title: "user", value: "user" },
              ],
            },
          ]
        : []),
    ];
    const response = await context.prompt<"pageName" | "area">(questions);
    logicalName = String(response.pageName ?? "");
    area = area ?? (response.area as PageArea | undefined);
    if (!logicalName || !area) {
      context.operations.record({
        action: "cancelled",
        resource: "command",
        role: "page-creation",
        scope: "project",
        path: ".",
      });
      return commandResult(context, {
        command: "addpage",
        summary: "Page creation was cancelled.",
        projectRoot: context.cwd,
        status: "cancelled",
      });
    }
  } else {
    area = requirePageArea(area, "addpage");
  }
  area = requirePageArea(area, "addpage");
  const pageSegments = parseLogicalName(logicalName, "page name");
  if (pageSegments.length > 2) {
    throw new CliError("Nested pages support exactly Parent.Child.", {
      code: "INVALID_ARGUMENT",
    });
  }
  const flags = parsed.flags;
  const config = await loadConfig(context);
  if (!config) {
    throw new CliError("Configuration file cnp.config.json was not found.", {
      code: "CONFIG_NOT_FOUND",
      hint: "Run this command from the generated project root.",
    });
  }

  const useI18n = Boolean(config.useI18n);
  const aliasPrefix = configuredAliasPrefix(config);
  const appRoot = join(
    context.cwd,
    "src",
    "app",
    ...(useI18n ? ["[locale]"] : []),
  );
  if (!context.fs.exists(appRoot)) {
    throw new CliError("The expected App Router directory was not found.", {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: useI18n ? "src/app/[locale]" : "src/app",
    });
  }
  const areaRoot = join(appRoot, areaRouteGroup(area));
  if (!context.fs.exists(areaRoot)) {
    throw new CliError(`The ${area} page area was not found.`, {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: join(
        useI18n ? "src/app/[locale]" : "src/app",
        areaRouteGroup(area),
      ),
    });
  }

  const [parentName, childName] =
    pageSegments.length === 2 ? pageSegments : [undefined, undefined];
  const leafName = childName ?? pageSegments[0];
  const pageIdentifier = capitalize(toIdentifier(leafName));
  const jsonFileName = parentName ?? leafName;
  const uiDirectory = join(context.cwd, "src", "ui", ...pageSegments);
  const routeDirectory = join(areaRoot, ...pageSegments);
  const catalog = await discoverPageCatalog(context.cwd, context.fs);
  assertConsistentLogicalRoute(catalog, logicalName);
  const existingOtherArea = catalog.candidates.find(
    (candidate) =>
      candidate.logicalName === logicalName && candidate.area !== area,
  );
  const otherArea: PageArea = area === "public" ? "user" : "public";
  const otherAreaDirectory = join(
    appRoot,
    areaRouteGroup(otherArea),
    ...pageSegments,
  );
  if (existingOtherArea || context.fs.exists(otherAreaDirectory)) {
    throw new CliError(
      `Page "${logicalName}" already belongs to the ${otherArea} area.`,
      {
        code: "TARGET_EXISTS",
        scope: "project",
        path: join(
          useI18n ? "src/app/[locale]" : "src/app",
          areaRouteGroup(otherArea),
          ...pageSegments,
        ),
      },
    );
  }
  const legacyDirectory = join(appRoot, ...pageSegments);
  if (context.fs.exists(legacyDirectory)) {
    throw new CliError(`Page route "${logicalName}" is ungrouped.`, {
      code: "INCONSISTENT_ROUTE",
      scope: "project",
      path: join(useI18n ? "src/app/[locale]" : "src/app", ...pageSegments),
      hint: "Move the route into exactly one of the (public) or (user) areas before retrying.",
    });
  }
  await assertSafeTarget(context.cwd, uiDirectory, context.fs);
  await assertSafeTarget(context.cwd, routeDirectory, context.fs);

  const templateRoot = join(context.packageRoot, "templates", "Page");
  const uiTemplate = join(
    templateRoot,
    area === "user" ? "page-ui.user.tsx" : "page-ui.tsx",
  );
  const routeTemplates = [...flags].map((flag) => ({
    flag,
    source: join(templateRoot, toFileName(flag)),
  }));
  const messagesTemplate = join(templateRoot, "page.json");
  const requiredTemplates = [
    uiTemplate,
    ...routeTemplates.map((entry) => entry.source),
  ];
  if (useI18n) requiredTemplates.push(messagesTemplate);
  const missing = requiredTemplates.find(
    (target) => !context.fs.exists(target),
  );
  if (missing) {
    throw new CliError(`Required page template was not found: ${missing}.`, {
      code: "TEMPLATE_MISSING",
      scope: "package",
      path: missing.replace(`${context.packageRoot}/`, ""),
    });
  }

  const translationNamespace = parentName
    ? `${parentName}.${childName}`
    : leafName;
  const templateJson = useI18n
    ? JSON.parse(
        (await context.fs.readText(messagesTemplate))
          .replace(/template/g, leafName)
          .replace(/Template/g, capitalize(leafName)),
      )
    : undefined;
  const preparedLocales: PreparedLocale[] = [];
  if (useI18n) {
    const messagesRoot = join(context.cwd, "messages");
    if (!context.fs.exists(messagesRoot)) {
      throw new CliError("The messages directory was not found.", {
        code: "CONFIG_NOT_FOUND",
        scope: "project",
        path: "messages",
      });
    }
    await assertSafeTarget(context.cwd, messagesRoot, context.fs);
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
      const target = join(messagesRoot, locale, `${jsonFileName}.json`);
      const aggregator = join(messagesRoot, `${locale}.ts`);
      await assertSafeTarget(context.cwd, target, context.fs);
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
      let data: Record<string, unknown> = {};
      const targetExists = context.fs.exists(target);
      if (targetExists) {
        try {
          data = JSON.parse(await context.fs.readText(target)) as Record<
            string,
            unknown
          >;
        } catch {
          throw new CliError(
            `Invalid JSON in messages/${locale}/${jsonFileName}.json.`,
            {
              code: "FILESYSTEM_ERROR",
              scope: "project",
              path: `messages/${locale}/${jsonFileName}.json`,
            },
          );
        }
      }
      const messageExists = parentName
        ? Object.hasOwn(data, childName!)
        : targetExists;
      if (!messageExists) {
        if (parentName) data[childName!] = templateJson;
        else data = templateJson as Record<string, unknown>;
      }
      const aggregatorCurrent = await context.fs.readText(aggregator);
      preparedLocales.push({
        locale,
        target,
        targetContent: messageExists
          ? undefined
          : `${JSON.stringify(data, null, 2)}\n`,
        messageExists,
        aggregator,
        aggregatorContent: registerMessagesFile(
          aggregatorCurrent,
          locale,
          jsonFileName,
        ),
      });
    }
  }

  const gateway = new MutationGateway(context, context.cwd);
  await gateway.mkdir(uiDirectory, {
    role: "page-ui-directory",
    resource: "directory",
    detail: { area },
  });
  const uiFile = join(uiDirectory, "page-ui.tsx");
  const uiContent = (await context.fs.readText(uiTemplate))
    .replace(
      'useTranslations("template")',
      `useTranslations("${translationNamespace}")`,
    )
    .replaceAll('from "@/', `from "${aliasPrefix}/`)
    .replace(/template/g, pageIdentifier)
    .replace(/Template/g, pageIdentifier);
  await gateway.write(uiFile, uiContent, {
    role: "page-ui",
    preserveExisting: true,
    detail: { area },
  });

  await gateway.mkdir(routeDirectory, {
    role: "page-route-directory",
    resource: "directory",
    detail: { area },
  });
  for (const template of routeTemplates) {
    const filename = toFileName(template.flag);
    const target = join(routeDirectory, filename);
    const uiImportPath = pageSegments.join("/");
    const content = (await context.fs.readText(template.source))
      .replace("@/ui/template/", `@/ui/${uiImportPath}/`)
      .replaceAll('from "@/', `from "${aliasPrefix}/`)
      .replace(/template/g, pageIdentifier)
      .replace(/Template/g, pageIdentifier);
    await gateway.write(target, content, {
      role: `page-${template.flag}`,
      preserveExisting: true,
      detail: { area },
    });
  }

  if (useI18n) {
    for (const item of preparedLocales) {
      if (item.messageExists) {
        gateway.unchanged(item.target, {
          role: "translation-messages",
          detail: {
            area,
            locale: item.locale,
            namespace: translationNamespace,
          },
        });
      } else {
        await gateway.write(item.target, item.targetContent!, {
          role: "translation-messages",
          detail: {
            area,
            locale: item.locale,
            namespace: translationNamespace,
          },
        });
      }
      await gateway.write(item.aggregator, item.aggregatorContent, {
        role: "locale-aggregator",
        detail: { area },
      });
    }
  } else {
    gateway.skipped(join(context.cwd, "messages"), {
      role: "translation-messages",
      resource: "directory",
      detail: { area, reason: "Internationalization is disabled." },
    });
  }

  const mutated = context.operations
    .snapshot()
    .some((event) =>
      ["created", "updated", "copied", "deleted"].includes(event.action),
    );
  const reviewPaths = [
    { scope: "project" as const, path: gateway.path(uiFile) },
    ...routeTemplates.map((template) => ({
      scope: "project" as const,
      path: gateway.path(join(routeDirectory, toFileName(template.flag))),
    })),
    ...preparedLocales.map((item) => ({
      scope: "project" as const,
      path: gateway.path(item.target),
    })),
  ];
  return commandResult(context, {
    command: "addpage",
    summary: mutated
      ? `Added ${area} page "${logicalName}" and its missing resources.`
      : `${area[0].toUpperCase()}${area.slice(1)} page "${logicalName}" already exists and was preserved.`,
    projectRoot: context.cwd,
    data: { area, logicalName },
    nextSteps: mutated
      ? [
          {
            kind: "review",
            required: true,
            message:
              "Review the generated page UI, route files and localized messages.",
            paths: reviewPaths,
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
