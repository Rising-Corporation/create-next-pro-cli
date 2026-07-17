import { join } from "node:path";

import { CliError, type CommandHandler } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";
import { loadConfig } from "./utils";

function generateLocales(): string[] {
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  const locales: string[] = [];
  for (let first = 0; first < 26; first++) {
    for (let second = 0; second < 26; second++) {
      const code = String.fromCharCode(97 + first, 97 + second);
      try {
        const name = names.of(code);
        if (name && name.toLowerCase() !== code) locales.push(code);
      } catch {
        // Unknown ISO-like codes are not offered.
      }
    }
  }
  return locales.sort();
}

async function listFiles(
  context: Parameters<CommandHandler>[1],
  root: string,
): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string, relative = ""): Promise<void> {
    for (const entry of await context.fs.list(directory)) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink) {
        throw new CliError(`Symbolic link found in locale source: ${next}`, {
          code: "UNSAFE_PATH",
          scope: "project",
          path: next,
        });
      }
      if (entry.isDirectory) await visit(join(directory, entry.name), next);
      else if (entry.isFile) files.push(next);
    }
  }
  await visit(root);
  return files.sort();
}

export const addLanguage: CommandHandler = async (args, context) => {
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

  const available = generateLocales();
  let locale = args[1];
  if (!locale) {
    if (context.outputMode === "json") {
      throw new CliError("Locale is required in JSON mode.", {
        code: "INTERACTIVE_INPUT_REQUIRED",
        hint: "Pass a two-letter locale after addlanguage.",
      });
    }
    const response = await context.prompt<"locale">({
      type: "autocomplete",
      name: "locale",
      message: "Locale to add:",
      choices: available.map((value) => ({ title: value, value })),
    });
    locale = String(response.locale ?? "");
    if (!locale) {
      context.operations.record({
        action: "cancelled",
        resource: "command",
        role: "locale-creation",
        scope: "project",
        path: ".",
      });
      return commandResult(context, {
        command: "addlanguage",
        summary: "Locale creation was cancelled.",
        projectRoot: context.cwd,
        status: "cancelled",
      });
    }
  }
  parseLogicalName(locale, "locale");
  if (!available.includes(locale)) {
    throw new CliError(`Unsupported locale code: ${locale}.`, {
      code: "INVALID_ARGUMENT",
      hint: "Use a recognized two-letter language code.",
    });
  }

  const routingFile = join(context.cwd, "src", "lib", "i18n", "routing.ts");
  const registryFile = join(context.cwd, "src", "lib", "i18n", "messages.ts");
  if (!context.fs.exists(routingFile) || !context.fs.exists(registryFile)) {
    throw new CliError(
      "Required i18n routing or registry file was not found.",
      {
        code: "CONFIG_NOT_FOUND",
        scope: "project",
        path: "src/lib/i18n",
      },
    );
  }

  const routing = await context.fs.readText(routingFile);
  const defaultLocale = routing.match(/defaultLocale:\s*["']([^"']+)["']/)?.[1];
  if (!defaultLocale) {
    throw new CliError(
      "The default locale could not be resolved from routing.ts.",
      {
        code: "CONFIG_NOT_FOUND",
        scope: "project",
        path: "src/lib/i18n/routing.ts",
      },
    );
  }
  const sourceDirectory = join(messagesRoot, defaultLocale);
  const sourceAggregator = join(messagesRoot, `${defaultLocale}.ts`);
  if (!context.fs.exists(sourceDirectory)) {
    throw new CliError(
      `Default locale directory ${defaultLocale} was not found.`,
      {
        code: "CONFIG_NOT_FOUND",
        scope: "project",
        path: `messages/${defaultLocale}`,
      },
    );
  }
  if (!context.fs.exists(sourceAggregator)) {
    throw new CliError("Default locale aggregator not found.", {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: `messages/${defaultLocale}.ts`,
    });
  }
  const sourceFiles = await listFiles(context, sourceDirectory);
  if (sourceFiles.length === 0) {
    throw new CliError(`Default locale ${defaultLocale} contains no files.`, {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: `messages/${defaultLocale}`,
    });
  }
  const defaultAggregator = await context.fs.readText(sourceAggregator);
  const importPrefix = `./${defaultLocale}/`;
  if (!defaultAggregator.includes(importPrefix)) {
    throw new CliError(
      `Default aggregator does not import from ${importPrefix}.`,
      {
        code: "CONFIG_NOT_FOUND",
        scope: "project",
        path: `messages/${defaultLocale}.ts`,
      },
    );
  }

  const localesMatch = routing.match(/locales:\s*\[([^\]]*)\]/);
  if (!localesMatch) {
    throw new CliError("Unable to locate routing locales.", {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: "src/lib/i18n/routing.ts",
    });
  }
  const routingLocales = localesMatch[1]
    .split(",")
    .map((value) => value.trim().replace(/["']/g, ""))
    .filter(Boolean);
  const registry = await context.fs.readText(registryFile);
  const registryMatch = registry.match(
    /const messages = \{([^}]*)\} as const;/,
  );
  if (!registryMatch) {
    throw new CliError("Unable to locate the typed messages registry.", {
      code: "CONFIG_NOT_FOUND",
      scope: "project",
      path: "src/lib/i18n/messages.ts",
    });
  }
  const registeredLocales = registryMatch[1]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const targetDirectory = join(messagesRoot, locale);
  const targetAggregator = join(messagesRoot, `${locale}.ts`);
  const targetAggregatorExists = context.fs.exists(targetAggregator);
  const targetAggregatorContent = targetAggregatorExists
    ? await context.fs.readText(targetAggregator)
    : "";
  const state = {
    directory: context.fs.exists(targetDirectory),
    aggregator: targetAggregatorExists,
    aggregatorImportsLocale: targetAggregatorContent.includes(`./${locale}/`),
    routing: routingLocales.includes(locale),
    registry: registeredLocales.includes(locale),
    registryImport: new RegExp(
      `import\\s+${locale}\\s+from\\s+["']\\.\\.\\/\\.\\.\\/\\.\\.\\/messages\\/${locale}["'];`,
    ).test(registry),
  };
  const present = Object.values(state).filter(Boolean).length;
  const gateway = new MutationGateway(context, context.cwd);
  const missingLocaleFiles = state.directory
    ? sourceFiles.filter(
        (relative) => !context.fs.exists(join(targetDirectory, relative)),
      )
    : sourceFiles;
  if (
    present === Object.keys(state).length &&
    missingLocaleFiles.length === 0
  ) {
    gateway.unchanged(targetDirectory, {
      role: "locale-directory",
      resource: "directory",
    });
    for (const relative of sourceFiles) {
      gateway.unchanged(join(targetDirectory, relative), {
        role: relative.endsWith(".json")
          ? "translation-messages"
          : "locale-file",
        detail: { locale, sourceLocale: defaultLocale },
      });
    }
    gateway.unchanged(targetAggregator, { role: "locale-aggregator" });
    gateway.unchanged(routingFile, { role: "i18n-routing" });
    gateway.unchanged(registryFile, { role: "messages-registry" });
    return commandResult(context, {
      command: "addlanguage",
      summary: `Locale "${locale}" is already fully configured.`,
      projectRoot: context.cwd,
    });
  }
  if (present > 0 || missingLocaleFiles.length < sourceFiles.length) {
    throw new CliError(`Locale ${locale} is only partially configured.`, {
      code: "INCONSISTENT_LOCALE",
      scope: "project",
      path: `messages/${locale}`,
      hint: `Observed state: ${JSON.stringify({ ...state, missingLocaleFiles })}.`,
    });
  }

  const nextAggregator = defaultAggregator.replaceAll(
    importPrefix,
    `./${locale}/`,
  );
  const nextRouting = routing.replace(
    /locales:\s*\[[^\]]*\]/,
    `locales: [${[...routingLocales, locale].map((value) => `"${value}"`).join(", ")}]`,
  );
  const declarationIndex = registry.indexOf("const messages =");
  const nextRegistry =
    registry.slice(0, declarationIndex) +
    `import ${locale} from "../../../messages/${locale}";\n\n` +
    registry
      .slice(declarationIndex)
      .replace(
        /const messages = \{[^}]*\} as const;/,
        `const messages = { ${[...registeredLocales, locale].join(", ")} } as const;`,
      );

  await assertSafeTarget(context.cwd, targetDirectory, context.fs);
  await gateway.mkdir(targetDirectory, {
    role: "locale-directory",
    resource: "directory",
    detail: { locale, sourceLocale: defaultLocale },
  });
  for (const relative of sourceFiles) {
    const source = join(sourceDirectory, relative);
    const target = join(targetDirectory, relative);
    await gateway.copy(source, target, {
      role: relative.endsWith(".json") ? "translation-messages" : "locale-file",
      source: { scope: "project", path: gateway.path(source) },
      detail: { locale, sourceLocale: defaultLocale },
    });
  }
  await gateway.write(targetAggregator, nextAggregator, {
    role: "locale-aggregator",
  });
  await gateway.write(registryFile, nextRegistry, {
    role: "messages-registry",
  });
  await gateway.write(routingFile, nextRouting, { role: "i18n-routing" });

  const translationPaths = sourceFiles
    .filter((relative) => relative.endsWith(".json"))
    .map((relative) => ({
      scope: "project" as const,
      path: gateway.path(join(targetDirectory, relative)),
    }));
  return commandResult(context, {
    command: "addlanguage",
    summary: `Added locale "${locale}" by copying ${sourceFiles.length} files from "${defaultLocale}".`,
    projectRoot: context.cwd,
    nextSteps: [
      {
        kind: "translate",
        required: true,
        message: `Translate every copied message from ${defaultLocale} to ${locale}; the copied text is not ready for delivery.`,
        paths: translationPaths,
      },
      {
        kind: "run-checks",
        required: true,
        message: "Run the project checks.",
        paths: [],
        commands: ["bun run check", "npm run check", "pnpm run check"],
      },
    ],
  });
};
