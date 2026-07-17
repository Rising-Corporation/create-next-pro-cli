import { scaffoldProject } from "../scaffold";
import type { ScaffoldOptions } from "../scaffold";
import type { CliContext, CommandResult } from "../core/contracts";
import { commandResult } from "../core/operations";

export async function createProjectFromOptions(
  options: ScaffoldOptions,
  context: CliContext,
): Promise<CommandResult> {
  const { projectRoot, copiedFiles, importAlias } = await scaffoldProject(
    options,
    {
      context,
    },
  );
  return commandResult(context, {
    command: "create",
    summary: `Created project "${options.projectName}" with ${copiedFiles} template files and import alias ${importAlias}; no package manager was pinned.`,
    projectRoot,
    nextSteps: [
      {
        kind: "install",
        required: true,
        message: "Install dependencies with your preferred package manager.",
        paths: [],
        commands: [
          `cd ${options.projectName} && bun install`,
          `cd ${options.projectName} && npm install`,
          `cd ${options.projectName} && pnpm install`,
        ],
      },
      {
        kind: "run-checks",
        required: true,
        message: "Run the generated project checks before development.",
        paths: [{ scope: "project", path: "package.json" }],
        commands: ["bun run check", "npm run check", "pnpm run check"],
      },
    ],
    data: {
      projectName: options.projectName,
      importAlias,
      packageManager: null,
      copiedFiles,
    },
  });
}

export async function createProject(
  nameArg: string,
  force: boolean,
  context: CliContext,
): Promise<CommandResult> {
  const response: ScaffoldOptions = {
    projectName: nameArg,
    useTypescript: true,
    useEslint: true,
    useTailwind: true,
    useSrcDir: true,
    useTurbopack: true,
    useI18n: true,
    customAlias: true,
    importAlias: "@/*",
    force,
  };

  return createProjectFromOptions(response, context);
}
