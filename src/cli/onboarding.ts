import path from "node:path";

import type { CliContext } from "../core/contracts";

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
    return JSON.parse(
      await context.fs.readText(configFile(context)),
    ) as UserConfig;
  } catch {
    return null;
  }
}

async function ensureLineInRc(
  context: CliContext,
  target: string,
  line: string,
): Promise<void> {
  try {
    const current = context.fs.exists(target)
      ? await context.fs.readText(target)
      : "";
    if (!current.includes(line))
      await context.fs.appendText(target, `\n${line}\n`);
  } catch {
    // Autocompletion is optional and must not make onboarding fail.
  }
}

async function installCompletion(
  context: CliContext,
  shell: UserConfig["shell"],
): Promise<void> {
  const directory = configDirectory(context);
  const source = path.join(
    context.packageRoot,
    "create-next-pro-completion.sh",
  );
  const target = path.join(directory, "completion.sh");
  await context.fs.mkdir(directory);
  await context.fs.copyFile(source, target);
  const rcFile = path.join(
    context.homeDir,
    shell === "zsh" ? ".zshrc" : ".bashrc",
  );
  await ensureLineInRc(context, rcFile, `source "${target}"`);
}

export async function onboarding(
  context: CliContext,
  version: string,
): Promise<UserConfig> {
  context.terminal.log(`🚀 Welcome to create-next-pro v${version}\n`);
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
    throw new Error("Configuration cancelled.");
  }

  const now = new Date().toISOString();
  const config: UserConfig = {
    version: 1,
    shell: response.shell,
    completionInstalled: Boolean(response.completion),
    createdAt: now,
    updatedAt: now,
  };
  if (config.completionInstalled)
    await installCompletion(context, config.shell);
  await context.fs.mkdir(configDirectory(context));
  await context.fs.writeText(
    configFile(context),
    JSON.stringify(config, null, 2),
  );

  context.terminal.log("\n✅ Configuration saved.");
  context.terminal.log("you can now use the CLI ! ex : ");
  context.terminal.log("  Without prompt (will change in future) :");
  context.terminal.log("    create-next-pro my-next-project");
  context.terminal.log("  With prompt :");
  context.terminal.log("    create-next-pro");
  context.terminal.log(
    "For more information, visit: https://github.com/Rising-Corporation/create-next-pro-cli",
  );
  context.terminal.log("Happy coding!  🎉");
  return config;
}
