import { join } from "node:path";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import prompts from "prompts";
import { capitalize } from "./utils"; // Assuming you have a utility function to capitalize strings
import { existsSync } from "node:fs";

export async function addComponent(args: string[]) {
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
      validate: (name: string) => (name ? true : "Component name is required"),
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
  const componentFile = join(componentTargetPath, `${componentNameUpper}.tsx`);

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
}
