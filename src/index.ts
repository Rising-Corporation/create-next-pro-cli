import path from "node:path";

import { onboarding, readConfig } from "./cli/onboarding";
import { createCommandRegistry } from "./cli/registry";
import { CliError, type CliContext, type ExitCode } from "./core/contracts";
import { createProject } from "./lib/createProject";
import { createProjectWithPrompt } from "./lib/createProjectWithPrompt";
import { createNodeContext } from "./runtime/node-context";

export const HELP_TEXT = `create-next-pro

Usage:
  create-next-pro <project-name> [--force]
  create-next-pro addpage [options]
  create-next-pro addcomponent [options]
  create-next-pro addlib [name]
  create-next-pro addapi [name]
  create-next-pro addlanguage [locale]
  create-next-pro addtext <path> [text]
  create-next-pro rmpage [options]

Options:
  --help          Show this help message
  --version       Show the CLI version
  --reconfigure   Run the configuration assistant again
`;

export function parseOptions(args: string[]) {
  return {
    force: args.includes("--force"),
    help: args.includes("--help"),
    version: args.includes("--version") || args.includes("-v"),
    reconfigure: args.includes("--reconfigure"),
  };
}

async function packageVersion(context: CliContext): Promise<string> {
  const packageJson = JSON.parse(
    await context.fs.readText(path.join(context.packageRoot, "package.json")),
  ) as { version: string };
  return packageJson.version;
}

export async function main(
  context: CliContext = createNodeContext(),
): Promise<ExitCode> {
  try {
    const args = [...context.argv];
    const options = parseOptions(args);
    const version = await packageVersion(context);

    if (options.help) {
      context.terminal.log(HELP_TEXT);
      return 0;
    }
    if (options.version) {
      context.terminal.log(`v${version}`);
      return 0;
    }
    if (options.reconfigure || !(await readConfig(context))) {
      await onboarding(context, version);
      return 0;
    }

    if (args[0] === "addpage" && args.length === 1) args.push("-LPl");
    const handler = args[0] ? createCommandRegistry().get(args[0]) : undefined;
    if (handler) return (await handler(args, context)).exitCode;

    const nameArg = args.find((arg) => !arg.startsWith("--"));
    if (nameArg) {
      await createProject(nameArg, options.force, context);
      return 0;
    }

    await createProjectWithPrompt(context);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.terminal.error(message);
    return error instanceof CliError ? error.exitCode : 1;
  }
}
