// src/scaffold.ts

import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Options for scaffolding a Next.js project.
 */
interface ScaffoldOptions {
  projectName: string;
  useTypescript: boolean;
  useEslint: boolean;
  useTailwind: boolean;
  useSrcDir: boolean;
  useTurbopack: boolean;
  useI18n: boolean;
  customAlias: boolean;
  importAlias: string;
  force?: boolean;
}

/**
 * Scaffold a new Next.js project based on provided options.
 *
 * - Copies the default template to the target directory
 * - Removes the target directory if it exists and --force is set
 * - Optionally customizes the structure in future (e.g. remove unused files)
 *
 * @param options ScaffoldOptions for the project
 */
export async function scaffoldProject(options: ScaffoldOptions) {
  const targetPath = join(process.cwd(), options.projectName);
  const templatePath = join(
    import.meta.dir,
    "..",
    "templates",
    "Projects",
    "default",
  );

  // Check if target directory exists
  if (existsSync(targetPath)) {
    if (options.force) {
      console.warn("⚠️ Target directory already exists, removing...");
      await rm(targetPath, { recursive: true, force: true });
    } else {
      console.error(
        "❌ Target directory already exists. Use --force to overwrite.",
      );
      process.exit(1);
    }
  }

  try {
    console.log("📁 Creating project directory...");
    await mkdir(targetPath, { recursive: true });

    console.log("📦 Copying files from template...");
    await cp(templatePath, targetPath, { recursive: true });

    // Apply configuration: add dependencies or files based on prompt choices
    const pkgPath = join(targetPath, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
      pkg.dependencies = pkg.dependencies || {};
      if (options.useI18n) {
        pkg.dependencies["next-intl"] =
          pkg.dependencies["next-intl"] || "^4.3.5";
      }
      await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
    }

    // Write CLI configuration to project root
    await writeFile(
      join(targetPath, "cnp.config.json"),
      JSON.stringify(options, null, 2),
    );

    console.log("✅ Project scaffolded successfully!");
    console.log(`➡️  cd ${options.projectName} && bun install && bun dev`);
  } catch (err) {
    console.error("❌ Error during scaffolding:", err);
    process.exit(1);
  }
}
