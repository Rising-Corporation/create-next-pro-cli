// src/index.ts

import * as prompts from "prompts";
import { scaffoldProject } from "@/scaffold";
import { mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Main CLI entry point for create-next-pro.
 *
 * Note: For now, the project behaves as if --force is always enabled and no creation prompt is taken into account.
 * All actions are performed directly without confirmation.
 */
export async function main() {
  console.log("🚀 Welcome to create-next-pro\n");

  let args = Bun.argv.slice(2);
  const force = args.includes("--force");
  // For now, --force is always considered enabled but do not overwrite existing projects
  // WARNING: if you enable --force it will overwrite existing projects. This is a temporary setting for development purposes.
  // const force = true;

  // If addpage is called without options, add default flags -LPl
  if (args[0] === "addpage" && args.length === 1) {
    args.push("-LPl");
  }

  /**
   * Handle addcomponent command: create a component in the correct location and update translation JSON.
   */
  if (args[0] === "addcomponent") {
    let componentName = args[1];
    let pageScope = null;
    let pageIndex = args.findIndex((arg) => arg === "-P" || arg === "--page");
    if (pageIndex !== -1 && args[pageIndex + 1]) {
      pageScope = args[pageIndex + 1];
    }

    // Handle nested pageScope (e.g. ParentPage.ChildPage)
    let nestedPath = null;
    if (pageScope && pageScope.includes(".")) {
      nestedPath = join(...pageScope.split("."));
    }

    if (!componentName || componentName.startsWith("-")) {
      // Si le nom n'est pas fourni ou est une option, demander via prompt
      const response = await prompts.prompt({
        type: "text",
        name: "componentName",
        message: "🧩 Component name to add:",
        validate: (name: string) =>
          name ? true : "Component name is required",
      });
      componentName = response.componentName;
    }

    const componentNameUpper = capitalize(componentName);
    const templatePath = join(import.meta.dir, "..", "templates", "Component");
    const messagesPath = join(process.cwd(), "messages");

    // Determine target path for the component
    let componentTargetPath;
    let translationKey;
    if (pageScope) {
      if (nestedPath) {
        componentTargetPath = join(process.cwd(), "src", "ui", nestedPath);
        translationKey = pageScope;
      } else {
        componentTargetPath = join(process.cwd(), "src", "ui", pageScope);
        translationKey = pageScope;
      }
    } else {
      componentTargetPath = join(process.cwd(), "src", "ui", "_global");
      translationKey = "_global_ui";
    }
    if (!existsSync(componentTargetPath)) {
      await mkdir(componentTargetPath, { recursive: true });
    }
    const componentFile = join(
      componentTargetPath,
      `${componentNameUpper}.tsx`
    );

    // Read and adapt the TSX template
    const templateComponentPath = join(templatePath, "Component.tsx");
    if (existsSync(templateComponentPath)) {
      let content = await readFile(templateComponentPath, "utf-8");
      // Remplacement du nom du component et de la clé de traduction
      content = content
        .replace(/Component/g, componentNameUpper)
        .replace(/componentPage/g, translationKey);
      await writeFile(componentFile, content);
      console.log(`📄 File created: ${componentFile}`);
    } else {
      console.error(
        "❌ Template Component.tsx introuvable :",
        templateComponentPath
      );
    }

    // Add the component to each language's JSON file (only folders)
    const entries = await readdir(messagesPath, { withFileTypes: true });
    const langDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const jsonTemplate = join(templatePath, "component.json");
    if (!existsSync(jsonTemplate)) {
      console.error("❌ Template component.json not found:", jsonTemplate);
      return;
    }
    const jsonContent = await readFile(jsonTemplate, "utf-8");
    const parsed = JSON.parse(jsonContent);

    for (const locale of langDirs) {
      // Only process if messages/<locale> is a directory
      const localeDir = join(messagesPath, locale);
      if (
        !existsSync(localeDir) ||
        !require("node:fs").statSync(localeDir).isDirectory()
      )
        continue;
      let jsonTarget;
      if (pageScope) {
        jsonTarget = join(messagesPath, locale, `${pageScope}.json`);
      } else {
        jsonTarget = join(messagesPath, locale, `_global_ui.json`);
      }

      let current: Record<string, any> = {};
      if (existsSync(jsonTarget)) {
        const jsonFile = await readFile(jsonTarget, "utf-8");
        current = JSON.parse(jsonFile) as Record<string, any>;
      }
      current[componentNameUpper] = parsed;
      await writeFile(jsonTarget, JSON.stringify(current, null, 2));
    }

    console.log(
      `✅ Component "${componentNameUpper}" added ${
        pageScope ? `to page ${pageScope}` : "globally"
      } with localized messages.`
    );
    return;
  }

  /**
   * Handle addpage command: create a page (nested or not) and update translation JSON.
   */
  if (args[0] === "addpage") {
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
    return;
  }

  /**
   * Handle rmpage command: remove a page and all related files/folders.
   */
  if (args[0] === "rmpage") {
    let pageName = args[1];
    if (!pageName || pageName.startsWith("-")) {
      const response = await prompts.prompt({
        type: "text",
        name: "pageName",
        message: "🗑️ Page name to remove:",
        validate: (name: string) => (name ? true : "Page name is required"),
      });
      pageName = response.pageName;
    }

    // Remove translation files messages/<lang>/<PageName>.json
    const messagesPath = join(process.cwd(), "messages");
    const entries = await readdir(messagesPath, { withFileTypes: true });
    const langDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    for (const locale of langDirs) {
      const jsonTarget = join(messagesPath, locale, `${pageName}.json`);
      if (existsSync(jsonTarget)) {
        await writeFile(jsonTarget, "");
        await import("node:child_process").then((cp) =>
          cp.execSync(`rm -f '${jsonTarget}'`)
        );
        console.log(`🗑️ Deleted: ${jsonTarget}`);
      }
    }

    // Remove folder src/ui/<PageName>
    const uiPageDir = join(process.cwd(), "src", "ui", pageName);
    if (existsSync(uiPageDir)) {
      await import("node:child_process").then((cp) =>
        cp.execSync(`rm -rf '${uiPageDir}'`)
      );
      console.log(`🗑️ Deleted: ${uiPageDir}`);
    }

    // Remove folder src/app/[locale]/<PageName>
    const appLocaleDir = join(
      process.cwd(),
      "src",
      "app",
      "[locale]",
      pageName
    );
    if (existsSync(appLocaleDir)) {
      await import("node:child_process").then((cp) =>
        cp.execSync(`rm -rf '${appLocaleDir}'`)
      );
      console.log(`🗑️ Deleted: ${appLocaleDir}`);
    }

    console.log(`✅ Page "${pageName}" deleted.`);
    return;
  }

  /**
   * Handle direct project creation if a name argument is provided.
   */
  const nameArg = args.find((arg) => !arg.startsWith("--"));

  if (nameArg) {
    const response = {
      projectName: nameArg,
      useTypescript: true,
      useEslint: true,
      useTailwind: true,
      useSrcDir: true,
      useTurbopack: true,
      useI18n: true,
      customAlias: false,
      importAlias: "@/*",
      force,
    };

    console.log(`📦 Creating project "${response.projectName}"...`);
    await scaffoldProject(response);
    return;
  }

  /**
   * Interactive prompt for project creation (not currently used, see note above).
   */
  const response = await prompts.prompt([
    {
      type: "text",
      name: "projectName",
      message: "🧱 Project name:",
      initial: "my-next-app",
    },
    {
      type: "toggle",
      name: "useTypescript",
      message: "✔ Use TypeScript?",
      initial: true,
      active: "Yes",
      inactive: "No",
    },
    {
      type: "toggle",
      name: "useEslint",
      message: "✔ Use ESLint?",
      initial: true,
      active: "Yes",
      inactive: "No",
    },
    {
      type: "toggle",
      name: "useTailwind",
      message: "✔ Use Tailwind CSS?",
      initial: true,
      active: "Yes",
      inactive: "No",
    },
    {
      type: "toggle",
      name: "useSrcDir",
      message: "✔ Use `src/` directory?",
      initial: false,
      active: "Yes",
      inactive: "No",
    },
    {
      type: "toggle",
      name: "useTurbopack",
      message: "✔ Use Turbopack for `next dev`?",
      initial: true,
      active: "Yes",
      inactive: "No",
    },
    {
      type: "toggle",
      name: "useI18n",
      message: "✔ Use i18n with next-intl for translations?",
      initial: true,
      active: "Yes",
      inactive: "No",
    },
    {
      type: "toggle",
      name: "customAlias",
      message: "✔ Customize import alias (`@/*` by default)?",
      initial: false,
      active: "Yes",
      inactive: "No",
    },
    {
      type: (prev: boolean) => (prev ? "text" : null),
      name: "importAlias",
      message: "✔ What import alias would you like?",
      initial: "@core/*",
    },
  ]);

  console.log("\n✅ Your choices:");
  console.log(response);

  await scaffoldProject(response);
}

/**
 * Capitalize the first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Map a key to its corresponding file name for page/component templates.
 * @param key string
 * @returns file name string
 */
function toFileName(key: string): string {
  switch (key) {
    case "layout":
      return "layout.tsx";
    case "page":
      return "page.tsx";
    case "loading":
      return "loading.tsx";
    case "not-found":
      return "not-found.tsx";
    case "error":
      return "error.tsx";
    case "global-error":
      return "global-error.tsx";
    case "route":
      return "route.ts";
    case "template":
      return "template.tsx";
    case "default":
      return "default.tsx";
    default:
      return `${key}.tsx`;
  }
}
