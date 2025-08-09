import { join } from "node:path";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import prompts from "prompts";
import { capitalize, toFileName } from "./utils"; // Assuming you have a utility function to capitalize strings
import { existsSync } from "node:fs";

export async function addPage(args: string[]) {
  let pageName = args[1];
  if (!pageName || pageName.startsWith("-")) {
    const response = await prompts.prompt({
      type: "text",
      name: "pageName",
      message: "📝 Page name to add:",
      validate: (name: string) => (name ? true : "Page name is required"),
    });
    pageName = response.pageName;
  }

  // Handle nested pages
  let parentName = null;
  let childName = null;
  if (pageName.includes(".")) {
    [parentName, childName] = pageName.split(".");
  }

  let shortFlags = args.find((arg) => /^-[A-Za-z]+$/.test(arg));
  let longFlags = new Set(args.filter((a) => a.startsWith("--")));
  const flags = new Set<string>();

  if (!shortFlags && Array.from(longFlags).length === 0) {
    shortFlags = "-LPl";
  }

  if (shortFlags) {
    for (const char of shortFlags.slice(1)) {
      switch (char) {
        case "L":
          flags.add("layout");
          break;
        case "P":
          flags.add("page");
          break;
        case "l":
          flags.add("loading");
          break;
        case "n":
          flags.add("not-found");
          break;
        case "e":
          flags.add("error");
          break;
        case "g":
          flags.add("global-error");
          break;
        case "r":
          flags.add("route");
          break;
        case "t":
          flags.add("template");
          break;
        case "d":
          flags.add("default");
          break;
      }
    }
  }

  for (const flag of [
    "layout",
    "page",
    "loading",
    "not-found",
    "error",
    "global-error",
    "route",
    "template",
    "default",
  ]) {
    if (longFlags.has("--" + flag)) flags.add(flag);
  }

  const srcPath = join(process.cwd(), "src", "app", "[locale]");
  const messagesPath = join(process.cwd(), "messages");
  const templatePath = join(import.meta.dir, "..", "templates", "Page");
  const entries = await readdir(messagesPath, { withFileTypes: true });
  const locales = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  // Create folders/files for nested or simple page
  let uiPageDir, localePagePath, jsonFileName;
  if (parentName && childName) {
    uiPageDir = join(process.cwd(), "src", "ui", parentName, childName);
    localePagePath = join(srcPath, parentName, childName);
    jsonFileName = parentName;
  } else {
    uiPageDir = join(process.cwd(), "src", "ui", pageName);
    localePagePath = join(srcPath, pageName);
    jsonFileName = pageName;
  }
  if (!existsSync(uiPageDir)) {
    await mkdir(uiPageDir, { recursive: true });
  }
  const uiPageFile = join(uiPageDir, "page-ui.tsx");
  const uiPageTemplate = join(templatePath, "page-ui.tsx");
  if (existsSync(uiPageTemplate)) {
    let uiContent = await readFile(uiPageTemplate, "utf-8");
    uiContent = uiContent
      .replace(/template/g, childName || pageName)
      .replace(/Template/g, capitalize(childName || pageName));
    await writeFile(uiPageFile, uiContent);
    console.log(`📄 File created: ${uiPageFile}`);
  } else {
    console.warn("⚠️ Template page-ui.tsx manquant.");
  }
  if (!existsSync(localePagePath)) {
    await mkdir(localePagePath, { recursive: true });
  }
  for (const flag of flags) {
    const filename = toFileName(flag);
    const src = join(templatePath, filename);
    const dst = join(localePagePath, filename);
    if (!existsSync(src)) {
      console.warn(`⚠️ Missing template file: ${filename}`);
      continue;
    }
    const content = await readFile(src, "utf-8");
    const replaced = content
      .replace(/template/g, childName || pageName)
      .replace(/Template/g, capitalize(childName || pageName));
    await writeFile(dst, replaced);
    console.log(`📄 File created: ${dst}`);
  }

  // Add JSON to parent object if nested, otherwise create a simple file
  const jsonTemplate = join(templatePath, "page.json");
  if (!existsSync(jsonTemplate)) {
    console.warn("⚠️ Missing template page.json.");
  }
  const content = await readFile(jsonTemplate, "utf-8");
  const replaced = content
    .replace(/template/g, childName || pageName)
    .replace(/Template/g, capitalize(childName || pageName));
  for (const locale of locales) {
    // Only process if messages/<locale> is a directory
    const localeDir = join(messagesPath, locale);
    if (
      !existsSync(localeDir) ||
      !require("node:fs").statSync(localeDir).isDirectory()
    )
      continue;
    const jsonTarget = join(messagesPath, locale, `${jsonFileName}.json`);
    let current: Record<string, any> = {};
    if (existsSync(jsonTarget)) {
      const jsonFile = await readFile(jsonTarget, "utf-8");
      try {
        current = JSON.parse(jsonFile) as Record<string, any>;
      } catch {
        current = {};
      }
    }
    if (parentName && childName) {
      current[childName] = JSON.parse(replaced);
    } else {
      // fichier simple
      current = JSON.parse(replaced);
    }
    await writeFile(jsonTarget, JSON.stringify(current, null, 2));
  }

  console.log(`✅ Page "${pageName}" with templates added for each locale.`);
}
