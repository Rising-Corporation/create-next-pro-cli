// src/scaffold.ts

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { red, green, cyan } from "./lib/helper/consoleColor";
import { CliError } from "./core/contracts";
import type { Terminal } from "./core/contracts";
import {
  normalizeImportAlias,
  validateProjectName,
} from "./core/project-paths";
import {
  copyTemplate,
  customizeGeneratedProject,
} from "./core/template-manifest";

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
  const requiredFeatures: Array<keyof ScaffoldOptions> = [
    "useTypescript",
    "useEslint",
    "useTailwind",
    "useSrcDir",
    "useTurbopack",
    "useI18n",
  ];
  const unsupported = requiredFeatures.filter(
    (feature) => options[feature] !== true,
  );
  if (unsupported.length > 0) {
    throw new CliError(
      `The default Next.js 16 template requires: ${unsupported.join(", ")}.`,
    );
  }
  const cwd = runtime.cwd ?? process.cwd();
  const terminal = runtime.terminal ?? console;
  const projectName = validateProjectName(options.projectName);
  const importAlias = normalizeImportAlias(
    options.customAlias === false ? "@/*" : options.importAlias || "@/*",
  );
  const targetPath = join(cwd, projectName);

  const __dirname = new URL(".", import.meta.url); // or :
  // const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatePath =
    runtime.templatePath ??
    join(fileURLToPath(__dirname), "..", "templates", "Projects", "default");
  const resolvedCwd = resolve(cwd);
  const resolvedTarget = resolve(targetPath);
  if (!resolvedTarget.startsWith(`${resolvedCwd}/`)) {
    throw new CliError(
      "The project destination must be a child of the current directory.",
    );
  }

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
    await copyTemplate(templatePath, targetPath);
    await customizeGeneratedProject(targetPath, projectName, importAlias);

    // Write CLI configuration to project root
    await writeFile(
      join(targetPath, "cnp.config.json"),
      `${JSON.stringify({ ...options, projectName, importAlias }, null, 2)}\n`,
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
