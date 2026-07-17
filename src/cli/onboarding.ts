import path from "node:path";

import type { CliContext, CommandResult } from "../core/contracts";
import { commandResult, MutationGateway } from "../core/operations";

export type UserConfig = {
  version: 1;
  shell: "bash" | "zsh";
  completionInstalled: boolean;
  createdAt: string;
  updatedAt: string;
};

export function configDirectory(context: CliContext): string {
  return context.env.XDG_CONFIG_HOME
    ? path.join(context.env.XDG_CONFIG_HOME, "create-next-pro")
    : path.join(context.homeDir, ".config", "create-next-pro");
}

export function configFile(context: CliContext): string {
  return path.join(configDirectory(context), "config.json");
}

export async function readConfig(
  context: CliContext,
): Promise<UserConfig | null> {
  try {
    const config = JSON.parse(
      await context.fs.readText(configFile(context)),
    ) as UserConfig;
    if (
      config.version !== 1 ||
      (config.shell !== "bash" && config.shell !== "zsh") ||
      typeof config.completionInstalled !== "boolean" ||
      typeof config.createdAt !== "string" ||
      typeof config.updatedAt !== "string"
    ) {
      return null;
    }
    return config;
  } catch {
    return null;
  }
}

async function ensureLineInRc(
  context: CliContext,
  target: string,
  line: string,
): Promise<"created" | "updated" | "unchanged"> {
  const current = context.fs.exists(target)
    ? await context.fs.readText(target)
    : "";
  const gateway = new MutationGateway(context, context.homeDir, "home");
  return gateway.write(
    target,
    current.includes(line) ? current : `${current}\n${line}\n`,
    { role: "shell-profile", resource: "shell-profile" },
  );
}

async function installCompletion(
  context: CliContext,
  shell: UserConfig["shell"],
): Promise<void> {
  const directory = configDirectory(context);
  const source = path.join(
    context.packageRoot,
    shell === "zsh"
      ? "create-next-pro-completion.zsh"
      : "create-next-pro-completion.sh",
  );
  const target = path.join(
    directory,
    `completion.${shell === "zsh" ? "zsh" : "sh"}`,
  );
  const gateway = new MutationGateway(context, directory, "config");
  await gateway.write(target, await context.fs.readText(source), {
    role: "completion-script",
    source: { scope: "package", path: path.basename(source) },
  });
  const rcFile = path.join(
    context.homeDir,
    shell === "zsh" ? ".zshrc" : ".bashrc",
  );
  await ensureLineInRc(context, rcFile, `source "${target}"`);
}

export async function onboarding(
  context: CliContext,
  version: string,
): Promise<CommandResult> {
  const response = await context.prompt<"shell" | "completion">(
    [
      {
        type: "select",
        name: "shell",
        message: "Which shell do you use?",
        choices: [
          { title: "zsh", value: "zsh" },
          { title: "bash", value: "bash" },
        ],
        initial: context.env.SHELL?.includes("zsh") ? 0 : 1,
      },
      {
        type: "toggle",
        name: "completion",
        message: "Install autocompletion?",
        initial: true,
        active: "Yes",
        inactive: "No",
      },
    ],
    { onCancel: () => false },
  );

  if (response.shell !== "bash" && response.shell !== "zsh") {
    context.operations.record({
      action: "cancelled",
      resource: "command",
      role: "onboarding",
      scope: "config",
      path: ".",
    });
    return commandResult(context, {
      command: "onboarding",
      summary: "Configuration was cancelled.",
      configRoot: configDirectory(context),
      homeRoot: context.homeDir,
      status: "cancelled",
    });
  }

  const previous = await readConfig(context);
  const now = new Date().toISOString();
  const config: UserConfig = {
    version: 1,
    shell: response.shell,
    completionInstalled: Boolean(response.completion),
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  if (config.completionInstalled) {
    try {
      await installCompletion(context, config.shell);
    } catch (error) {
      context.operations.record({
        action: "skipped",
        resource: "file",
        role: "completion-installation",
        scope: "config",
        path: `completion.${config.shell === "zsh" ? "zsh" : "sh"}`,
        detail: {
          reason: error instanceof Error ? error.message : String(error),
        },
      });
      config.completionInstalled = false;
    }
  }

  const semanticallyUnchanged =
    previous?.shell === config.shell &&
    previous.completionInstalled === config.completionInstalled;
  if (semanticallyUnchanged && previous) config.updatedAt = previous.updatedAt;

  const gateway = new MutationGateway(
    context,
    configDirectory(context),
    "config",
  );
  await gateway.write(
    configFile(context),
    `${JSON.stringify(config, null, 2)}\n`,
    { role: "user-configuration", resource: "configuration" },
  );

  return commandResult(context, {
    command: "onboarding",
    summary: `Configuration for create-next-pro v${version} is ready.`,
    configRoot: configDirectory(context),
    homeRoot: context.homeDir,
    nextSteps: [
      {
        kind: "rerun",
        required: true,
        message: "Run the original create-next-pro command again.",
        paths: [],
      },
    ],
  });
}
