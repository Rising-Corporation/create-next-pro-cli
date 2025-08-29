import { join } from "node:path";
import { existsSync } from "node:fs";
import { cp, readFile, writeFile } from "node:fs/promises";
import prompts from "prompts";

import { loadConfig } from "./utils";

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
      } catch {}
    }
  }
  return locales.sort();
}

export async function addLanguage(args: string[]) {
  const config = await loadConfig();
  if (!config?.useI18n) {
    console.error("❌ i18n is not enabled in this project.");
    return;
  }
  const messagesPath = join(process.cwd(), "messages");
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
  if (existsSync(join(messagesPath, locale))) {
    console.error(`❌ Locale ${locale} already exists.`);
    return;
  }

  const routingFile = join(process.cwd(), "src", "lib", "i18n", "routing.ts");
  if (!existsSync(routingFile)) {
    console.error("❌ routing.ts not found. Are you in project root?");
    return;
  }
  const routingContent = await readFile(routingFile, "utf-8");
  const defaultMatch = routingContent.match(/defaultLocale:\s*"([^"]+)"/);
  const defaultLocale = defaultMatch ? defaultMatch[1] : null;
  if (!defaultLocale || !existsSync(join(messagesPath, defaultLocale))) {
    console.error("❌ Default locale not found.");
    return;
  }

  await cp(join(messagesPath, defaultLocale), join(messagesPath, locale), {
    recursive: true,
  });
  console.log(`📄 Directory created: ${join(messagesPath, locale)}`);

  const localesMatch = routingContent.match(/locales:\s*\[([^\]]*)\]/);
  if (localesMatch) {
    const localesArr = localesMatch[1]
      .split(",")
      .map((s) => s.trim().replace(/["']/g, ""))
      .filter(Boolean);
    if (!localesArr.includes(locale)) {
      localesArr.push(locale);
      const newLocales = `locales: [${localesArr.map((l) => `"${l}"`).join(", " )}]`;
      const newContent = routingContent.replace(/locales:\s*\[[^\]]*\]/, newLocales);
      await writeFile(routingFile, newContent);
      console.log(`📄 File updated: ${routingFile}`);
    }
  }

  console.log(
    `✅ Locale "${locale}" added and copied from default locale "${defaultLocale}".`,
  );
}
