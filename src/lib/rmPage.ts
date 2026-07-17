import { join } from "node:path";
import { writeFile, readdir } from "node:fs/promises";
import prompts from "prompts";
import { existsSync } from "node:fs";

export async function rmPage(args: string[], cwd = process.cwd()) {
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
  const messagesPath = join(cwd, "messages"); // No template path used here, so no change needed
  const entries = await readdir(messagesPath, { withFileTypes: true });
  const langDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  for (const locale of langDirs) {
    const jsonTarget = join(messagesPath, locale, `${pageName}.json`);
    if (existsSync(jsonTarget)) {
      await writeFile(jsonTarget, "");
      await import("node:child_process").then((cp) =>
        cp.execSync(`rm -f '${jsonTarget}'`),
      );
      console.log(`🗑️ Deleted: ${jsonTarget}`);
    }
  }

  // Remove folder src/ui/<PageName>
  const uiPageDir = join(cwd, "src", "ui", pageName);
  if (existsSync(uiPageDir)) {
    await import("node:child_process").then((cp) =>
      cp.execSync(`rm -rf '${uiPageDir}'`),
    );
    console.log(`🗑️ Deleted: ${uiPageDir}`);
  }

  // Remove folder src/app/[locale]/<PageName>
  const appLocaleDir = join(cwd, "src", "app", "[locale]", pageName);
  if (existsSync(appLocaleDir)) {
    await import("node:child_process").then((cp) =>
      cp.execSync(`rm -rf '${appLocaleDir}'`),
    );
    console.log(`🗑️ Deleted: ${appLocaleDir}`);
  }

  console.log(`✅ Page "${pageName}" deleted.`);
}
