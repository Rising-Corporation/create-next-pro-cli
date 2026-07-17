import path from "node:path";

import { completionCandidates } from "./cli/completion";
import { configDirectory, onboarding, readConfig } from "./cli/onboarding";
import { renderResult } from "./cli/output";
import { createCommandRegistry } from "./cli/registry";
import {
  CliError,
  type CliContext,
  type CommandResult,
  type ExitCode,
} from "./core/contracts";
import { commandResult, failedResult } from "./core/operations";
import { createProject } from "./lib/createProject";
import { createProjectWithPrompt } from "./lib/createProjectWithPrompt";
import { createNodeContext } from "./runtime/node-context";

export const HELP_TEXT = `create-next-pro

Usage:
  create-next-pro <project-name> [--force] [--json]
  create-next-pro addpage [options] [--json]
  create-next-pro addcomponent [options] [--json]
  create-next-pro addlib [name] [--json]
  create-next-pro addapi [name] [--json]
  create-next-pro addlanguage [locale] [--json]
  create-next-pro addtext <path> [text] [--json]
  create-next-pro rmpage [options] [--json]

Options:
  --help          Show this help message
  --version       Show the CLI version
  --json          Emit one deterministic JSON document
  --reconfigure   Run the configuration assistant again
`;

export function parseOptions(args: string[]) {
  return {
    force: args.includes("--force"),
    help: args.includes("--help"),
    version: args.includes("--version") || args.includes("-v"),
    reconfigure: args.includes("--reconfigure"),
    json: args.includes("--json"),
  };
}

function withoutGlobalOptions(args: string[]): string[] {
  return args.filter((argument) => argument !== "--json");
}

async function packageVersion(context: CliContext): Promise<string> {
  const packageJson = JSON.parse(
    await context.fs.readText(path.join(context.packageRoot, "package.json")),
  ) as { version: string };
  return packageJson.version;
}

function interactiveInputError(message: string, hint: string): never {
  throw new CliError(message, {
    code: "INTERACTIVE_INPUT_REQUIRED",
    hint,
  });
}

export async function executeCli(context: CliContext): Promise<CommandResult> {
  const options = parseOptions(context.argv);
  context.outputMode = options.json ? "json" : "human";
  const args = withoutGlobalOptions(context.argv);
  const version = await packageVersion(context);

  if (options.help) {
    return commandResult(context, {
      command: "help",
      summary: "Displayed create-next-pro help.",
      projectRoot: context.cwd,
      status: "success",
      data: { help: HELP_TEXT },
    });
  }
  if (options.version) {
    return commandResult(context, {
      command: "version",
      summary: `create-next-pro version ${version}.`,
      projectRoot: context.cwd,
      status: "success",
      data: { version },
    });
  }

  const config = await readConfig(context);
  if (options.reconfigure) {
    if (options.json) {
      interactiveInputError(
        "Reconfiguration is interactive and unavailable in JSON mode.",
        "Run create-next-pro --reconfigure without --json.",
      );
    }
    return onboarding(context, version);
  }
  if (!config) {
    if (options.json) {
      throw new CliError("Initial configuration is required.", {
        code: "ONBOARDING_REQUIRED",
        scope: "config",
        path: "config.json",
        hint: "Run create-next-pro once without --json, then rerun the command.",
      });
    }
    return onboarding(context, version);
  }

  const command = args[0];
  const handler = command ? createCommandRegistry().get(command) : undefined;
  if (handler) return handler(args, context);

  const nameArg = args.find(
    (argument) => !argument.startsWith("--") && argument !== "-v",
  );
  if (nameArg) return createProject(nameArg, options.force, context);
  if (options.json) {
    interactiveInputError(
      "A project name is required in JSON mode.",
      "Pass the project name as a positional argument.",
    );
  }
  return createProjectWithPrompt(context);
}

async function runCompletion(
  context: CliContext,
  args: string[],
): Promise<ExitCode> {
  try {
    for (const candidate of await completionCandidates(args[1], context)) {
      context.terminal.log(candidate);
    }
    return 0;
  } catch {
    return 1;
  }
}

export async function main(
  context: CliContext = createNodeContext(),
): Promise<ExitCode> {
  const completionArgs = withoutGlobalOptions(context.argv);
  if (completionArgs[0] === "__complete") {
    return runCompletion(context, completionArgs);
  }

  context.operations.reset();
  context.outputMode = parseOptions(context.argv).json ? "json" : "human";
  let result: CommandResult;
  try {
    result = await executeCli(context);
  } catch (error) {
    const command = completionArgs[0] ?? "create";
    result = failedResult(context, command, error, {
      projectRoot: context.cwd,
      configRoot: configDirectory(context),
      homeRoot: context.homeDir,
    });
  }
  renderResult(result, context, context.outputMode);
  return result.exitCode;
}
