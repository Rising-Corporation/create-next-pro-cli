// src/scaffold.ts

import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { red, green, cyan } from "./lib/helper/consoleColor";
import { CliError } from "./core/contracts";
import type { Terminal } from "./core/contracts";

/**
 * Options for scaffolding a Next.js project.
 */
export interface ScaffoldOptions {
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

interface ScaffoldRuntimeOptions {
  cwd?: string;
  templatePath?: string;
  terminal?: Terminal;
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
export async function scaffoldProject(
  options: ScaffoldOptions,
  runtime: ScaffoldRuntimeOptions = {},
) {
  const cwd = runtime.cwd ?? process.cwd();
  const terminal = runtime.terminal ?? console;
  const targetPath = join(cwd, options.projectName);

  const __dirname = new URL(".", import.meta.url); // or :
  // const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatePath =
    runtime.templatePath ??
    join(fileURLToPath(__dirname), "..", "templates", "Projects", "default");

  // Check if target directory exists
  if (existsSync(targetPath)) {
    if (options.force) {
      terminal.warn("⚠️ Target directory already exists, removing...");
      await rm(targetPath, { recursive: true, force: true });
    } else {
      terminal.error(
        red("[X] Target directory already exists. Use --force to overwrite."),
      );
      throw new CliError(
        "[X] Target directory already exists. Use --force to overwrite.",
      );
    }
  }

  try {
    terminal.log("Creating project directory...");
    await mkdir(targetPath, { recursive: true });

    terminal.log("Copying files from template...");
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

    terminal.log("Project setup complete!");
    terminal.log("");
    terminal.log("To get started:");
    terminal.log("    " + green(`cd ${options.projectName}`));
    terminal.log("");
    terminal.log(
      "Then install dependencies and launch the dev server with your preferred tool:",
    );

    terminal.log("    " + green(`bun install && bun dev`));
    terminal.log("    " + green(`npm install && npm run dev`));
    terminal.log("    " + green(`pnpm install && pnpm run dev`));
    terminal.log("");
    terminal.log("Documentation and examples can be found at:");
    terminal.log(
      "    " +
        cyan("https://github.com/Rising-Corporation/create-next-pro-cli"),
    );
    terminal.log(
      "_-`'-_-'`_`'-_-'`_`'-_-'`_`'-_-'`_`'-_-'`_`'-_-'`_`'-_-'`_`'-_-'`-_",
    );
  } catch (err) {
    // Affiche une croix ASCII et le texte en rouge si le terminal le supporte

    terminal.error(red("[X] Error during project creation:"), err);
    throw new CliError("[X] Error during project creation:");
  }
}
