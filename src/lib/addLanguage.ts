import { join } from "node:path";
import { existsSync } from "node:fs";
import { cp, readFile, writeFile } from "node:fs/promises";
import prompts from "prompts";

import { loadConfig } from "./utils";
import { assertSafeTarget, parseLogicalName } from "../core/project-paths";

function generateLocales(): string[] {
  const dn = new Intl.DisplayNames(["en"], { type: "language" });
  const locales: string[] = [];
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(97 + i) + String.fromCharCode(97 + j);
      try {
        const name = dn.of(code);
        if (name && name.toLowerCase() !== code) {
          locales.push(code);
        }
      } catch {
        // Ignore values that are not recognized as language codes.
      }
    }
  }
  return locales.sort();
}

export async function addLanguage(args: string[], cwd = process.cwd()) {
  const config = await loadConfig(cwd);
  if (!config?.useI18n) {
    console.error("❌ i18n is not enabled in this project.");
    return;
  }
  const messagesPath = join(cwd, "messages");
  if (!existsSync(messagesPath)) {
    console.error("❌ Messages directory missing. Ensure i18n was configured.");
    return;
  }

  const available = generateLocales();
  let locale = args[1];
  if (!locale || !available.includes(locale)) {
    const response = await prompts({
      type: "autocomplete",
      name: "locale",
      message: "🌐 Locale to add:",
      choices: available.map((l) => ({ title: l, value: l })),
    });
    locale = response.locale;
  }
  if (!locale) return;
  parseLogicalName(locale, "locale");
  await assertSafeTarget(cwd, messagesPath);
  if (existsSync(join(messagesPath, locale))) {
    throw new Error(`Locale ${locale} already exists.`);
  }

  const routingFile = join(cwd, "src", "lib", "i18n", "routing.ts");
  const messagesRegistryFile = join(cwd, "src", "lib", "i18n", "messages.ts");
  if (!existsSync(routingFile)) {
    throw new Error("routing.ts not found. Are you in project root?");
  }
  if (!existsSync(messagesRegistryFile)) {
    throw new Error("messages.ts not found. Are you in project root?");
  }
  const routingContent = await readFile(routingFile, "utf-8");
  const defaultMatch = routingContent.match(/defaultLocale:\s*"([^"]+)"/);
  const defaultLocale = defaultMatch ? defaultMatch[1] : null;
  if (!defaultLocale || !existsSync(join(messagesPath, defaultLocale))) {
    throw new Error("Default locale not found.");
  }

  const defaultAggregatorFile = join(messagesPath, `${defaultLocale}.ts`);
  if (!existsSync(defaultAggregatorFile)) {
    throw new Error(`Default locale aggregator not found: ${defaultLocale}.ts`);
  }

  const localesMatch = routingContent.match(/locales:\s*\[([^\]]*)\]/);
  if (!localesMatch) {
    throw new Error("Unable to locate routing locales.");
  }
  const localesArr = localesMatch[1]
    .split(",")
    .map((s) => s.trim().replace(/["']/g, ""))
    .filter(Boolean);
  if (localesArr.includes(locale)) {
    throw new Error(`Locale ${locale} already exists in routing.`);
  }
  const newLocales = `locales: [${[...localesArr, locale]
    .map((item) => `"${item}"`)
    .join(", ")}]`;
  const nextRoutingContent = routingContent.replace(
    /locales:\s*\[[^\]]*\]/,
    newLocales,
  );

  const defaultAggregatorContent = await readFile(
    defaultAggregatorFile,
    "utf-8",
  );
  const defaultImportPrefix = `./${defaultLocale}/`;
  if (!defaultAggregatorContent.includes(defaultImportPrefix)) {
    throw new Error(
      `Default locale aggregator does not import from ${defaultImportPrefix}`,
    );
  }
  const nextAggregatorContent = defaultAggregatorContent.replaceAll(
    defaultImportPrefix,
    `./${locale}/`,
  );

  const messagesRegistryContent = await readFile(messagesRegistryFile, "utf-8");
  const registryMatch = messagesRegistryContent.match(
    /const messages = \{([^}]*)\} as const;/,
  );
  if (!registryMatch) {
    throw new Error("Unable to locate the typed messages registry.");
  }
  const registeredLocales = registryMatch[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (registeredLocales.includes(locale)) {
    throw new Error(`Locale ${locale} already exists in messages registry.`);
  }
  const registryDeclaration = `const messages = { ${[
    ...registeredLocales,
    locale,
  ].join(", ")} } as const;`;
  const declarationIndex = messagesRegistryContent.indexOf("const messages =");
  const nextMessagesRegistryContent =
    messagesRegistryContent.slice(0, declarationIndex) +
    `import ${locale} from "../../../messages/${locale}";\n\n` +
    messagesRegistryContent
      .slice(declarationIndex)
      .replace(/const messages = \{[^}]*\} as const;/, registryDeclaration);

  await cp(join(messagesPath, defaultLocale), join(messagesPath, locale), {
    recursive: true,
  });
  console.log(`📄 Directory created: ${join(messagesPath, locale)}`);
  await writeFile(join(messagesPath, `${locale}.ts`), nextAggregatorContent);
  console.log(`📄 File created: ${join(messagesPath, `${locale}.ts`)}`);
  await writeFile(messagesRegistryFile, nextMessagesRegistryContent);
  console.log(`📄 File updated: ${messagesRegistryFile}`);
  await writeFile(routingFile, nextRoutingContent);
  console.log(`📄 File updated: ${routingFile}`);

  console.log(
    `✅ Locale "${locale}" added and copied from default locale "${defaultLocale}".`,
  );
}
