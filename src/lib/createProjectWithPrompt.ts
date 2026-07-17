import type { ScaffoldOptions } from "../scaffold";
import type { CliContext, CommandResult } from "../core/contracts";
import { commandResult } from "../core/operations";
import { createProjectFromOptions } from "./createProject";

export async function createProjectWithPrompt(
  context: CliContext,
): Promise<CommandResult> {
  const response = await context.prompt<keyof ScaffoldOptions>([
    {
      type: "text",
      name: "projectName",
      message: "Project name:",
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
      initial: true,
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
      initial: true,
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

  if (!response.projectName) {
    context.operations.record({
      action: "cancelled",
      resource: "command",
      role: "project-creation",
      scope: "project",
      path: ".",
    });
    return commandResult(context, {
      command: "create",
      summary: "Project creation was cancelled.",
      projectRoot: context.cwd,
      status: "cancelled",
    });
  }

  const options = response as unknown as ScaffoldOptions;
  return createProjectFromOptions(options, context);
}
