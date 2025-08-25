// src/index.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import prompts from "prompts";
import { fileURLToPath } from "node:url";

import { addComponent } from "./lib/addComponent";
import { addPage } from "./lib/addPage";
import { rmPage } from "./lib/rmPage";
import { createProject } from "./lib/createProject";
import { createProjectWithPrompt } from "./lib/createProjectWithPrompt";

type Cfg = {
  version: 1;
  shell: "bash" | "zsh";
  completionInstalled: boolean;
  createdAt: string;
  updatedAt: string;
};

const CONFIG_DIR = process.env.XDG_CONFIG_HOME
  ? path.join(process.env.XDG_CONFIG_HOME, "create-next-pro")
  : path.join(os.homedir(), ".config", "create-next-pro");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function readCfg(): Cfg | null {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")) as Cfg;
  } catch {
    return null;
  }
}
function writeCfg(cfg: Cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}
function rcFile(shell: "bash" | "zsh") {
  return path.join(os.homedir(), shell === "zsh" ? ".zshrc" : ".bashrc");
}
function ensureLineInRc(file: string, line: string) {
  try {
    const cur = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (!cur.includes(line)) fs.appendFileSync(file, `\n${line}\n`);
  } catch {
    /* ignore */
  }
}
async function installCompletion(shell: "bash" | "zsh") {
  // Lit le script d’auto-complétion depuis le package (racine du package)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const completionSrc = path.resolve(
    __dirname,
    "../create-next-pro-completion.sh",
  );
  const completionDst = path.join(CONFIG_DIR, "completion.sh");
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.copyFileSync(completionSrc, completionDst);
  ensureLineInRc(rcFile(shell), `source "${completionDst}"`);
}
async function onboarding(): Promise<Cfg> {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
  );
  console.log(`🚀 Welcome to create-next-pro v${pkg.version}\n`);
  const res = await prompts(
    [
      {
        type: "select",
        name: "shell",
        message: "Which shell do you use?",
        choices: [
          { title: "zsh", value: "zsh" },
          { title: "bash", value: "bash" },
        ],
        initial: (os.userInfo().shell || "").includes("zsh") ? 0 : 1,
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
    { onCancel: () => process.exit(1) },
  );

  const cfg: Cfg = {
    version: 1,
    shell: res.shell,
    completionInstalled: !!res.completion,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (cfg.completionInstalled) await installCompletion(cfg.shell);
  writeCfg(cfg);
  console.log("\n✅ Configuration saved.");
  console.log("you can now use the CLI ! ex : create-next-pro <project-name>");
  console.log(
    "For more information, visit: https://github.com/Rising-Corporation/create-next-pro-cli",
  );
  console.log("Happy coding!  🎉");
  return cfg;
}
function showHelp() {
  console.log(`create-next-pro

Usage:
  create-next-pro <project-name> [--force]
  create-next-pro addpage [options]
  create-next-pro addcomponent [options]
  create-next-pro rmpage [options]

Options:
  --help          Show this help message
  --reconfigure   Run the configuration assistant again
`);
}

function showVersion() {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"),
  );
  console.log(`v${pkg.version}`);
}

/**
 * Main CLI entry point for create-next-pro.
 *
 * Note: For now, the project behaves as if --force is always enabled and no creation prompt is taken into account.
 * All actions are performed directly without confirmation.
 */
export async function main() {
  let args: string[];
  if (typeof Bun !== "undefined") {
    args = Bun.argv.slice(2);
  } else if (typeof process !== "undefined" && process.argv) {
    args = process.argv.slice(2);
  } else {
    args = [];
  }

  if (args.includes("--help")) return showHelp();
  if (args.includes("--version") || args.includes("-v")) return showVersion();
  if (args.includes("--reconfigure") || !readCfg()) {
    await onboarding();
    return;
  }

  const force = args.includes("--force");
  // For now, --force is always considered enabled but do not overwrite existing projects
  // WARNING: if you enable --force it will overwrite existing projects. This is a temporary setting for development purposes.
  // const force = true;

  // If addpage is called without options, add default flags -LPl
  if (args[0] === "addpage" && args.length === 1) {
    args.push("-LPl");
  }

  /**
   * Handle addcomponent command: create a component in the correct location and update translation JSON.
   */
  if (args[0] === "addcomponent") {
    addComponent(args);
    return;
  }

  /**
   * Handle addpage command: create a page (nested or not) and update translation JSON.
   */
  if (args[0] === "addpage") {
    addPage(args);
    return;
  }

  /**
   * Handle rmpage command: remove a page and all related files/folders.
   */
  if (args[0] === "rmpage") {
    rmPage(args);
    return;
  }

  /**
   * Handle direct project creation if a name argument is provided.
   */
  const nameArg = args.find((arg) => !arg.startsWith("--"));

  if (nameArg) {
    createProject(nameArg, force);
    return;
  }

  /**
   * Interactive prompt for project creation (not currently used, see note above).
   */
  await createProjectWithPrompt();
}
