import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import prompts from "prompts";
import { existsSync } from "node:fs";

import { loadConfig } from "./utils";

export async function addApi(args: string[]) {
  let apiName = args[1];
  if (!apiName || apiName.startsWith("-")) {
    const response = await prompts.prompt({
      type: "text",
      name: "apiName",
      message: "🔌 API route name to add:",
      validate: (name: string) => (name ? true : "API route name is required"),
    });
    apiName = response.apiName;
  }

  const config = await loadConfig();
  if (!config) {
    console.error(
      "❌ Configuration file cnp.config.json not found. Run this command from the project root.",
    );
    return;
  }

  const apiDir = join(process.cwd(), "src", "app", "api", apiName);
  if (!existsSync(apiDir)) {
    await mkdir(apiDir, { recursive: true });
  }

  const templateDir = join(
    new URL("..", import.meta.url).pathname,
    "templates",
    "Api",
  );
  const routeTemplate = join(templateDir, "route.ts");
  const routePath = join(apiDir, "route.ts");

  if (!existsSync(routePath)) {
    if (existsSync(routeTemplate)) {
      let content = await readFile(routeTemplate, "utf-8");
      content = content.replace(/template/g, apiName);
      await writeFile(routePath, content);
    } else {
      await writeFile(
        routePath,
        `import { NextResponse } from \"next/server\";\n\nexport async function GET() {\n  return NextResponse.json({ message: \"Hello from ${apiName}\" });\n}\n`,
      );
    }
    console.log(`📄 File created: ${routePath}`);
  } else {
    console.log(`ℹ️ File already exists: ${routePath}`);
  }

  console.log(`✅ API route "${apiName}" added.`);
}
