import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CliError } from "./core/contracts";
import type { CliContext } from "./core/contracts";
import { MutationGateway } from "./core/operations";
import {
  normalizeImportAlias,
  validateProjectName,
} from "./core/project-paths";
import {
  copyTemplate,
  customizeGeneratedProject,
  validateScaffoldTemplate,
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
  context: CliContext;
  templatePath?: string;
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
  runtime: ScaffoldRuntimeOptions,
): Promise<{ projectRoot: string; copiedFiles: number; importAlias: string }> {
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
      { code: "INVALID_ARGUMENT" },
    );
  }
  const { context } = runtime;
  const cwd = context.cwd;
  const projectName = validateProjectName(options.projectName);
  const importAlias = normalizeImportAlias(
    options.customAlias === false ? "@/*" : options.importAlias || "@/*",
  );
  const targetPath = join(cwd, projectName);

  const __dirname = new URL(".", import.meta.url);
  const templatePath =
    runtime.templatePath ??
    join(fileURLToPath(__dirname), "..", "templates", "Projects", "default");
  const resolvedCwd = resolve(cwd);
  const resolvedTarget = resolve(targetPath);
  if (!resolvedTarget.startsWith(`${resolvedCwd}/`)) {
    throw new CliError(
      "The project destination must be a child of the current directory.",
      { code: "UNSAFE_PATH" },
    );
  }

  const gateway = new MutationGateway(context, targetPath);
  const manifest = await validateScaffoldTemplate(templatePath, context.fs);

  // Check if target directory exists
  if (context.fs.exists(targetPath)) {
    if (options.force) {
      if (context.outputMode === "human") {
        context.terminal.warn(
          `WARNING: --force will remove the existing project at ${targetPath}.`,
        );
      }
      await gateway.remove(
        targetPath,
        {
          role: "existing-project",
          resource: "project",
        },
        { recursive: true, force: true },
      );
    } else {
      throw new CliError(
        "Target directory already exists. Use --force to overwrite it.",
        {
          code: "TARGET_EXISTS",
          scope: "project",
          path: ".",
        },
      );
    }
  }

  await gateway.mkdir(targetPath, {
    resource: "project",
    role: "project-root",
  });

  await copyTemplate(templatePath, targetPath, context, gateway, manifest);
  await customizeGeneratedProject(
    targetPath,
    projectName,
    importAlias,
    context,
    gateway,
  );

  await gateway.write(
    join(targetPath, "cnp.config.json"),
    `${JSON.stringify({ ...options, projectName, importAlias }, null, 2)}\n`,
    {
      role: "project-configuration",
      resource: "configuration",
      detail: { importAlias, packageManager: "user-selected" },
    },
  );
  return { projectRoot: targetPath, copiedFiles: manifest.length, importAlias };
}
