import { join } from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile, readdir } from "node:fs/promises";

import { loadConfig } from "./utils";

function defaultText(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function addText(args: string[]) {
  const pathArg = args[1];
  if (!pathArg) {
    console.error("❌ Dot path parameter is required.");
    return;
  }
  const providedText = args.slice(2).join(" ");

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

  const entries = await readdir(messagesPath, { withFileTypes: true });
  const locales = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const [fileName, ...segments] = pathArg.split(".");
  if (!fileName || segments.length === 0) {
    console.error("❌ Invalid dot path provided.");
    return;
  }
  const finalKey = segments[segments.length - 1];
  const text = providedText || defaultText(finalKey);

  for (const locale of locales) {
    const filePath = join(messagesPath, locale, `${fileName}.json`);
    let data: Record<string, any> = {};
    if (existsSync(filePath)) {
      const raw = await readFile(filePath, "utf-8");
      try {
        data = JSON.parse(raw) as Record<string, any>;
      } catch {}
    }
    let cursor = data;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!cursor[seg]) cursor[seg] = {};
      cursor = cursor[seg];
    }
    cursor[finalKey] = text;
    await writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`📄 File updated: ${filePath}`);
  }

  console.log(`✅ Text added at path "${pathArg}" with value "${text}".`);
}
