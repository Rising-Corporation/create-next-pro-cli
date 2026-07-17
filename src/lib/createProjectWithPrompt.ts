import { scaffoldProject } from "../scaffold";
import type { ScaffoldOptions } from "../scaffold";
import type { CliContext } from "../core/contracts";

export async function createProjectWithPrompt(context: CliContext) {
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

  const options = response as unknown as ScaffoldOptions;
  context.terminal.log("\nYour choices:");
  context.terminal.log(options);

  await scaffoldProject(options, {
    cwd: context.cwd,
    terminal: context.terminal,
  });
}
