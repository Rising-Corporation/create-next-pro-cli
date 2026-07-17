import { scaffoldProject } from "../scaffold";
import type { CliContext } from "../core/contracts";

export async function createProject(
  nameArg: string,
  force: boolean,
  context?: Pick<CliContext, "cwd" | "terminal">,
) {
  const response = {
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

  const terminal = context?.terminal ?? console;
  terminal.log(`Creating project "${response.projectName}"...`);
  await scaffoldProject(response, {
    cwd: context?.cwd ?? process.cwd(),
    terminal,
  });
}
